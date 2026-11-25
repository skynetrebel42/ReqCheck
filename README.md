# ReqCheck

ReqCheck is a student-built UC Irvine course planning prototype. Search the catalog, explore prerequisite maps, check class sections and advising contacts, and organize courses in Planner or Saved. The welcome page has a quick tour and an optional interactive tutorial.

## Run locally

Use Node.js 22.13 or later in the 22.x series and npm. From the folder containing `vercel.json`, install dependencies:

```powershell
npm ci --prefix backend
npm ci --prefix frontend
```

Start the backend in one terminal:

```powershell
npm start --prefix backend
```

Start the frontend in another terminal:

```powershell
npm run dev --prefix frontend
```

Open [http://localhost:5173/](http://localhost:5173/) with both terminals running.

## Publish a demo

The repository includes the application and API configuration for Vercel. Push the source to GitHub, then import that repository into Vercel. Leave the project root at the repository root so Vercel can find both `vercel.json` and the API entry point. Use Node.js 22.x.

The catalog database is included. Live sections use Anteater API. If you have an Anteater API key, set `ANTEATER_API_KEY` as a server-side environment variable in Vercel. Keep keys out of Git.

After deployment, open the welcome page, search for COMPSCI 161, and expand Class sections. This checks the page and the live API before you share the demo URL.

## Data and credits

ReqCheck builds on [AntIEligible](https://github.com/Orbit274/AntIEligible), the original class group project. See [LICENSE](LICENSE) for its MIT license and original copyright notice.

Course and section data come from [Anteater API](https://icssc.link/about-anteaterapi), maintained by the UCI ICS Student Council. Use ReqCheck’s Sources tab to verify prerequisites and schedules with the UCI General Catalogue and WebSoc. ReqCheck is a student project. Enrollment and course credit decisions belong to UCI.

Profiles, imported course records, saved courses, and plans are stored in the browser that created them. The pasted transcript text is processed in that browser. The project archive carries the software and public catalog data.
