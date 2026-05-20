import type { Filter } from '@kbn/es-query';
import React from 'react';
import type { Subject } from 'rxjs';
import type { ViewType, GroupByField, SortField } from '../../../../pages/slos/types';
interface Props {
    groupBy: GroupByField;
    groups?: string[];
    kqlQuery?: string;
    view: ViewType;
    sort?: SortField;
    filters?: Filter[];
    reloadSubject: Subject<boolean>;
}
export declare function GroupSloView({ view, groupBy, groups, kqlQuery, filters, reloadSubject, }: Props): React.JSX.Element;
export {};
