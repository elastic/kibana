import type { Filter } from '@kbn/es-query';
import type { GroupSummary } from '@kbn/slo-schema';
import React from 'react';
import type { GroupByField, SortDirection, SortField, ViewType } from '../../types';
interface Props {
    group: string;
    kqlQuery?: string;
    view: ViewType;
    sort?: SortField;
    direction?: SortDirection;
    groupBy: GroupByField;
    summary?: GroupSummary;
    filters?: Filter[];
}
export declare function GroupListView({ group, kqlQuery, view, sort, direction, groupBy, summary, filters, }: Props): React.JSX.Element;
export {};
