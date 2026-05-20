import type { Filter } from '@kbn/es-query';
import React from 'react';
import type { ViewType, GroupByField, SortDirection, SortField } from '../../types';
interface Props {
    groupBy: GroupByField;
    kqlQuery?: string;
    view: ViewType;
    sort?: SortField;
    direction?: SortDirection;
    filters?: Filter[];
    lastRefreshTime?: number;
    groupsFilter?: string[];
}
export declare function GroupView({ kqlQuery, view, sort, direction, groupBy, groupsFilter, filters, lastRefreshTime, }: Props): React.JSX.Element;
export {};
