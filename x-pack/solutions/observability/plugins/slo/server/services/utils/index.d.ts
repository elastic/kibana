export { getSloApmLabels } from './get_slo_apm_labels';
import type { Groupings } from '../../domain/models';
/**
 * Takes a list of groupBy fields and the nested groupings object provided from
 * ES search results and returns a flatted object with the `groupBy` fields as keys
 * @param groupBy an array of groupBy fields
 * @param groupings a nested object of groupings
 * @returns a flattened object of groupings
 */
export declare const getFlattenedGroupings: ({ groupBy, groupings, }: {
    groupBy: string[] | string;
    groupings: Record<string, unknown>;
}) => Groupings;
