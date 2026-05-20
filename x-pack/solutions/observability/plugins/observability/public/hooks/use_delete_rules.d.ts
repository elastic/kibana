import type { KueryNode } from '@kbn/es-query';
export declare function useDeleteRules(): import("@kbn/react-query").UseMutationResult<string, string, {
    ids: string[];
    filter?: KueryNode | null | undefined;
}, unknown>;
