/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TypeOf } from '@kbn/typed-react-router-config';
import React from 'react';
import { useAnyOfProfilingParams } from '../hooks/use_profiling_params';
import { useProfilingRouter } from '../hooks/use_profiling_router';
import { useProfilingRoutePath } from '../hooks/use_profiling_route_path';
import { useTimeRangeContext } from '../hooks/use_time_range_context';
import { ProfilingRoutes } from '../routing';
import { PrimaryProfilingSearchBar } from './profiling_app_page_template/primary_profiling_search_bar';
import { ProfilingSearchBar } from './profiling_app_page_template/profiling_search_bar';

export function PrimaryAndComparisonSearchBar() {
  const {
    path,
    query,
    query: { comparisonKuery, comparisonRangeFrom, comparisonRangeTo },
  } = useAnyOfProfilingParams('/flamegraphs/differential', '/functions/differential');

  const { refresh } = useTimeRangeContext();

  const profilingRouter = useProfilingRouter();
  const routePath = useProfilingRoutePath() as
    | '/flamegraphs/differential'
    | '/functions/differential';

  function navigate(nextOptions: { rangeFrom: string; rangeTo: string; kuery?: string }) {
    if (routePath === '/flamegraphs/differential') {
      profilingRouter.push(routePath, {
        path,
        query: {
          ...(query as TypeOf<ProfilingRoutes, '/flamegraphs/differential'>['query']),
          comparisonRangeFrom: nextOptions.rangeFrom,
          comparisonRangeTo: nextOptions.rangeTo,
          comparisonKuery: nextOptions.kuery ?? query.comparisonKuery,
        },
      });
    } else {
      profilingRouter.push(routePath, {
        path,
        query: {
          ...(query as TypeOf<ProfilingRoutes, '/functions/differential'>['query']),
          comparisonRangeFrom: nextOptions.rangeFrom,
          comparisonRangeTo: nextOptions.rangeTo,
          comparisonKuery: nextOptions.kuery ?? query.comparisonKuery,
        },
      });
    }
  }

  let baselineTitle: string;
  let comparisonTitle: string;

  if (routePath === '/flamegraphs/differential') {
    baselineTitle = i18n.translate('xpack.profiling.comparisonSearch.baselineTitleFlamegraph', {
      defaultMessage: 'Baseline flamegraph',
    });
    comparisonTitle = i18n.translate('xpack.profiling.comparisonSearch.comparisonTitleFlamegraph', {
      defaultMessage: 'Comparison flamegraph',
    });
  } else {
    baselineTitle = i18n.translate('xpack.profiling.comparisonSearch.baselineTitleFunctions', {
      defaultMessage: 'Baseline functions',
    });
    comparisonTitle = i18n.translate('xpack.profiling.comparisonSearch.comparisonTitleFunctions', {
      defaultMessage: 'Comparison functions',
    });
  }
  return (
    <EuiFlexGroup direction="row" gutterSize="xs" alignItems="flexEnd">
      <EuiFlexItem>
        <EuiTitle size="xxs">
          <h3>{baselineTitle}</h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <PrimaryProfilingSearchBar showSubmitButton={false} />
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={{ padding: '0 8px' }}>
        <EuiToolTip position="top" content="Swap sides">
          <EuiButtonIcon
            data-test-subj="profilingPrimaryAndComparisonSearchBarButton"
            iconType="merge"
            size="m"
            onClick={() => {
              const next = {
                ...query,
                rangeFrom: comparisonRangeFrom,
                rangeTo: comparisonRangeTo,
                kuery: comparisonKuery,
                comparisonRangeFrom: query.rangeFrom,
                comparisonRangeTo: query.rangeTo,
                comparisonKuery: query.kuery,
              };

              if (routePath === '/flamegraphs/differential') {
                profilingRouter.push(routePath, {
                  path,
                  query: next as TypeOf<ProfilingRoutes, '/flamegraphs/differential'>['query'],
                });
              } else {
                profilingRouter.push(routePath, {
                  path,
                  query: next as TypeOf<ProfilingRoutes, '/functions/differential'>['query'],
                });
              }
            }}
          />
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiTitle size="xxs">
          <h3>{comparisonTitle}</h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <ProfilingSearchBar
          kuery={comparisonKuery}
          rangeFrom={comparisonRangeFrom}
          rangeTo={comparisonRangeTo}
          showSubmitButton={false}
          onQuerySubmit={(next) => {
            navigate({
              kuery: String(next.query?.query || ''),
              rangeFrom: next.dateRange.from,
              rangeTo: next.dateRange.to,
            });
          }}
          onRefresh={(nextDateRange) => {
            navigate({
              rangeFrom: nextDateRange.dateRange.from,
              rangeTo: nextDateRange.dateRange.to,
            });
          }}
          onRefreshClick={() => {
            refresh();
          }}
          dataTestSubj="profilingComparisonUnifiedSearchBar"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
