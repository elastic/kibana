export declare function usePermissions(): {
    isLoading: boolean;
    data: {
        capabilities: {
            read: boolean;
            write: boolean;
        };
        privileges: {
            read: boolean;
            write: boolean;
        };
        hasAllReadRequested: boolean;
        hasAllWriteRequested: boolean;
    } | undefined;
};
