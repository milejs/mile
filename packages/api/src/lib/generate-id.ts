import { customAlphabet } from "nanoid";

const nanoid = customAlphabet("0123456789abcdef", 32);

export function generateId(): string {
  // let myuuid = crypto.randomUUID();
  return nanoid();
}
