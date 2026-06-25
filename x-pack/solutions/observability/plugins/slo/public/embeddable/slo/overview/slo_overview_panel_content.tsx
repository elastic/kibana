/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseEuiTheme } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';
import type { Filter } from '@kbn/es-query';
import { ALL_VALUE } from '@kbn/slo-schema';
import { toStoredFilters } from '@kbn/as-code-filters-transforms';
import React from 'react';
import type { Subject } from 'rxjs';
import { useFetchSloDetails } from '../../../hooks/use_fetch_slo_details';
import { GroupSloView } from './group_view/group_view';
import { SloOverview } from './slo_overview';
import { SloCardChartList } from './slo_overview_grid';
import type {
  GroupFilters,
  OverviewEmbeddableState,
} from '../../../../common/embeddables/overview/types';

export function hasSloGroupBy(groupBy: string[] | string | undefined): boolean {
  if (groupBy == null) return false;
  const flat = [groupBy].flat();
  return flat.length > 0 && !flat.includes(ALL_VALUE);
}

export interface GroupOverviewPanelProps {
  groupFilters: GroupFilters;
  dashboardFilters?: Filter[];
  reloadSubject: Subject<boolean>;
}

export function GroupOverviewPanel({
  groupFilters,
  dashboardFilters = [],
  reloadSubject,
}: GroupOverviewPanelProps) {
  return (
    <div
      css={({ euiTheme }: UseEuiTheme) => css`
        width: 100%;
        padding: ${euiTheme.size.xs} ${euiTheme.size.base};
        overflow: scroll;

        .euiAccordion__buttonContent {
          min-width: ${euiTheme.base * 6}px;
        }
      `}
    >
      <EuiFlexGroup data-test-subj="sloGroupOverviewPanel" data-shared-item="">
        <EuiFlexItem
          css={({ euiTheme }: UseEuiTheme) => css`
            margin-top: ${euiTheme.base * 1.25}px;
          `}
        >
          <GroupSloView
            view="cardView"
            groupBy={groupFilters.group_by}
            groups={groupFilters.groups ?? []}
            kqlQuery={groupFilters.kql_query ?? ''}
            filters={[...(toStoredFilters(groupFilters.filters) ?? []), ...dashboardFilters]}
            reloadSubject={reloadSubject}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
}

export function SingleOverviewCardList({ sloId }: { sloId: string }) {
  return (
    <div data-test-subj="sloSingleOverviewPanel" data-shared-item="" style={{ width: '100%' }}>
      <SloCardChartList data-test-subj="sloSingleOverviewPanel" sloId={sloId} />
    </div>
  );
}

export interface SloOverviewPanelContentProps {
  sloId: string | undefined;
  sloInstanceId: string | undefined;
  overviewMode: OverviewEmbeddableState['overview_mode'] | undefined;
  groupFilters: GroupFilters | undefined;
  dashboardFilters?: Filter[];
  remoteName: string | undefined;
  reloadSubject: Subject<boolean>;
}

export function SloOverviewPanelContent({
  sloId,
  sloInstanceId,
  overviewMode,
  groupFilters,
  dashboardFilters,
  remoteName,
  reloadSubject,
}: SloOverviewPanelContentProps) {
  const { data: sloDetails } = useFetchSloDetails({
    sloId: sloId ?? undefined,
    instanceId: ALL_VALUE,
  });
  const hasGroupBy = sloDetails ? hasSloGroupBy(sloDetails.groupBy) : false;
  const showCardList =
    overviewMode === 'single' && sloInstanceId === ALL_VALUE && hasGroupBy && Boolean(sloId);

  if (overviewMode === 'groups') {
    return (
      <GroupOverviewPanel
        groupFilters={groupFilters!}
        dashboardFilters={dashboardFilters}
        reloadSubject={reloadSubject}
      />
    );
  }
  if (showCardList && sloId) {
    return <SingleOverviewCardList sloId={sloId} />;
  }
  return (
    <SloOverview
      sloId={sloId!}
      sloInstanceId={sloInstanceId}
      reloadSubject={reloadSubject}
      remoteName={remoteName}
    />
  );
}
