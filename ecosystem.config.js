module.exports = {
  apps: [{
    name: "time_tracker",
    script: "node_modules/next/dist/bin/next",
    args: "start -p 6069",
    interpreter: "node",
    watch: false,
    instances: 1,          // ✅ only 1 instance
    exec_mode: "fork",     // ✅ fork not cluster
    autorestart: true,
    max_memory_restart: "1G",
    env: {
      NODE_ENV: "production",
    }
  }]
}