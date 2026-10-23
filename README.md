# Mochi’s Little Sanctuary — GitHub Pages files

This is the complete static website in **one folder with no nested directories**. It needs no build step, backend, account, or external services. Sound starts off and only plays after it is turned on.

## Upload to GitHub Pages

1. Download and extract this ZIP on your computer. The extracted files (`index.html`, `sanctuary.css`, `app.js`, `messages.js`, and this README) are all together in one folder.
2. Create a GitHub repository. If you want the site to be public, make the repository public.
3. Open the repository, choose **Add file → Upload files**, and drag in the extracted files together. Do not upload the ZIP itself. Commit the upload to the `main` branch.
4. Open **Settings → Pages**. Under **Build and deployment**, select **Deploy from a branch**, then choose **main** and **/(root)**. Save.
5. Wait for GitHub Pages to finish publishing. The site URL appears on that Pages settings screen.

There is no GitHub Actions workflow to upload. All site files are in the repository root, and the links work at both `username.github.io` and project-repository URLs.

## Personalize the letters

Edit `messages.js` to change the four letters. Keep `index.html`, `sanctuary.css`, `app.js`, and `messages.js` together in the repository root so the site can load them.

## Privacy note

If the repository is public, the website files and letter text in `messages.js` are public too. The site does not track visitors and does not have a live connection to Nash.
