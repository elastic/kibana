/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  EuiAvatar,
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import { i18n } from '@kbn/i18n';
import { OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS_DISCOVERY } from '@kbn/management-settings-ids';
import { DISCOVER_APP_LOCATOR, type DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import {
  NightshiftApp,
  SignificantEventList,
  SignificantEventSummary,
  type SignificantEventListItem,
  type SignificantEventItemStatusColor,
  type SignificantEventSummaryCategory,
} from '@kbn/nightshift';
import type { SigEvent, SigEventStatus } from '@kbn/streams-schema';
import { useKibana } from '../../utils/kibana_react';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { OVERVIEW_PATH } from '../../../common/locators/paths';
import { useFetchSignificantEvents } from './use_fetch_significant_events';
import { useFetchFeatures } from './use_fetch_features';
import { useFetchDetections } from './use_fetch_detections';
import { NightshiftEventFlyout } from './nightshift_event_flyout';

/*
 * v0 status → list-item mapping. Only `promoted`/`resolved` are shown as
 * distinct colors here — `acknowledged`/`demoted` fold into `promoted`'s
 * visual treatment for now, matching the 2026-07-02 design decision to
 * expose only two states ("open"/"resolved") to users at this stage. See
 * dev/nightshift-v0-landing-page/STATUS.md for the full reasoning.
 */
const STATUS_ITEM_LABELS: Record<SigEventStatus, string> = {
  promoted: i18n.translate('xpack.observability.nightshift.list.status.open', {
    defaultMessage: 'Open',
  }),
  acknowledged: i18n.translate('xpack.observability.nightshift.list.status.open', {
    defaultMessage: 'Open',
  }),
  resolved: i18n.translate('xpack.observability.nightshift.list.status.resolved', {
    defaultMessage: 'Resolved',
  }),
  demoted: i18n.translate('xpack.observability.nightshift.list.status.open', {
    defaultMessage: 'Open',
  }),
};

const STATUS_ITEM_COLORS: Record<SigEventStatus, SignificantEventItemStatusColor> = {
  promoted: 'danger',
  acknowledged: 'danger',
  resolved: 'success',
  demoted: 'danger',
};

function toListItem(event: SigEvent): SignificantEventListItem {
  return {
    id: event.event_id,
    title: event.title,
    summary: event.summary,
    detectedAt: event['@timestamp'],
    status: {
      label: STATUS_ITEM_LABELS[event.status],
      color: STATUS_ITEM_COLORS[event.status],
    },
  };
}

const SIGNIFICANT_EVENTS_TITLE = i18n.translate(
  'xpack.observability.nightshift.significantEventsTitle',
  { defaultMessage: 'Significant events' }
);
const SHOW_ALL_LABEL = i18n.translate('xpack.observability.nightshift.showAllLabel', {
  defaultMessage: 'Show all',
});
const IMPACTED_TITLE = i18n.translate('xpack.observability.nightshift.impactedTitle', {
  defaultMessage: 'Impacted',
});

// Where "Show all" goes — the existing, fully-built streams_app Discovery page.
// Roshan proposed exactly this "top N + view more" pattern in Slack (see
// threads/nightshift-rd/STATUS.md §0).
const SHOW_ALL_PATH = '/app/streams/_discovery/significant_events';

const PAGE_TITLE = i18n.translate('xpack.observability.nightshift.pageTitle', {
  defaultMessage: 'Nightshift',
});
const SETTINGS_LABEL = i18n.translate('xpack.observability.nightshift.settingsLabel', {
  defaultMessage: 'Settings',
});
const SETTINGS_NOT_AVAILABLE_LABEL = i18n.translate(
  'xpack.observability.nightshift.settingsNotAvailable',
  { defaultMessage: 'Not available in this preview' }
);
const HERO_TITLE = i18n.translate('xpack.observability.nightshift.heroTitle', {
  defaultMessage: 'Your action might be needed',
});

export function NightshiftPage() {
  const {
    http,
    share,
    application,
    http: { basePath },
    uiSettings,
    serverless,
  } = useKibana().services;
  const { ObservabilityPageTemplate } = usePluginContext();
  const history = useHistory();
  const { events, isLoading } = useFetchSignificantEvents(http);
  const { featuresById } = useFetchFeatures(http);
  const { detectionsById } = useFetchDetections(http);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<SignificantEventSummaryCategory>('requireAction');

  const isEnabled = uiSettings.get<boolean>(
    OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS_DISCOVERY,
    false
  );

  useBreadcrumbs(
    [
      {
        href: basePath.prepend('/app/observability/nightshift'),
        text: i18n.translate('xpack.observability.breadcrumbs.nightshiftLinkText', {
          defaultMessage: 'Nightshift',
        }),
        deepLinkId: 'observability-overview:nightshift',
      },
    ],
    { serverless }
  );

  const selectedEvent = useMemo(
    () => events.find((event) => event.event_id === selectedId) ?? null,
    [events, selectedId]
  );

  const filteredEvents = useMemo(
    () =>
      events.filter((event) =>
        activeFilter === 'resolved' ? event.status === 'resolved' : event.status !== 'resolved'
      ),
    [events, activeFilter]
  );

  const listItems = useMemo(() => filteredEvents.map(toListItem), [filteredEvents]);

  const summaryCounts = useMemo(
    () => ({
      requireAction: events.filter((event) => event.status !== 'resolved').length,
      resolved: events.filter((event) => event.status === 'resolved').length,
    }),
    [events]
  );

  // Aggregated "Impacted" badges across the currently-filtered list, with
  // counts — per Kate Sosedova's prototype, this is a panel-level facet,
  // distinct from the per-event Impact badges shown inside the flyout
  // (which don't show counts, since there's nothing to aggregate at that
  // scope).
  const impactedCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const event of filteredEvents) {
      for (const ki of event.cause_kis ?? []) {
        if (!ki.name) continue;
        counts.set(ki.name, (counts.get(ki.name) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [filteredEvents]);

  const handleOpenInDiscoverEsql = useCallback(
    (esql: string) => {
      const locator = share.url.locators.get<DiscoverAppLocatorParams>(DISCOVER_APP_LOCATOR);
      locator?.navigate({ query: { esql } });
    },
    [share]
  );

  if (!isEnabled) {
    history.replace(OVERVIEW_PATH);
    return null;
  }

  return (
    <ObservabilityPageTemplate
      data-test-subj="nightshiftPage"
      isEmptyState={events.length === 0}
      restrictWidth="800px"
      pageSectionProps={{ restrictWidth: '800px' }}
      panelled
      pageHeader={{
        // Not a plain string: EUI's EuiPageHeaderContent hardcodes the title
        // wrapper to size "l" regardless of `pageTitleProps.size` (spreads
        // pageTitleProps, then unconditionally overwrites `size`), and using
        // `children` instead of `pageTitle` adds an unwanted extra
        // `EuiSpacer` above it. Nesting our own `EuiTitle` inside `pageTitle`
        // sidesteps both — the inner element's own font-size wins over the
        // outer h1's, since it's set directly rather than inherited.
        pageTitle: (
          <EuiTitle size="xs">
            <span>{PAGE_TITLE}</span>
          </EuiTitle>
        ),
        restrictWidth: false,
        // Overrides the 'l' (24px) block padding the header inherits by
        // default from ObservabilityPageTemplate's own paddingSize.
        paddingSize: 's',
        rightSideItems: [
          <EuiToolTip content={SETTINGS_NOT_AVAILABLE_LABEL} key="settings">
            <EuiButtonEmpty iconType="gear" isDisabled>
              {SETTINGS_LABEL}
            </EuiButtonEmpty>
          </EuiToolTip>,
        ],
      }}
    >
      {!isLoading && events.length === 0 ? (
        <NightshiftApp />
      ) : (
        <>
          {summaryCounts.requireAction > 0 && (
            <>
              <EuiFlexGroup direction="column" alignItems="center" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiAvatar
                    size="xl"
                    name={HERO_TITLE}
                    iconType="bell"
                    color="#FDF2E9"
                    iconColor="#D97706"
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiTitle size="m">
                    <h1>{HERO_TITLE}</h1>
                  </EuiTitle>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="l" />
            </>
          )}
          <EuiPanel hasBorder paddingSize="m">
            <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiTitle size="s">
                  <h2>{SIGNIFICANT_EVENTS_TITLE}</h2>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiLink onClick={() => application.navigateToApp('streams', { path: SHOW_ALL_PATH })}>
                  {SHOW_ALL_LABEL}
                </EuiLink>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="m" />

            <SignificantEventSummary
              requireAction={summaryCounts.requireAction}
              inProgress={0}
              resolved={summaryCounts.resolved}
              demoted={0}
              visibleCategories={['requireAction', 'resolved']}
              activeCategory={activeFilter}
              onCategoryClick={setActiveFilter}
            />

            {impactedCounts.length > 0 && (
              <>
                <EuiSpacer size="m" />
                <EuiTitle size="xxs">
                  <h3>{IMPACTED_TITLE}</h3>
                </EuiTitle>
                <EuiSpacer size="xs" />
                <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
                  {impactedCounts.map(([name, count]) => (
                    <EuiFlexItem grow={false} key={name}>
                      <EuiBadge color="hollow">
                        {name} {count}
                      </EuiBadge>
                    </EuiFlexItem>
                  ))}
                </EuiFlexGroup>
              </>
            )}
          </EuiPanel>

          <EuiSpacer size="s" />

          {/* SignificantEventList defaults to a 760px cap designed for a
              narrower host; override so it fills the same 800px column as
              the panel above and the hero section, instead of rendering
              narrower than its siblings. */}
          <SignificantEventList
            items={listItems}
            selectedId={selectedId}
            onSelect={setSelectedId}
            maxWidth={2000}
          />
        </>
      )}
      {selectedEvent && (
        <NightshiftEventFlyout
          event={selectedEvent}
          onClose={() => setSelectedId(null)}
          onOpenInDiscoverEsql={handleOpenInDiscoverEsql}
          featuresById={featuresById}
          detectionsById={detectionsById}
        />
      )}
    </ObservabilityPageTemplate>
  );
}
