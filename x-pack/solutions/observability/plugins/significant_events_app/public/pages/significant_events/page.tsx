/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import type { AppHeaderMenu } from '@kbn/app-header';
import { NIGHTSHIFT_APP_ID, NIGHTSHIFT_SETTINGS_LOCATOR_ID } from '@kbn/deeplinks-observability';
import { i18n } from '@kbn/i18n';
import {
  getNightshiftCapabilities,
  type NightshiftSettingsLocatorParams,
} from '@kbn/nightshift-shared';
import { KbnDangerCallout, KbnInfoCallout } from '@kbn/ui-callout';
import React, { useCallback, useEffect, useMemo } from 'react';
import { SIGNIFICANT_EVENTS_TAB } from '../../../common';
import { useKibana } from '../../hooks/use_kibana';
import { useDeveloperMode } from '../../hooks/use_developer_mode';
import { getFormattedError } from '../../util/errors';
import type { FeatureAvailability } from '../../util/feature_availability';
import { useSignificantEventsAppParams } from '../../hooks/use_significant_events_app_params';
import { useSignificantEventsAppRouter } from '../../hooks/use_significant_events_app_router';
import { useSignificantEventsAvailability } from '../../hooks/use_significant_events_availability';
import { useBlocksNewActivity } from '../../hooks/use_significant_events_maintenance';
import { RedirectTo } from '../../components/redirect_to';
import { SignificantEventsNotEnabledPrompt } from '../../components/not_enabled_prompt';
import {
  SignificantEventsAppHeader,
  SignificantEventsAppLoading,
  SignificantEventsAppPageTemplate,
} from '../../components/page_template';
import {
  KnowledgeIndicatorsTable,
  KiGenerationProvider,
} from './components/knowledge_indicators_table';
import { SignificantEventsPageProvider } from './context/significant_events_page_context';
import { ONBOARDING_FAILURE_TITLE } from './components/streams_view/translations';
import { QueriesTable } from './components/queries_table/queries_table';
import { StreamsView } from './components/streams_view/streams_view';
import { CortexTab } from './components/cortex/tab';
import { useCortexEnabled } from './components/cortex/use_cortex';
import { DecisionTreesTab } from './components/decision_trees/tab';
import { MemoryTab } from './components/memory/tab';
import { useDecisionTreesEnabled } from './components/decision_trees/use_decision_trees';
import { useMemoryEnabled } from './components/memory/use_memory';
import { DetectionsTab } from './components/detections_tab';
import { SignificantEventsTab } from './components/significant_events_tab';
import { PausedActivityCallout } from './components/paused_activity_callout';
import { RunLimitsBanner } from './components/run_limits_banner';

const significantEventsTabs = [
  'streams',
  'knowledge_indicators',
  'queries',
  'detections',
  SIGNIFICANT_EVENTS_TAB,
  'cortex',
  'decision_trees',
  'memory',
] as const;
type SignificantEventsTabId = (typeof significantEventsTabs)[number];

function isValidSignificantEventsTab(value: string): value is SignificantEventsTabId {
  return significantEventsTabs.includes(value as SignificantEventsTabId);
}

