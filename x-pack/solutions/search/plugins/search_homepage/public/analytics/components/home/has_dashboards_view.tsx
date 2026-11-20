/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Ref } from 'react';
import React from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiListGroup,
  EuiListGroupItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { ANALYTICS_TELEMETRY_PREFIX } from '../../constants';
import { getSourceStarterQueries } from '../../source_queries';
import type { AnalyticsClusterState, AnalyticsEventSource, AnalyticsLinks } from '../../types';
import { AddSourceButton } from '../shared/add_source_button';
import {
  formatCompactNumber,
  getClusterSummary,
  getDefaultEventSource,
} from '../shared/event_source_utils';
import { EventsDetectedCallout } from '../shared/event_status';
import { EventsOverTime } from '../shared/events_over_time';
import { panelHeader } from '../shared/shared_styles';
import { HomeHeader } from './home_header';

/** Lists stay short so the quick actions remain the first thing to read. */
const MAX_LIST_ITEMS = 3;

interface HasDashboardsViewProps {
  headingRef: Ref<HTMLHeadingElement>;
  state: AnalyticsClusterState;
  links: AnalyticsLinks;
  hasJustArrived: boolean;
  onDismissArrival: () => void;
}

export const HasDashboardsView = ({
  headingRef,
  state,
  links,
  hasJustArrived,
  onDismissArrival,
}: HasDashboardsViewProps): React.JSX.Element => {
  const recentDashboards = state.recentDashboards.slice(0, MAX_LIST_ITEMS);
  const sources = state.sources.slice(0, MAX_LIST_ITEMS);
  const defaultSource = getDefaultEventSource(state.sources);
  const hiddenSourcesCount = state.totalSources - sources.length;

  const discoverTooltip = links.canUseDiscover
    ? undefined
    : i18n.translate('xpack.searchHomepage.analytics.home.hasDashboards.missingDiscover', {
        defaultMessage: 'You need access to Discover to explore your events.',
      });

  const openSourceInDiscover = (source: AnalyticsEventSource): void =>
    links.openDiscover(getSourceStarterQueries(source)[0]?.esql);

  return (
    <KibanaPageTemplate.Section
      paddingSize="xl"
      grow={false}
      data-test-subj="analyticsHomeHasDashboards"
    >
      <HomeHeader
        headingRef={headingRef}
        title={i18n.translate('xpack.searchHomepage.analytics.home.hasDashboards.title', {
          defaultMessage: 'Your event analytics',
        })}
        summary={getClusterSummary(state, { includeDashboards: true })}
      />
      {hasJustArrived && (
        <>
          <EventsDetectedCallout
            page="home"
            sourceName={defaultSource?.name}
            announceOnMount
            onDismiss={onDismissArrival}
          />
          <EuiSpacer size="m" />
        </>
      )}
      <EventsOverTime
        page="home"
        headingElement="h2"
        sources={state.sources}
        totalSources={state.totalSources}
      />
      <EuiFlexGroup
        gutterSize="m"
        alignItems="center"
        wrap
        data-test-subj="analyticsHomeQuickActions"
      >
        <EuiFlexItem grow={false}>
          <EuiToolTip content={discoverTooltip}>
            <EuiButton
              fill
              iconType="discoverApp"
              onClick={() =>
                defaultSource ? openSourceInDiscover(defaultSource) : links.openDiscover()
              }
              isDisabled={!links.canUseDiscover}
              hasAriaDisabled
              data-test-subj="analyticsHomeExploreEvents"
              data-telemetry-id={`${ANALYTICS_TELEMETRY_PREFIX}-home-exploreEvents`}
            >
              {i18n.translate('xpack.searchHomepage.analytics.home.hasDashboards.exploreButton', {
                defaultMessage: 'Explore events',
              })}
            </EuiButton>
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={
              links.canCreateDashboard
                ? undefined
                : i18n.translate(
                    'xpack.searchHomepage.analytics.home.hasDashboards.missingDashboardPrivilege',
                    {
                      defaultMessage: 'You need permission to create dashboards.',
                    }
                  )
            }
          >
            <EuiButton
              iconType="dashboardApp"
              onClick={links.createDashboard}
              isDisabled={!links.canCreateDashboard}
              hasAriaDisabled
              data-test-subj="analyticsHomeNewDashboard"
              data-telemetry-id={`${ANALYTICS_TELEMETRY_PREFIX}-home-newDashboard`}
            >
              {i18n.translate(
                'xpack.searchHomepage.analytics.home.hasDashboards.newDashboardButton',
                { defaultMessage: 'New dashboard' }
              )}
            </EuiButton>
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <AddSourceButton
            page="home"
            name="AddSource"
            emphasis="medium"
            audience="events"
            links={links}
            label={i18n.translate(
              'xpack.searchHomepage.analytics.home.hasDashboards.addSourceButton',
              {
                defaultMessage: 'Add a source',
              }
            )}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="l" />
      <EuiFlexGroup gutterSize="l">
        <EuiFlexItem>
          <EuiPanel hasBorder paddingSize="m" data-test-subj="analyticsHomeRecentDashboards">
            <EuiFlexGroup
              gutterSize="s"
              alignItems="center"
              justifyContent="spaceBetween"
              responsive={false}
              css={panelHeader}
            >
              <EuiFlexItem>
                <EuiTitle size="xs">
                  <h2>
                    {i18n.translate(
                      'xpack.searchHomepage.analytics.home.hasDashboards.recentTitle',
                      { defaultMessage: 'Recent dashboards' }
                    )}
                  </h2>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="s"
                  onClick={links.openDashboards}
                  data-test-subj="analyticsHomeViewAllDashboards"
                  data-telemetry-id={`${ANALYTICS_TELEMETRY_PREFIX}-home-viewAllDashboards`}
                >
                  {i18n.translate(
                    'xpack.searchHomepage.analytics.home.hasDashboards.viewAllButton',
                    { defaultMessage: 'View all' }
                  )}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
            <EuiListGroup maxWidth={false}>
              {recentDashboards.map(({ id, title }) => (
                <EuiListGroupItem
                  key={id}
                  iconType="dashboardApp"
                  label={title}
                  onClick={() => links.openDashboard(id)}
                  data-test-subj={`analyticsHomeDashboard-${id}`}
                  data-telemetry-id={`${ANALYTICS_TELEMETRY_PREFIX}-home-openDashboard`}
                />
              ))}
            </EuiListGroup>
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel hasBorder paddingSize="m" data-test-subj="analyticsHomeEventSources">
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} css={panelHeader}>
              <EuiFlexItem>
                <EuiTitle size="xs">
                  <h2>
                    {i18n.translate(
                      'xpack.searchHomepage.analytics.home.hasDashboards.sourcesTitle',
                      { defaultMessage: 'Event sources' }
                    )}
                  </h2>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
            <EuiListGroup maxWidth={false}>
              {sources.map((source) => (
                <EuiListGroupItem
                  key={source.name}
                  iconType="discoverApp"
                  label={
                    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                      <EuiFlexItem grow={false}>{source.name}</EuiFlexItem>
                      {source.isSampleData && (
                        <EuiFlexItem grow={false}>
                          <EuiBadge color="hollow">
                            {i18n.translate(
                              'xpack.searchHomepage.analytics.home.hasDashboards.sampleBadge',
                              { defaultMessage: 'Sample' }
                            )}
                          </EuiBadge>
                        </EuiFlexItem>
                      )}
                      {source.documentsCount !== null && (
                        <EuiFlexItem grow={false}>
                          <EuiText size="xs" color="subdued">
                            {i18n.translate(
                              'xpack.searchHomepage.analytics.home.hasDashboards.sourceEvents',
                              {
                                defaultMessage:
                                  '{count, plural, one {# event} other {{formattedCount} events}}',
                                values: {
                                  count: source.documentsCount,
                                  formattedCount: formatCompactNumber(source.documentsCount),
                                },
                              }
                            )}
                          </EuiText>
                        </EuiFlexItem>
                      )}
                    </EuiFlexGroup>
                  }
                  // Without Discover the sources are a plain list; the quick action explains why.
                  onClick={links.canUseDiscover ? () => openSourceInDiscover(source) : undefined}
                  data-test-subj={`analyticsHomeEventSource-${source.name}`}
                  data-telemetry-id={`${ANALYTICS_TELEMETRY_PREFIX}-home-openEventSource`}
                />
              ))}
            </EuiListGroup>
            {hiddenSourcesCount > 0 && (
              <>
                <EuiSpacer size="xs" />
                <EuiText size="xs" color="subdued">
                  <p>
                    {i18n.translate(
                      'xpack.searchHomepage.analytics.home.hasDashboards.moreSources',
                      {
                        defaultMessage:
                          'and {count, plural, one {# more source} other {# more sources}}, available in Discover',
                        values: { count: hiddenSourcesCount },
                      }
                    )}
                  </p>
                </EuiText>
              </>
            )}
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </KibanaPageTemplate.Section>
  );
};
