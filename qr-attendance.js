const initialRender=render;
let cameraStream=null,scanFrameId=null,qrIssuedAt=new Date();

const cp1252={0x20ac:0x80,0x201a:0x82,0x192:0x83,0x201e:0x84,0x2026:0x85,0x2020:0x86,0x2021:0x87,0x2c6:0x88,0x2030:0x89,0x160:0x8a,0x2039:0x8b,0x152:0x8c,0x17d:0x8e,0x2018:0x91,0x2019:0x92,0x201c:0x93,0x201d:0x94,0x2022:0x95,0x2013:0x96,0x2014:0x97,0x2dc:0x98,0x2122:0x99,0x161:0x9a,0x203a:0x9b,0x153:0x9c,0x17e:0x9e,0x178:0x9f};

function fixMojibake(text){
  if(!/[\u00c2\u00e2]/.test(text))return text;
  try{
    const bytes=Array.from(text,char=>{const cp=char.codePointAt(0);if(cp<0x80)return cp;if(cp<=0xff)return cp;return cp1252[cp]??-1});
    if(bytes.includes(-1))return text;
    return new TextDecoder('utf-8',{fatal:true}).decode(new Uint8Array(bytes));
  }catch{return text}
}

function repairText(root=document.body){
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  let node;
  while((node=walker.nextNode())){
    const repaired=fixMojibake(node.textContent);
    if(repaired!==node.textContent)node.textContent=repaired;
  }
}

new MutationObserver(records=>records.forEach(record=>{
  if(record.type==='characterData'){
    const repaired=fixMojibake(record.target.textContent);
    if(repaired!==record.target.textContent)record.target.textContent=repaired;
  }
  record.addedNodes?.forEach(node=>{
    if(node.nodeType===Node.TEXT_NODE){
      const repaired=fixMojibake(node.textContent);
      if(repaired!==node.textContent)node.textContent=repaired;
    }else if(node.nodeType===Node.ELEMENT_NODE)repairText(node);
  });
})).observe(document.body,{subtree:true,childList:true,characterData:true});

function studentQrPayload(){
  return JSON.stringify({type:'campuspass-attendance',version:1,studentId:'S2024-00123',studentName:'Juan Dela Cruz',className:'BSIT-3A',issuedAt:qrIssuedAt.toISOString()});
}

function drawQr(target,payload,width){
  const container=$(target);
  if(!container)return;
  container.replaceChildren();
  if(typeof window.QRCode!=='function'){container.textContent='QR generator unavailable. Check your internet connection and reload.';return}
  try{
    new QRCode(container,{text:payload,width,height:width,colorDark:'#000000',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M});
  }catch(error){container.textContent='Unable to generate QR code.';console.error(error)}
}

function renderQrs(){
  drawQr('landingQr',studentQrPayload(),180);
  drawQr('studentQr',studentQrPayload(),320);
  const date=$('qrIssuedDate');
  if(date)date.textContent=qrIssuedAt.toLocaleString();
}

qrPage=function(){return `<div class="page">${header('Student tools','My QR code','Present this QR code when attendance is being recorded.','Back to dashboard','dashboard')}<div class="card qr-layout"><div><div class="qr-large" id="studentQr" aria-label="Personal attendance QR code"></div><p style="text-align:center" class="muted">Personal QR pass &middot; Refresh to generate a new code</p></div><div class="qr-meta"><div class="profile"><div class="avatar">JD</div><div><strong>Juan Dela Cruz</strong><small>S2024-00123 &middot; BSIT-3A</small></div></div><div class="meta-row"><span>Status</span><strong class="green">Active</strong></div><div class="meta-row"><span>Date generated</span><strong id="qrIssuedDate"></strong></div><div class="actions"><button class="btn" data-action="refresh">Refresh QR Code</button><button class="btn secondary" data-action="download">Download QR Code</button><button class="btn secondary" data-action="print">Print QR Code</button></div></div></div></div>`};

