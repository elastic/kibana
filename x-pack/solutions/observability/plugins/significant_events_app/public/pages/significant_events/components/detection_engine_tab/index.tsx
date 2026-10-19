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
import { HowToRead } from './how_to_read';
import { LearningPanel } from './learning_panel';
import { PipelineSummary } from './pipeline_summary';
import { ServicesPanel } from './services_panel';
import { StrategiesTable } from './strategies_table';

type InnerTab = 'events' | 'strategies' | 'learning' | 'detections' | 'activity';

/**
 * Prototype of the detection engine architecture. Status, last run and services stay in view
 * next to the events, so the engine can be followed from one screen.
 */
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
      id: 'strategies',
      label: i18n.translate('xpack.significantEventsApp.detectionEngine.tabs.strategies', {
        defaultMessage: 'Strategies',
      }),
      count: overview.proposals.length,
    },
    {
      id: 'learning',
      label: i18n.translate('xpack.significantEventsApp.detectionEngine.tabs.learning', {
        defaultMessage: 'Learning',
      }),
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
      <EuiSpacer size="s" />
      <HowToRead />
      <EngineKpis overview={overview} events={events} />
      <EuiSpacer size="s" />
      <PipelineSummary run={overview.last_run} />
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="m" alignItems="flexStart">
        <EuiFlexItem grow={3} style={{ minWidth: 0 }}>
          <EuiTabs size="s">
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
          <EuiSpacer size="s" />
          {innerTab === 'events' && (
            <EventsTable
              events={events}
              isLoading={isEventsLoading}
              quietPeriodBuckets={overview.config.quiet_period_buckets}
              onOpenEvent={setOpenEventId}
            />
          )}
          {innerTab === 'strategies' && <StrategiesTable overview={overview} actions={actions} />}
          {innerTab === 'learning' && (
            <LearningPanel
              actions={actions}
              services={(servicesData?.services ?? []).map((item) => item.service)}
            />
          )}
          {innerTab === 'detections' && <DetectionsTable onOpenEvent={setOpenEventId} />}
          {innerTab === 'activity' && <ActivityLog onOpenEvent={setOpenEventId} />}
        </EuiFlexItem>
        <EuiFlexItem grow={1} style={{ minWidth: 280 }}>
          <ServicesPanel
            services={servicesData?.services ?? []}
            dependencies={servicesData?.dependencies ?? []}
            onOpenEvent={setOpenEventId}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {openEventId && (
        <EventFlyout
          eventId={openEventId}
          actions={actions}
          strategies={overview.strategies}
          quietPeriodBuckets={overview.config.quiet_period_buckets}
          onClose={() => setOpenEventId(undefined)}
        />
      )}
    </div>
  );
}
