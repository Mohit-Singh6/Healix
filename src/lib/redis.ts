import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redisClient: Redis | undefined;
};

function createRedisConnection(): Redis {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("Missing REDIS_URL environment variable.");
  }

  const client = new Redis(url, {
    // REQUIRED by BullMQ: Disables ioredis command retry loop so BullMQ handles backoff
    maxRetriesPerRequest: null,
    // Prevents hanging connection loops if Redis is unreachable
    enableReadyCheck: false,
    retryStrategy(times) {
      // Exponential reconnection delay capped at 2 seconds
      return Math.min(times * 100, 2000);
    },
  });

  client.on("connect", () => {
    console.log("Connected to Redis Cloud successfully.");
  });

  client.on("error", (err) => {
    console.error("Redis connection error:", err.message);
  });

  return client;
}

export const redisConnection =
  globalForRedis.redisClient ?? createRedisConnection();

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redisClient = redisConnection;
}