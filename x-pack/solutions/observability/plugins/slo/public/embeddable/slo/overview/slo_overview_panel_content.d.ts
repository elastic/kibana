import type { Filter } from '@kbn/es-query';
import React from 'react';
import type { Subject } from 'rxjs';
import type { GroupFilters, OverviewEmbeddableState } from '../../../../common/embeddables/overview/types';
export declare function hasSloGroupBy(groupBy: string[] | string | undefined): boolean;
export interface GroupOverviewPanelProps {
    groupFilters: GroupFilters;
    dashboardFilters?: Filter[];
    reloadSubject: Subject<boolean>;
}
export declare function GroupOverviewPanel({ groupFilters, dashboardFilters, reloadSubject, }: GroupOverviewPanelProps): React.JSX.Element;
export declare function SingleOverviewCardList({ sloId }: {
    sloId: string;
}): React.JSX.Element;
export interface SloOverviewPanelContentProps {
    sloId: string | undefined;
    sloInstanceId: string | undefined;
    overviewMode: OverviewEmbeddableState['overview_mode'] | undefined;
    groupFilters: GroupFilters | undefined;
    dashboardFilters?: Filter[];
    remoteName: string | undefined;
    reloadSubject: Subject<boolean>;
}
export declare function SloOverviewPanelContent({ sloId, sloInstanceId, overviewMode, groupFilters, dashboardFilters, remoteName, reloadSubject, }: SloOverviewPanelContentProps): React.JSX.Element;
