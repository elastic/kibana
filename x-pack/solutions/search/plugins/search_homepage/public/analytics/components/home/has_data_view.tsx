/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Ref } from 'react';
import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { useSourceGeneration } from '../../hooks/use_source_generation';
import type { AnalyticsClusterState, AnalyticsLinks } from '../../types';
import { AddSourceButton } from '../shared/add_source_button';
import { BuildDashboardButton } from '../shared/build_dashboard_button';
import {
  getClusterSummary,
  getDefaultEventSource,
  hasOnlySampleSources,
} from '../shared/event_source_utils';
import { EventsDetectedCallout } from '../shared/event_status';
import { EventsOverTime } from '../shared/events_over_time';
import { ExplorePanel } from '../shared/explore_panel';
import { useSelectedEventSource } from '../shared/use_selected_event_source';
import { HomeHeader } from './home_header';

interface HasDataViewProps {
  headingRef: Ref<HTMLHeadingElement>;
  state: AnalyticsClusterState;
  links: AnalyticsLinks;
  /** Whether the events arrived while the user was looking at the page. */
  hasJustArrived: boolean;
  onDismissArrival: () => void;
}

export const HasDataView = ({
  headingRef,
  state,
  links,
  hasJustArrived,
  onDismissArrival,
}: HasDataViewProps): React.JSX.Element => {
  const [selectedSource, selectSource] = useSelectedEventSource(state.sources);
  const chartedSources = useMemo(() => (selectedSource ? [selectedSource] : []), [selectedSource]);
  const generation = useSourceGeneration(selectedSource);

  return (
    <KibanaPageTemplate.Section paddingSize="xl" grow={false} data-test-subj="analyticsHomeHasData">
      <HomeHeader
        headingRef={headingRef}
        title={
          hasOnlySampleSources(state)
            ? i18n.translate('xpack.searchHomepage.analytics.home.hasData.sampleTitle', {
                defaultMessage: 'Explore your sample events',
              })
            : i18n.translate('xpack.searchHomepage.analytics.home.hasData.title', {
                defaultMessage: 'Explore your events',
              })
        }
        summary={getClusterSummary(state, { includeDashboards: false })}
        action={
          <AddSourceButton
            page="home"
            name="AddSource"
            emphasis="low"
            audience="events"
            links={links}
            label={i18n.translate('xpack.searchHomepage.analytics.home.hasData.addSourceButton', {
              defaultMessage: 'Add another source',
            })}
          />
        }
      />
      {hasJustArrived && (
        <>
          <EventsDetectedCallout
            page="home"
            sourceName={getDefaultEventSource(state.sources)?.name}
            announceOnMount
            onDismiss={onDismissArrival}
          />
          <EuiSpacer size="m" />
        </>
      )}
      <EventsOverTime
        page="home"
        headingElement="h2"
        sources={chartedSources}
        totalSources={state.totalSources}
      />
      <ExplorePanel
        page="home"
        headingElement="h2"
        sources={state.sources}
        totalSources={state.totalSources}
        selectedSource={selectedSource}
        onSelectSource={selectSource}
        showAgentEntry
        links={links}
        generation={generation}
      />
      <EuiSpacer size="m" />
      <EuiPanel
        color="subdued"
        hasBorder={false}
        paddingSize="m"
        data-test-subj="analyticsHomeNext"
      >
        <EuiFlexGroup gutterSize="m" alignItems="center" justifyContent="spaceBetween" wrap>
          <EuiFlexItem>
            <EuiText size="s">
              <p>
                {i18n.translate('xpack.searchHomepage.analytics.home.hasData.nextText', {
                  defaultMessage:
                    'The dashboard opens with starter panels that you can edit before saving.',
                })}
              </p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <BuildDashboardButton
              page="home"
              source={selectedSource}
              fill={false}
              links={links}
              generation={generation}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </KibanaPageTemplate.Section>
  );
};
