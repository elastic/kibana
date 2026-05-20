export declare class SLOError extends Error {
    constructor(message?: string);
}
export declare class SLONotFound extends SLOError {
}
export declare class SLOIdConflict extends SLOError {
}
export declare class SLOTemplateNotFound extends SLOError {
}
export declare class InternalQueryError extends SLOError {
}
export declare class IllegalArgumentError extends SLOError {
}
export declare class InvalidTransformError extends SLOError {
}
export declare class SecurityException extends SLOError {
}
