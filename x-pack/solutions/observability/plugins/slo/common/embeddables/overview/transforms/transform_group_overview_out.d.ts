import type { Filter } from '@kbn/es-query';
import type { OverviewEmbeddableState } from '../../../../server/lib/embeddables/schema';
export interface LegacyGroupOverviewState {
    overviewMode: 'groups';
    groupFilters: {
        groupBy: 'slo.tags' | 'status' | 'slo.indicator.type';
        groups?: string[];
        filters?: Filter[];
        kqlQuery?: string;
    };
}
/**
 * Converts pre 9.4 group overview camelCase state to snake_case state.
 */
export declare function transformGroupOverviewOut(storedState: OverviewEmbeddableState): OverviewEmbeddableState;
