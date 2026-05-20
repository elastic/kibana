import type { GroupSummary } from '@kbn/slo-schema';
import type { GroupByField } from '../../../types';
export declare function useGroupName(groupBy: GroupByField, group: string, summary?: GroupSummary): string;
