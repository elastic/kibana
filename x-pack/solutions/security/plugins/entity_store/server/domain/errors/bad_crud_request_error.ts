export class BadCRUDRequestError extends Error {
  constructor(id: string, reason: string) {
    super(`Error for Entity ID '${id}': ${reason}`);
  }
}