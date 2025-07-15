# We All Explain Socket Server

Backend WebSocket server for the We All Explain collaborative mapping application.

## Deployment

This server is designed to be deployed on Render.com

### Environment Variables

Required:
- `MONGODB_URI` - MongoDB connection string
- `CLIENT_URL` - Frontend URL (comma-separated for multiple origins)
- `ADMIN_SUBDOMAIN` - Admin subdomain name

Optional:
- `PORT` - Server port (default: 10000)
- `MAX_CONNECTIONS` - Maximum WebSocket connections (default: 25)

### Files

- `websocket-server.js` - Main server file
- `server/models/Activity.js` - MongoDB schema for activities
- `server/routes/activities.js` - API routes for activities
- `package.json` - Dependencies

### Development

```bash
npm install
npm start
```

### Syncing from Development

This server is synced from the main `we-all-explain` project using the `sync-server-weallexplain.js` script.

To update:
1. Make changes in `we-all-explain/server/`
2. Run `node sync-server-weallexplain.js`
3. Commit and push changes to trigger deployment