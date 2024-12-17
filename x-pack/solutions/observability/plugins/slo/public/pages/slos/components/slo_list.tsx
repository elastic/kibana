/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { usePerformanceContext } from '@kbn/ebt-tools';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { useIsMutating } from '@tanstack/react-query';
import dedent from 'dedent';
import { groupBy as _groupBy, mapValues } from 'lodash';
import React, { useEffect } from 'react';
import { useFetchSloList } from '../../../hooks/use_fetch_slo_list';
import { useKibana } from '../../../hooks/use_kibana';
import { useUrlSearchState } from '../hooks/use_url_search_state';
import { GroupView } from './grouped_slos/group_view';
import { ToggleSLOView } from './toggle_slo_view';
import { UngroupedView } from './ungrouped_slos/ungrouped_view';

export function SloList() {
  const { onPageReady } = usePerformanceContext();
  const { observabilityAIAssistant } = useKibana().services;
  const { state, onStateChange } = useUrlSearchState();
  const { view, page, perPage, kqlQuery, filters, tagsFilter, statusFilter, groupBy } = state;

  const {
    isLoading,
    isRefetching,
    isError,
    data: sloList,
  } = useFetchSloList({
    tagsFilter,
    statusFilter,
    perPage,
    filters,
    page: page + 1,
    kqlQuery,
    sortBy: state.sort.by,
    sortDirection: state.sort.direction,
    lastRefresh: state.lastRefresh,
  });

  const isDeletingSlo = Boolean(useIsMutating(['deleteSlo']));

  useEffect(() => {
    if (!sloList || !observabilityAIAssistant) {
      return;
    }

    const slosByStatus = mapValues(
      _groupBy(sloList.results, (result) => result.summary.status),
      (groupResults) => groupResults.map((result) => `- ${result.name}`).join('\n')
    ) as Record<SLOWithSummaryResponse['summary']['status'], string>;

    return observabilityAIAssistant.service.setScreenContext({
      screenDescription: dedent(`The user is looking at a list of SLOs.

      ${
        sloList.total >= 1
          ? `There are ${sloList.total} SLOs. Out of those, ${sloList.results.length} are visible.

          Violating SLOs:
          ${slosByStatus.VIOLATED}

          Degrading SLOs:
          ${slosByStatus.DEGRADING}

          Healthy SLOs:
          ${slosByStatus.HEALTHY}

          SLOs without data:
          ${slosByStatus.NO_DATA}

          `
          : ''
      }
      `),
    });
  }, [sloList, observabilityAIAssistant]);

  useEffect(() => {
    if (!isLoading && sloList !== undefined) {
      onPageReady();
    }
  }, [isLoading, sloList, onPageReady]);

  return (
    <EuiFlexGroup direction="column" gutterSize="m" data-test-subj="sloList">
      <EuiFlexItem grow={false}>
        <ToggleSLOView
          sloList={sloList}
          view={view}
          onChangeView={(newView) => onStateChange({ view: newView })}
          onStateChange={onStateChange}
          state={state}
          loading={isLoading || isDeletingSlo}
        />
      </EuiFlexItem>
      {groupBy === 'ungrouped' && (
        <UngroupedView
          sloList={sloList}
          loading={isLoading || isRefetching}
          error={isError}
          view={view}
        />
      )}
      {groupBy !== 'ungrouped' && (
        <GroupView
          view={view}
          groupBy={groupBy}
          kqlQuery={kqlQuery}
          sort={state.sort.by}
          direction={state.sort.direction}
          filters={filters}
        />
      )}
    </EuiFlexGroup>
  );
}
