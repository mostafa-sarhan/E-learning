// PM2 config. Single instance (fork mode): WhatsApp client and in-memory rate limits
// must not be duplicated across processes.
module.exports = {
  apps: [
    {
      name: "academy-api",
      script: "dist/server.js",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      env: { NODE_ENV: "production" },
      max_memory_restart: "1G",
      kill_timeout: 10000,
      time: true,
    },
  ],
};
