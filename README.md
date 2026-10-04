# Discord Anti-Raid Bot

A Discord anti-raid bot starter project with:
- anti-raid protection
- verification system
- welcome / leave logging
- moderation tools
- Google account login for the admin dashboard
- GitHub Pages deployment ready

## Live demo

GitHub Pages URL (after deployment):
https://robloxcsdfh705-cloud.github.io/discord-anti-raid-bot/

## Features

- Google account login required
- Dashboard with server overview
- Anti-raid rule toggles
- Verification requirement settings
- Welcome and leave automation
- Moderation commands and warning logs
- Bot starter code for Discord.js

## Project structure

- `index.html` — GitHub Pages landing page / admin dashboard
- `styles.css` — responsive custom styles
- `app.js` — Google Sign-In and dashboard UI logic
- `bot/discord-bot.js` — Discord bot starter
- `bot/package.json` — Node.js bot dependencies
- `bot/.env.example` — environment example

## Google login setup

1. Go to Google Cloud Console.
2. Create an OAuth 2.0 Client ID.
3. Add your GitHub Pages URL as an authorized JavaScript origin.
4. Replace `YOUR_GOOGLE_CLIENT_ID` in `index.html` with your real client ID.

Example:
```
YOUR_GOOGLE_CLIENT_ID
```

## GitHub Pages deployment

1. Push these files to your GitHub repository.
2. Open repository settings.
3. Go to Pages.
4. Set source to `Deploy from a branch`.
5. Select branch `main` and root folder `/`.
6. Save.

## Discord bot setup

1. Open `bot/.env.example`.
2. Copy to `.env`.
3. Fill in `DISCORD_TOKEN`.
4. Install dependencies:

```bash
cd bot
npm install
```

5. Start the bot:

```bash
npm start
```

## Suggested anti-raid rules

- max joins in 1 minute
- suspicious link blocking
- verification required for new members
- auto-kick on failed verification
- scan for mass mentions
- log all moderation actions

## Notes

This project is designed as a starter foundation. For production use, add:
- secure backend for admin authentication
- real database storage
- role-based access control
- audit logging
- Discord slash command registration
- server-side rate limiting

## License

MIT
