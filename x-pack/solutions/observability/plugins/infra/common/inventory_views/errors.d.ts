export declare class FetchInventoryViewError extends Error {
    cause?: Error | undefined;
    constructor(message: string, cause?: Error | undefined);
}
export declare class UpsertInventoryViewError extends Error {
    cause?: Error | undefined;
    constructor(message: string, cause?: Error | undefined);
}
export declare class DeleteInventoryViewError extends Error {
    cause?: Error | undefined;
    constructor(message: string, cause?: Error | undefined);
}
