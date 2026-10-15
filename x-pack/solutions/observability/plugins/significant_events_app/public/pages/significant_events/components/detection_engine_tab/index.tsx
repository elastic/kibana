/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiNotificationBadge,
  EuiSpacer,
  EuiTab,
  EuiTabs,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { useDetectionEngineActions } from '../../../../hooks/use_detection_engine_actions';
import { useDetectionEngineEvents } from '../../../../hooks/use_detection_engine_events';
import { useDetectionEngineOverview } from '../../../../hooks/use_detection_engine_overview';
import { useDetectionEngineServices } from '../../../../hooks/use_detection_engine_services';
import { ActivityLog } from './activity_log';
import { DetectionsTable } from './detections_table';
import { EngineHeader } from './engine_header';
import { EngineKpis } from './engine_kpis';
import { EventFlyout } from './event_flyout';
import { EventsTable } from './events_table';
import { PipelineSummary } from './pipeline_summary';
import { ScenarioPanel } from './scenario_panel';
import { ServicesTable } from './services_table';
import { StrategiesTable } from './strategies_table';
import { SystemMap } from './system_map';

type InnerTab = 'events' | 'services' | 'strategies' | 'detections' | 'activity';

/** Prototype of the detection engine architecture, built to be demoed end to end from here. */
export function DetectionEngineTab() {
  const { data: overview, isLoading } = useDetectionEngineOverview();
  const { data: eventsData, isLoading: isEventsLoading } = useDetectionEngineEvents();
  const { data: servicesData } = useDetectionEngineServices();
  const actions = useDetectionEngineActions();
  const [innerTab, setInnerTab] = useState<InnerTab>('events');
  const [openEventId, setOpenEventId] = useState<string | undefined>();

  if (isLoading || !overview) {
    return <EuiLoadingSpinner size="xl" data-test-subj="detectionEngineLoading" />;
  }

  const events = eventsData?.events ?? [];
  const tabs: Array<{ id: InnerTab; label: string; count?: number }> = [
    {
      id: 'events',
      label: i18n.translate('xpack.significantEventsApp.detectionEngine.tabs.events', {
        defaultMessage: 'Significant events',
      }),
      count: overview.counts.open_events,
    },
    {
      id: 'services',
      label: i18n.translate('xpack.significantEventsApp.detectionEngine.tabs.services', {
        defaultMessage: 'By service',
      }),
    },
    {
      id: 'strategies',
      label: i18n.translate('xpack.significantEventsApp.detectionEngine.tabs.strategies', {
        defaultMessage: 'Strategies and learning',
      }),
      count: overview.proposals.length,
    },
    {
      id: 'detections',
      label: i18n.translate('xpack.significantEventsApp.detectionEngine.tabs.detections', {
        defaultMessage: 'Every detection',
      }),
    },
    {
      id: 'activity',
      label: i18n.translate('xpack.significantEventsApp.detectionEngine.tabs.activity', {
        defaultMessage: 'Activity log',
      }),
    },
  ];

  return (
    <div data-test-subj="detectionEngineTab">
      <EngineHeader overview={overview} actions={actions} />
      <EuiSpacer size="m" />
      <EngineKpis overview={overview} />
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="m" alignItems="stretch">
        <EuiFlexItem grow={3}>
          <SystemMap
            lab={overview.lab}
            services={servicesData?.services ?? []}
            events={events}
            onOpenEvent={setOpenEventId}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={2}>
          <ScenarioPanel lab={overview.lab} actions={actions} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <PipelineSummary run={overview.last_run} />
      <EuiSpacer size="l" />
      <EuiTabs size="m">
        {tabs.map((tab) => (
          <EuiTab
            key={tab.id}
            isSelected={innerTab === tab.id}
            onClick={() => setInnerTab(tab.id)}
            data-test-subj={`detectionEngineInnerTab-${tab.id}`}
            append={
              tab.count ? (
                <EuiNotificationBadge color={tab.id === 'events' ? 'accent' : 'subdued'}>
                  {tab.count}
                </EuiNotificationBadge>
              ) : undefined
            }
          >
            {tab.label}
          </EuiTab>
        ))}
      </EuiTabs>
      <EuiSpacer size="m" />
      {innerTab === 'events' && (
        <EventsTable events={events} isLoading={isEventsLoading} onOpenEvent={setOpenEventId} />
      )}
      {innerTab === 'services' && <ServicesTable />}
      {innerTab === 'strategies' && <StrategiesTable overview={overview} actions={actions} />}
      {innerTab === 'detections' && <DetectionsTable onOpenEvent={setOpenEventId} />}
      {innerTab === 'activity' && <ActivityLog onOpenEvent={setOpenEventId} />}
      {openEventId && (
        <EventFlyout
          eventId={openEventId}
          actions={actions}
          onClose={() => setOpenEventId(undefined)}
        />
      )}
    </div>
  );
}
