import { Server } from "http";
import config from "./config";
import cron from "node-cron";

import app from "./app";
import { MeetingRequestService } from "./app/modules/MeetingRequest/MeetingRequest.service";

let server: Server;

async function startServer() {
  // Run every minute
  cron.schedule("* * * * *", async () => {
    try {
      await MeetingRequestService.autoReleaseUnusedBookings();
      console.log("Auto-release job ran successfully:", new Date());
    } catch (err) {
      console.error("Error running auto-release job:", err);
    }
  });

  server = app.listen(config.port, () => {
    console.log("Server is listiening on port ", config.port);
  });
}

async function main() {
  await startServer();
  const exitHandler = () => {
    if (server) {
      server.close(() => {
        console.info("Server closed!");
      });
    } else {
      process.exit(1);
    }
  };

  process.on("uncaughtException", (error) => {
    console.log("Uncaught Exception: ", error);
    exitHandler();
  });

  process.on("unhandledRejection", (error) => {
    console.log("Unhandled Rejection: ", error);
    exitHandler();
  });

  // Handling the server shutdown with SIGTERM and SIGINT
  // process.on("SIGTERM", () => {
  //   console.log("SIGTERM signal received. Shutting down gracefully...");
  //   exitHandler();
  // });

  // process.on("SIGINT", () => {
  //   console.log("SIGINT signal received. Shutting down gracefully...");
  //   exitHandler();
  // });
}

main();