recordPage=function(){return `<div class="page">${header('Teacher tools','Record attendance','Scan a student QR code or update the class list manually.')}<div class="grid columns"><div class="card"><h2>Class session</h2><div class="grid" style="grid-template-columns:1fr 1fr"><div class="field"><label>Class</label><select><option>BSIT-3A</option><option>BSIT-3B</option></select></div><div class="field"><label>Subject</label><select><option>Web Development</option><option>Database Systems</option></select></div><div class="field"><label>Date</label><input type="date" value="2026-09-25"></div><div class="field"><label>Time</label><input type="time" value="08:00"></div></div><div class="scan-zone" style="margin-top:20px"><h3>Scan student QR code</h3><p class="muted">Use the camera, upload a QR image, or enter the student ID.</p><video id="scannerVideo" class="scanner-video hidden" playsinline muted></video><div class="actions"><button class="btn" data-action="camera">Start camera</button><button class="btn secondary hidden" data-action="stop-camera">Stop camera</button></div><div class="scanner-controls"><div class="field"><label for="qrImage">Scan an image</label><input id="qrImage" type="file" accept="image/*"></div><div class="field"><label for="manualStudentId">Student ID</label><input id="manualStudentId" placeholder="S2024-00123"><button class="btn small" data-action="manual-scan" style="margin-top:8px">Record attendance</button></div></div><p id="scannerMessage" class="muted" role="status"></p></div><div id="scanConfirmation"></div></div><div class="card"><h2>Student list <small class="muted">&middot; 42 students</small></h2><div class="list">${roster.map((s,i)=>`<div class="student-row"><div><strong>${s[1]}</strong><small>${s[0]}</small></div><div class="segmented" data-student="${i}"><button class="${s[2]==='Present'?'selected':''}" data-status="Present">Present</button><button class="${s[2]==='Absent'?'selected':''}" data-status="Absent">Absent</button><button class="${s[2]==='Late'?'selected':''}" data-status="Late">Late</button><button class="${s[2]==='Excused'?'selected':''}" data-status="Excused">Excused</button></div></div>`).join('')}</div></div></div></div>`};

function stopCamera(){
  if(scanFrameId)clearTimeout(scanFrameId);
  scanFrameId=null;
  if(cameraStream)cameraStream.getTracks().forEach(track=>track.stop());
  cameraStream=null;
  const video=$('scannerVideo');
  if(video){video.srcObject=null;video.classList.add('hidden')}
  document.querySelector('[data-action="camera"]')?.classList.remove('hidden');
  document.querySelector('[data-action="stop-camera"]')?.classList.add('hidden');
}

function recordScannedValue(value){
  let id=String(value||'').trim();
  try{const payload=JSON.parse(id);id=payload.studentId||id}catch{}
  const student=roster.find(item=>item[0].toLowerCase()===id.toLowerCase());
  if(!student){$('scannerMessage').textContent='QR code not recognized. Use a valid CampusPass student QR code or ID.';return false}
  student[2]='Present';
  $('scanConfirmation').innerHTML=`<div class="card" style="margin-top:18px;background:#effaf5;border-color:#a7e2cb"><strong class="green">Attendance recorded</strong><p style="margin:5px 0 0">${student[1]} &middot; ${student[0]} &middot; Present at ${new Date().toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}</p></div>`;
  $('scannerMessage').textContent='';
  showToast(`Attendance recorded for ${student[1]}.`);
  stopCamera();
  return true;
}

