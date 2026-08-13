# Goal Forge

A local-first monthly goal and habit tracker rebuilt from the supplied video reference.

**Live app:** [goal-forge-royalcyberops.netlify.app](https://goal-forge-royalcyberops.netlify.app)

## Run

Open `index.html` directly, or serve this folder with any static web server. For example:

```powershell
python -m http.server 4173
```

Then open `http://localhost:4173`.

## Included

- Detailed habit planning with purpose, minimum action, proof, preferred time, repeat days, and linked goals
- Measurable goal management with deadlines, progress logging, and next-action prompts
- A daily focus queue that turns active goals into three small, proof-producing actions
- Schedule-aware monthly habit matrix with visible rest days
- Live daily and weekly charts
- Possible, completed, remaining, and percentage stats based on each habit's schedule
- Per-habit analysis and top-habit ranking
- Current streaks and XP/level feedback
- Mood and sleep logs
- Month/year switching
- Browser-local persistence and JSON backup export
- In-place migration for data saved by the original Goal Forge version
- Responsive mobile navigation and horizontal tracker scrolling

No account, server, external library, or API key is required.

## Deployment

The project is configured for Netlify through `netlify.toml`. The publish directory is the repository root and no build command is required.
