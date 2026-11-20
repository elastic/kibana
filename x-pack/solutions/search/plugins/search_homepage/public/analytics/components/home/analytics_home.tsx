/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Ref } from 'react';
import React from 'react';
import type {
  AnalyticsClusterState,
  AnalyticsLinks,
  AnalyticsSampleData,
  ResolvedJourney,
} from '../../types';
import { HasDashboardsView } from './has_dashboards_view';
import { HasDataView } from './has_data_view';
import { HomeFooter } from './home_footer';

interface AnalyticsHomeProps {
  headingRef: Ref<HTMLHeadingElement>;
  /** The cluster state reduced to its event sources. */
  state: AnalyticsClusterState;
  links: AnalyticsLinks;
  sampleData: AnalyticsSampleData;
  /** Whether the events arrived while the user was looking at the page. */
  hasJustArrived: boolean;
  onDismissArrival: () => void;
  /** Set when the deployment also holds search data. */
  alternativeJourney: ResolvedJourney | undefined;
  onSwitchJourney: (journey: ResolvedJourney) => void;
}

/** The home for event data: one task at a time, chosen by whether dashboards exist yet. */
export const AnalyticsHome = ({
  headingRef,
  state,
  links,
  sampleData,
  hasJustArrived,
  onDismissArrival,
  alternativeJourney,
  onSwitchJourney,
}: AnalyticsHomeProps): React.JSX.Element => {
  const View = state.stage === 'hasDashboards' ? HasDashboardsView : HasDataView;

  return (
    <>
      <View
        headingRef={headingRef}
        state={state}
        links={links}
        hasJustArrived={hasJustArrived}
        onDismissArrival={onDismissArrival}
      />
      <HomeFooter
        links={links}
        sampleData={sampleData}
        alternativeJourney={alternativeJourney}
        onSwitchJourney={onSwitchJourney}
      />
    </>
  );
};
