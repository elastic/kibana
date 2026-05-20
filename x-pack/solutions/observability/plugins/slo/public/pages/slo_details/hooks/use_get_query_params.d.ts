export declare const INSTANCE_SEARCH_PARAM = "instanceId";
export declare const REMOTE_NAME_PARAM = "remoteName";
export declare const DELETE_SLO = "delete";
export declare const RESET_SLO = "reset";
export declare const ENABLE_SLO = "enable";
export declare const DISABLE_SLO = "disable";
export declare function useGetQueryParams(): {
    instanceId: string | undefined;
    remoteName: string | undefined;
    isDeletingSlo: boolean;
    removeDeleteQueryParam: () => void;
    isResettingSlo: boolean;
    removeResetQueryParam: () => void;
    isEnablingSlo: boolean;
    removeEnableQueryParam: () => void;
    isDisablingSlo: boolean;
    removeDisableQueryParam: () => void;
};
