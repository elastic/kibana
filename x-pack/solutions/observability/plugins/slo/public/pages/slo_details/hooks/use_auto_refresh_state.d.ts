export declare function useAutoRefreshState(initialValue?: boolean): readonly [boolean, (value: boolean | ((val: boolean) => boolean)) => void];
