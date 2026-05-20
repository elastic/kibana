import type { OverviewEmbeddableState } from '../../../../server/lib/embeddables/schema';
export interface LegacySingleOverviewState {
    sloId: string;
    sloInstanceId?: string;
    remoteName?: string;
    overviewMode: 'single';
    showAllGroupByInstances?: boolean;
}
/**
 * Converts pre 9.4 single overview camelCase state to snake_case state.
 */
export declare function transformSingleOverviewOut(storedState: OverviewEmbeddableState): OverviewEmbeddableState;
