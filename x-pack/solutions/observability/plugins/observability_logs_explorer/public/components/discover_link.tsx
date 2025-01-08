/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHeaderLink } from '@elastic/eui';
import { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { DiscoverStart } from '@kbn/discover-plugin/public';
import { hydrateDataSourceSelection } from '@kbn/logs-explorer-plugin/common';
import {
  getDiscoverColumnsWithFallbackFieldsFromDisplayOptions,
  getDiscoverFiltersFromState,
} from '@kbn/logs-explorer-plugin/public';
import { getRouterLinkProps } from '@kbn/router-utils';
import { MatchedStateFromActor } from '@kbn/xstate-utils';
import { useActor } from '@xstate/react';
import React, { useMemo } from 'react';
import { discoverLinkTitle } from '../../common/translations';
import {
  ObservabilityLogsExplorerService,
  useObservabilityLogsExplorerPageStateContext,
} from '../state_machines/observability_logs_explorer/src';
import { useKibanaContextForPlugin } from '../utils/use_kibana';

export const ConnectedDiscoverLink = React.memo(() => {
  const {
    services: { discover },
  } = useKibanaContextForPlugin();

  const [pageState] = useActor(useObservabilityLogsExplorerPageStateContext());
  if (pageState.matches({ initialized: 'validLogsExplorerState' })) {
    return <DiscoverLinkForValidState discover={discover} pageState={pageState} />;
  } else {
    return <DiscoverLinkForUnknownState />;
  }
});

type InitializedPageState = MatchedStateFromActor<
  ObservabilityLogsExplorerService,
  { initialized: 'validLogsExplorerState' }
>;

export const DiscoverLinkForValidState = React.memo(
  ({
    discover,
    pageState: {
      context: { logsExplorerState, allSelection },
    },
  }: {
    discover: DiscoverStart;
    pageState: InitializedPageState;
  }) => {
    const discoverLinkParams = useMemo<DiscoverAppLocatorParams>(() => {
      const index = hydrateDataSourceSelection(
        logsExplorerState.dataSourceSelection,
        allSelection
      ).toDataviewSpec();
      return {
        breakdownField: logsExplorerState.chart.breakdownField ?? undefined,
        columns: getDiscoverColumnsWithFallbackFieldsFromDisplayOptions(logsExplorerState),
        filters: getDiscoverFiltersFromState(
          index.id,
          logsExplorerState.filters,
          logsExplorerState.controls
        ),
        query: logsExplorerState.query,
        refreshInterval: logsExplorerState.refreshInterval,
        timeRange: logsExplorerState.time,
        dataViewSpec: index,
      };
    }, [allSelection, logsExplorerState]);

    return <DiscoverLink discover={discover} discoverLinkParams={discoverLinkParams} />;
  }
);

export const DiscoverLinkForUnknownState = React.memo(() => (
  <EuiHeaderLink
    color="primary"
    iconType="discoverApp"
    data-test-subj="logsExplorerDiscoverFallbackLink"
    disabled
  >
    {discoverLinkTitle}
  </EuiHeaderLink>
));

export const DiscoverLink = React.memo(
  ({
    discover,
    discoverLinkParams,
  }: {
    discover: DiscoverStart;
    discoverLinkParams: DiscoverAppLocatorParams;
  }) => {
    const discoverUrl = discover.locator?.getRedirectUrl(discoverLinkParams);

    const navigateToDiscover = () => {
      discover.locator?.navigate(discoverLinkParams);
    };

    const discoverLinkProps = getRouterLinkProps({
      href: discoverUrl,
      onClick: navigateToDiscover,
    });

    return (
      <EuiHeaderLink
        {...discoverLinkProps}
        color="primary"
        iconType="discoverApp"
        data-test-subj="logsExplorerDiscoverFallbackLink"
      >
        {discoverLinkTitle}
      </EuiHeaderLink>
    );
  }
);