async function startCamera(){
  const video=$('scannerVideo');
  if(typeof window.jsQR!=='function'){$('scannerMessage').textContent='QR scanner unavailable. Check your internet connection or enter the student ID.';return}
  if(!navigator.mediaDevices?.getUserMedia){$('scannerMessage').textContent='Camera access is unavailable here. Open this page on localhost or upload a QR image.';return}
  try{
    cameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false});
    video.srcObject=cameraStream;
    video.classList.remove('hidden');
    await video.play();
    document.querySelector('[data-action="camera"]').classList.add('hidden');
    document.querySelector('[data-action="stop-camera"]').classList.remove('hidden');
    $('scannerMessage').textContent='Point the camera at a student QR code.';
    const scan=()=>{
      if(!cameraStream)return;
      try{
        if(video.readyState>=2&&video.videoWidth){
          const canvas=document.createElement('canvas');
          canvas.width=video.videoWidth;
          canvas.height=video.videoHeight;
          const context=canvas.getContext('2d',{willReadFrequently:true});
          context.drawImage(video,0,0,canvas.width,canvas.height);
          const image=context.getImageData(0,0,canvas.width,canvas.height);
          const result=window.jsQR(image.data,image.width,image.height,{inversionAttempts:'attemptBoth'});
          if(result&&recordScannedValue(result.data))return;
        }
      }catch(error){console.error(error)}
      scanFrameId=setTimeout(scan,140);
    };
    scan();
  }catch(error){
    stopCamera();
    $('scannerMessage').textContent=error.name==='NotAllowedError'?'Camera permission was denied. Allow camera access or upload a QR image.':'Could not start the camera. Try uploading a QR image or entering the student ID.';
  }
}

const originalBindActions=bindActions;
bindActions=function(){
  originalBindActions();
  document.querySelectorAll('[data-action="camera"]').forEach(button=>button.onclick=startCamera);
  document.querySelectorAll('[data-action="stop-camera"]').forEach(button=>button.onclick=stopCamera);
  document.querySelectorAll('[data-action="manual-scan"]').forEach(button=>button.onclick=()=>recordScannedValue($('manualStudentId').value));
  const image=$('qrImage');
  if(image)image.onchange=async()=>{
    const file=image.files?.[0];
    if(!file)return;
    if(typeof window.jsQR!=='function'){$('scannerMessage').textContent='Image QR scanning is unavailable. Enter the student ID instead.';return}
    try{
      const bitmap=await createImageBitmap(file),canvas=document.createElement('canvas');
      canvas.width=bitmap.width;canvas.height=bitmap.height;
      const context=canvas.getContext('2d',{willReadFrequently:true});
      context.drawImage(bitmap,0,0);bitmap.close();
      const imageData=context.getImageData(0,0,canvas.width,canvas.height),result=window.jsQR(imageData.data,imageData.width,imageData.height,{inversionAttempts:'attemptBoth'});
      if(!result)$('scannerMessage').textContent='No QR code found in that image.';
      else recordScannedValue(result.data);
    }catch(error){$('scannerMessage').textContent='Could not read that image. Try another image or enter the student ID.'}
  };
  document.querySelectorAll('[data-action="refresh"]').forEach(button=>button.onclick=()=>{qrIssuedAt=new Date();renderQrs();showToast('A new QR code has been generated.')});
  document.querySelectorAll('[data-action="download"]').forEach(button=>button.onclick=()=>{
    const target=$('studentQr');
    if(!target?.querySelector('canvas')){showToast('QR code is not ready yet.');return}
    const link=document.createElement('a');link.download='campuspass-S2024-00123.png';link.href=target.querySelector('canvas').toDataURL('image/png');link.click();
  });
};

render=function(){stopCamera();initialRender();repairText();renderQrs()};
repairText();
renderQrs();

const style=document.createElement('style');
style.textContent='.qr-large,.qr-mini{display:block;background:#fff;padding:12px;border-radius:12px}.qr-large{width:min(330px,100%);aspect-ratio:1;margin:auto}.qr-mini{width:100%;aspect-ratio:1}.qr-large canvas,.qr-large img,.qr-mini canvas,.qr-mini img{display:block;width:100%!important;height:100%!important;object-fit:contain}.scanner-video{display:block;width:100%;max-height:320px;aspect-ratio:4/3;object-fit:cover;background:#102238;border-radius:10px;margin:12px 0}.scanner-controls{display:grid;gap:12px;margin-top:14px}.scanner-controls .field{max-width:420px}';
document.head.append(style);