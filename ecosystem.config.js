module.exports = {
  apps: [{
    name: "time_tracker",
    script: "node_modules/next/dist/bin/next",
    args: "start -p 6069",
    interpreter: "node",
    watch: false,
    instances: 1,
    exec_mode: "fork",  
    autorestart: true,
    max_memory_restart: "1G",
    env: {
      NODE_ENV: "production",
    }
  }]
}