export function SignificantEventsPage() {
  const {
    path: { tab },
  } = useSignificantEventsAppParams('/{tab}');

  const router = useSignificantEventsAppRouter();
  const {
    core: {
      application: {
        getUrlForApp,
        capabilities: { nightshift },
      },
      chrome,
      notifications: { toasts },
    },
    dependencies: {
      start: { share },
    },
  } = useKibana();

  const { canShow, canManageAndConfigure } = getNightshiftCapabilities(nightshift);
  const { isDeveloperMode } = useDeveloperMode();

  const { availability, isLoading: isAvailabilityLoading } = useSignificantEventsAvailability();
  const cortexAvailability = useCortexEnabled();
  const decisionTreesAvailability = useDecisionTreesEnabled();
  const memoryAvailability = useMemoryEnabled();
  const isCortexEnabled = cortexAvailability.isEnabled;
  const isDecisionTreesEnabled = decisionTreesAvailability.isEnabled;
  const isMemoryEnabled = memoryAvailability.isEnabled;

  // A gated tab reads "off" until its query answers, so wait for the URL tab's own gate
  // before redirecting; Detections is synchronous and needs no gate.
  const availabilityGateByTab: Partial<Record<SignificantEventsTabId, FeatureAvailability>> = {
    cortex: cortexAvailability,
    memory: memoryAvailability,
    decision_trees: decisionTreesAvailability,
  };
  const {
    isBlocked,
    isLoading: isMaintenanceStatusLoading,
    isError: isMaintenanceStatusError,
    status: maintenanceStatus,
  } = useBlocksNewActivity();

  const onOnboardingFailed = useCallback(
    (error: string) => {
      toasts.addError(getFormattedError(new Error(error)), {
        title: ONBOARDING_FAILURE_TITLE,
      });
    },
    [toasts]
  );

  const pageTitle = i18n.translate('xpack.significantEventsApp.pageHeaderTitle', {
    defaultMessage: 'Nightshift Management',
  });

  const nightshiftLabel = i18n.translate('xpack.significantEventsApp.nightshiftButtonLabel', {
    defaultMessage: 'Nightshift',
  });
  const settingsLabel = i18n.translate('xpack.significantEventsApp.settingsPage.title', {
    defaultMessage: 'Settings',
  });
  const nightshiftHref = getUrlForApp(NIGHTSHIFT_APP_ID);
  const settingsLocator = share.url.locators.get<NightshiftSettingsLocatorParams>(
    NIGHTSHIFT_SETTINGS_LOCATOR_ID
  );
  const settingsHref = settingsLocator?.getRedirectUrl({});
  const detectionSettingsHref = settingsLocator?.getRedirectUrl({ tab: 'detections' });

  const menu = useMemo<AppHeaderMenu | undefined>(
    () =>
      canManageAndConfigure && settingsHref
        ? {
            items: [
              {
                id: 'settings',
                order: 1,
                label: settingsLabel,
                iconType: 'gear',
                href: settingsHref,
                testId: 'nightshiftSettingsLink',
              },
            ],
          }
        : undefined,
    [canManageAndConfigure, settingsHref, settingsLabel]
  );

  useEffect(() => {
    chrome.setBreadcrumbs([
      {
        text: i18n.translate('xpack.significantEventsApp.breadcrumb', {
          defaultMessage: 'Nightshift Management',
        }),
      },
    ]);
  }, [chrome]);

  const allTabs = useMemo(
    () => [
      {
        id: 'streams',
        label: i18n.translate('xpack.significantEventsApp.streamsTab', {
          defaultMessage: 'Streams',
        }),
        href: router.link('/{tab}', { path: { tab: 'streams' } }),
        isSelected: tab === 'streams',
      },
      {
        id: 'knowledge_indicators',
        label: i18n.translate('xpack.significantEventsApp.knowledgeIndicatorsTab', {
          defaultMessage: 'Knowledge Indicators',
        }),
        href: router.link('/{tab}', { path: { tab: 'knowledge_indicators' } }),
        isSelected: tab === 'knowledge_indicators',
      },
      {
        id: 'queries',
        label: i18n.translate('xpack.significantEventsApp.queriesTab', {
          defaultMessage: 'Rules',
        }),
        href: router.link('/{tab}', { path: { tab: 'queries' } }),
        isSelected: tab === 'queries',
      },

      {
        id: 'detections',
        label: i18n.translate('xpack.significantEventsApp.detectionsTab', {
          defaultMessage: 'Detections',
        }),
        href: router.link('/{tab}', { path: { tab: 'detections' } }),
        isSelected: tab === 'detections',
        badge: { iconType: 'code' },
      },
      {
        id: SIGNIFICANT_EVENTS_TAB,
        label: i18n.translate('xpack.significantEventsApp.significantEventsTab', {
          defaultMessage: 'Significant Events',
        }),
        href: router.link('/{tab}', { path: { tab: SIGNIFICANT_EVENTS_TAB } }),
        isSelected: tab === SIGNIFICANT_EVENTS_TAB,
      },
      ...(isCortexEnabled
        ? [
            {
              id: 'cortex',
              label: i18n.translate('xpack.significantEventsApp.cortexTab', {
                defaultMessage: 'Cortex',
              }),
              href: router.link('/{tab}', { path: { tab: 'cortex' } }),
              isSelected: tab === 'cortex',
            },
          ]
        : []),
      ...(isMemoryEnabled
        ? [
            {
              id: 'memory',
              label: i18n.translate('xpack.significantEventsApp.memoryTab', {
                defaultMessage: 'Memory',
              }),
              href: router.link('/{tab}', { path: { tab: 'memory' } }),
              isSelected: tab === 'memory',
            },
          ]
        : []),
      ...(isDecisionTreesEnabled
        ? [
            {
              id: 'decision_trees',
              label: i18n.translate('xpack.significantEventsApp.decisionTreesTab', {
                defaultMessage: 'Decision Trees',
              }),
              href: router.link('/{tab}', { path: { tab: 'decision_trees' } }),
              isSelected: tab === 'decision_trees',
            },
          ]
        : []),
    ],
    [tab, router, isCortexEnabled, isMemoryEnabled, isDecisionTreesEnabled]
  );
  const tabs = useMemo(
    () => allTabs.filter((item) => item.id !== 'detections' || isDeveloperMode),
    [allTabs, isDeveloperMode]
  );

  if (isAvailabilityLoading) {
    return <SignificantEventsAppLoading />;
  }

  if (!availability || !availability.available) {
    const reason = availability?.reason ?? 'unknown';
    return (
      <SignificantEventsAppPageTemplate.Body grow>
        <SignificantEventsNotEnabledPrompt reason={reason} />
      </SignificantEventsAppPageTemplate.Body>
    );
  }

  if (tab === 'discoveries') {
    return <RedirectTo path="/{tab}" params={{ path: { tab: SIGNIFICANT_EVENTS_TAB } }} />;
  }

  if (availabilityGateByTab[tab as SignificantEventsTabId]?.isLoading) {
    return <SignificantEventsAppLoading />;
  }

  if (!isValidSignificantEventsTab(tab) || !tabs.some((item) => item.id === tab)) {
    return <RedirectTo path="/{tab}" params={{ path: { tab: tabs[0]?.id ?? 'streams' } }} />;
  }

  return (
    <>
      <SignificantEventsAppHeader
        title={pageTitle}
        back={{ href: nightshiftHref, label: nightshiftLabel }}
        menu={menu}
        tabs={tabs}
      />
      <SignificantEventsPageProvider>
        <SignificantEventsAppPageTemplate.Body grow>
          {isMaintenanceStatusLoading && (
            <>
              <KbnInfoCallout
                announceOnMount
                size="s"
                data-test-subj="significantEventsStatusLoadingBanner"
                title={i18n.translate('xpack.significantEventsApp.statusLoadingBannerTitle', {
                  defaultMessage: 'Checking significant events activity status',
                })}
                text={i18n.translate('xpack.significantEventsApp.statusLoadingBannerBody', {
                  defaultMessage: 'Manual triggers stay disabled until activity status is known.',
                })}
              />
              <EuiSpacer />
            </>
          )}
          {isMaintenanceStatusError && (
            <>
              <KbnDangerCallout
                announceOnMount
                size="s"
                data-test-subj="significantEventsStatusErrorBanner"
                title={i18n.translate('xpack.significantEventsApp.statusErrorBannerTitle', {
                  defaultMessage: 'Could not load significant events activity status',
                })}
                text={i18n.translate('xpack.significantEventsApp.statusErrorBannerBody', {
                  defaultMessage:
                    'Manual triggers stay disabled until status can be loaded. Open Settings to retry, or refresh the page.',
                })}
                actionProps={
                  canManageAndConfigure && detectionSettingsHref
                    ? {
                        primary: {
                          children: i18n.translate(
                            'xpack.significantEventsApp.statusErrorBannerSettingsButton',
                            {
                              defaultMessage: 'Go to Settings',
                            }
                          ),
                          href: detectionSettingsHref,
                          'data-test-subj': 'significantEventsStatusErrorBannerSettingsLink',
                        },
                      }
                    : undefined
                }
              />
              <EuiSpacer />
            </>
          )}
          {isBlocked && maintenanceStatus && (
            <>
              <PausedActivityCallout
                status={maintenanceStatus}
                canManageAndConfigure={canManageAndConfigure}
                settingsHref={detectionSettingsHref}
              />
              <EuiSpacer />
            </>
          )}
          <RunLimitsBanner />
          {canShow && (
            <KiGenerationProvider onFailed={onOnboardingFailed}>
              {tab === 'streams' && <StreamsView />}
              {tab === 'knowledge_indicators' && <KnowledgeIndicatorsTable />}
              {tab === 'queries' && <QueriesTable />}
            </KiGenerationProvider>
          )}
          {tab === 'detections' && <DetectionsTab />}
          {tab === SIGNIFICANT_EVENTS_TAB && <SignificantEventsTab />}
          {tab === 'cortex' && isCortexEnabled && <CortexTab />}
          {tab === 'decision_trees' && isDecisionTreesEnabled && <DecisionTreesTab />}
          {tab === 'memory' && isMemoryEnabled && <MemoryTab />}
        </SignificantEventsAppPageTemplate.Body>
      </SignificantEventsPageProvider>
    </>
  );
}
