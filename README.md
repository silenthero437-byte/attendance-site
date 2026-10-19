# CampusPass QR Attendance

CampusPass is a static attendance-system demo. The interface and sample records are for demonstration only; sign-in is not authenticated, and attendance changes are not saved or shared between visitors. Do not use it to collect or manage real student information.

## Share the site

After GitHub Pages has deployed the `main` branch, open and share:

<https://silenthero437-byte.github.io/attendance-site/>

To share it in Google Classroom, add that URL to a material or assignment. Anyone with the link can open the public site.

## Deployment

The GitHub Actions workflow in `.github/workflows/deploy-pages.yml` publishes the static site when changes are pushed to `main` and can also be run manually. In the repository's **Settings → Pages**, set **Build and deployment → Source** to **GitHub Actions**. The first deployment may take a few minutes; the workflow run will show whether it succeeded.
