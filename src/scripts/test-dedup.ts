import "dotenv/config";
import {deduplicateErrorLog} from "@/src/lib/deduplicate-logs"

async function testDeduplication() {
    const testErrors = [
        {
            projectId: "cmup2qpm30001rcy6q2bvon34",
            serviceName: "service-1",
            message: "Database timeout error",
            stackTrace: "Database connection pool timeout on checkout"
        },
        {
            projectId: "cmup2qpm30001rcy6q2bvon34",
            serviceName: "service-2",
            message: "Prisma connection timeout",
            stackTrace: "Prisma connection timeout after 5000ms on checkout"
        },
        {
            projectId: "cmup2qpm30001rcy6q2bvon34",
            serviceName: "service-3",
            message: "Null pointer exception",
            stackTrace: "Null pointer exception in auth token verification"
        }
    ];

    for (const error of testErrors) {
        try {
            const result = await deduplicateErrorLog(error);
            console.log(`Deduplication result for ${error.message}:`, result);
        } catch (err) {
            console.error(`Error processing ${error.message}:`, err);
        }
    }
}

testDeduplication().then(() => {
    console.log("Deduplication test completed.");
})
.catch((err) => {
    console.error("Error during deduplication test:", err);
})