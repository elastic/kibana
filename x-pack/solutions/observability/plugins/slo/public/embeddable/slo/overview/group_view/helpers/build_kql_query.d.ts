import type { GroupByField } from '../../../../../pages/slos/types';
interface Props {
    kqlQuery: string;
    groups: string[];
    groupBy: GroupByField;
}
export declare const buildCombinedKqlQuery: ({ groups, groupBy, kqlQuery }: Props) => string;
export {};
