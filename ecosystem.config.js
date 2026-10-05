module.exports = {
  apps: [
    {
      name: "timetable-backend",
      script: "server.js",
      cwd: "./backend",
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "timetable-frontend",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      cwd: "./frontend",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
