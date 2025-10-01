import { MileAPI } from "@milejs/api";

const options = {
  s3: { filePrefix: "test-prefix" },
};

const httpHandler = MileAPI(options);

const GET = httpHandler;
const POST = httpHandler;
const PATCH = httpHandler;
const PUT = httpHandler;

export { GET, POST, PUT, PATCH };
