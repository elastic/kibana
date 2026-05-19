import type { Space } from '@kbn/spaces-plugin/common';
export declare const useKibanaSpace: () => {
    space: Space | undefined;
    loading: boolean | undefined;
    error: Error | undefined;
};
