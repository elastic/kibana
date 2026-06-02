/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiIcon, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { LocatorPublic } from '@kbn/share-plugin/public';
import type { LogsLocatorParams } from '@kbn/logs-shared-plugin/common';
import type { DashboardLocatorParams } from '@kbn/dashboard-plugin/common';
import type { AssetDetailsLocatorParams } from '@kbn/observability-shared-plugin/common';
import type { InstalledIntegration } from '../../../../../server/routes/types';
import { DASHBOARDS } from '../use_onboarding_flow';
import { ProgressIndicator } from '../../shared/progress_indicator';
import { AccordionWithIcon } from '../../shared/accordion_with_icon';
import { GetStartedPanel } from '../../shared/get_started_panel';
import { isSupportedLogo, LogoIcon } from '../../../shared/logo_icon';
import { WIRED_ECS_DATA_VIEW_SPEC } from '../../shared/wired_streams_data_view';

export interface AutoDetectVisualizeStepProps {
  status: 'notStarted' | 'inProgress' | 'awaitingData' | 'dataReceived';
  installedIntegrations: InstalledIntegration[];
  onboardingFlowId?: string;
  useWiredStreams: boolean;
  isMetricsOnboardingEnabled: boolean;
  accordionId: string;
  logsLocator: LocatorPublic<LogsLocatorParams> | undefined;
  dashboardLocator: LocatorPublic<DashboardLocatorParams> | undefined;
  assetDetailsLocator: LocatorPublic<AssetDetailsLocatorParams> | undefined;
}

export const AutoDetectVisualizeStep: React.FC<AutoDetectVisualizeStepProps> = ({
  status,
  installedIntegrations,
  onboardingFlowId,
  useWiredStreams,
  isMetricsOnboardingEnabled,
  accordionId,
  logsLocator,
  dashboardLocator,
  assetDetailsLocator,
}) => {
  const registryIntegrations = installedIntegrations.filter(
    (integration) => integration.installSource === 'registry'
  );
  const customIntegrations = installedIntegrations.filter(
    (integration) => integration.installSource === 'custom'
  );

  return (
    <>
      {status === 'dataReceived' ? (
        <ProgressIndicator
          iconType="popper"
          title={i18n.translate(
            'xpack.observability_onboarding.autoDetectPanel.yourDataIsReadyToExploreLabel',
            { defaultMessage: 'Your data is ready to explore!' }
          )}
          isLoading={false}
          data-test-subj="observabilityOnboardingAutoDetectPanelDataReceivedProgressIndicator"
        />
      ) : status === 'awaitingData' ? (
        <ProgressIndicator
          title={i18n.translate(
            'xpack.observability_onboarding.autoDetectPanel.installingElasticAgentFlexItemLabel',
            { defaultMessage: 'Waiting for data to arrive...' }
          )}
          data-test-subj="observabilityOnboardingAutoDetectPanelAwaitingDataProgressIndicator"
        />
      ) : status === 'inProgress' ? (
        <ProgressIndicator
          title={i18n.translate(
            'xpack.observability_onboarding.autoDetectPanel.lookingForLogFilesFlexItemLabel',
            { defaultMessage: 'Waiting for installation to complete...' }
          )}
          data-test-subj="observabilityOnboardingAutoDetectPanelInProgressProgressIndicator"
        />
      ) : null}
      {(status === 'awaitingData' || status === 'dataReceived') &&
      installedIntegrations.length > 0 ? (
        <>
          <EuiSpacer />
          {registryIntegrations
            .slice()
            /**
             * System integration should always be on top
             */
            .sort((a, b) => (a.pkgName === 'system' ? -1 : 0))
            .map((integration) => {
              let actionLinks;

              switch (integration.pkgName) {
                case 'system':
                  actionLinks =
                    isMetricsOnboardingEnabled && assetDetailsLocator !== undefined
                      ? [
                          {
                            id: 'inventory-host-details',
                            title: i18n.translate(
                              'xpack.observability_onboarding.autoDetectPanel.systemOverviewTitle',
                              {
                                defaultMessage:
                                  'Overview your system health within the Hosts Inventory',
                              }
                            ),
                            label: i18n.translate(
                              'xpack.observability_onboarding.autoDetectPanel.systemOverviewLabel',
                              {
                                defaultMessage: 'Explore metrics data',
                              }
                            ),
                            // Empty entityId falls back to the hosts inventory page.
                            href: assetDetailsLocator.getRedirectUrl({
                              entityType: 'host',
                              entityId: integration.metadata?.hostname ?? '',
                              assetDetails: {
                                dateRange: {
                                  from: 'now-15m',
                                  to: 'now',
                                },
                              },
                            }),
                          },
                        ]
                      : [
                          {
                            id: 'inventory-host-details',
                            title: i18n.translate(
                              'xpack.observability_onboarding.autoDetectPanel.systemLogsTitle',
                              {
                                defaultMessage: 'View and analyze system logs',
                              }
                            ),
                            label: i18n.translate(
                              'xpack.observability_onboarding.autoDetectPanel.systemLogsLabel',
                              {
                                defaultMessage: 'Explore logs',
                              }
                            ),
                            href:
                              logsLocator?.getRedirectUrl({
                                dataViewSpec: {
                                  name: integration.pkgName,
                                  title: `logs-system*`,
                                  timeFieldName: '@timestamp',
                                },
                              }) ?? '',
                          },
                        ];
                  break;
                default:
                  actionLinks =
                    dashboardLocator !== undefined && logsLocator !== undefined
                      ? integration.kibanaAssets
                          .filter((asset) => asset.type === 'dashboard')
                          .map((asset) => {
                            const dashboard = DASHBOARDS[asset.id as keyof typeof DASHBOARDS];

                            if (dashboard.type === 'metrics' && !isMetricsOnboardingEnabled) {
                              return {
                                id: asset.id,
                                title: i18n.translate(
                                  'xpack.observability_onboarding.autoDetectPanel.exploreLogsDataDiscoverTitle',
                                  {
                                    defaultMessage: 'View and analyze your logs',
                                  }
                                ),
                                label: i18n.translate(
                                  'xpack.observability_onboarding.autoDetectPanel.exploreLogsDiscoverDataLabel',
                                  {
                                    defaultMessage: 'Explore logs',
                                  }
                                ),
                                href: logsLocator.getRedirectUrl({
                                  dataViewSpec: {
                                    name: integration.pkgName,
                                    title: `logs-${integration.pkgName}*`,
                                    timeFieldName: '@timestamp',
                                  },
                                }),
                              };
                            }

                            return {
                              id: asset.id,
                              title:
                                dashboard.type === 'metrics'
                                  ? i18n.translate(
                                      'xpack.observability_onboarding.autoDetectPanel.exploreMetricsDataTitle',
                                      {
                                        defaultMessage:
                                          'Overview your metrics data with this pre-made dashboard',
                                      }
                                    )
                                  : i18n.translate(
                                      'xpack.observability_onboarding.autoDetectPanel.exploreLogsDataTitle',
                                      {
                                        defaultMessage:
                                          'Overview your logs data with this pre-made dashboard',
                                      }
                                    ),
                              label:
                                dashboard.type === 'metrics'
                                  ? i18n.translate(
                                      'xpack.observability_onboarding.autoDetectPanel.exploreMetricsDataLabel',
                                      {
                                        defaultMessage: 'Explore metrics data',
                                      }
                                    )
                                  : i18n.translate(
                                      'xpack.observability_onboarding.autoDetectPanel.exploreLogsDataLabel',
                                      {
                                        defaultMessage: 'Explore logs data',
                                      }
                                    ),
                              href: dashboardLocator.getRedirectUrl({
                                dashboardId: asset.id,
                              }),
                            };
                          })
                      : [];
              }

              return (
                <AccordionWithIcon
                  key={integration.pkgName}
                  id={`${accordionId}_${integration.pkgName}`}
                  icon={
                    isSupportedLogo(integration.pkgName) ? (
                      <LogoIcon size="l" logo={integration.pkgName} />
                    ) : (
                      <EuiIcon type="display" size="l" aria-hidden />
                    )
                  }
                  title={i18n.translate(
                    'xpack.observability_onboarding.autoDetectPanel.h3.getStartedWithNginxLabel',
                    {
                      defaultMessage: 'Get started with {title}',
                      values: { title: integration.title },
                    }
                  )}
                  isDisabled={status !== 'dataReceived'}
                  initialIsOpen
                >
                  <GetStartedPanel
                    onboardingFlowType="auto-detect"
                    dataset={integration.pkgName}
                    onboardingId={onboardingFlowId}
                    telemetryEventContext={{
                      autoDetect: {
                        installSource: integration.installSource,
                        pkgVersion: integration.pkgVersion,
                        title: integration.title,
                      },
                    }}
                    integration={integration.pkgName}
                    newTab
                    isLoading={status !== 'dataReceived'}
                    actionLinks={actionLinks}
                  />
                </AccordionWithIcon>
              );
            })}
          {customIntegrations.length > 0 && (
            <AccordionWithIcon
              id={`${accordionId}_custom`}
              icon={<EuiIcon type="documents" size="l" aria-hidden />}
              title={i18n.translate(
                'xpack.observability_onboarding.autoDetectPanel.h3.getStartedWithlogLabel',
                { defaultMessage: 'Get started with custom .log files' }
              )}
              isDisabled={status !== 'dataReceived'}
              initialIsOpen
            >
              <ul>
                {customIntegrations.map((integration) =>
                  integration.dataStreams.map((datastream) => (
                    <li key={`${integration.pkgName}/${datastream.dataset}`}>
                      <EuiButtonEmpty
                        data-test-subj="observabilityOnboardingAutoDetectPanelButton"
                        href={
                          logsLocator?.getRedirectUrl(
                            useWiredStreams
                              ? {
                                  dataViewSpec: WIRED_ECS_DATA_VIEW_SPEC,
                                  query: {
                                    language: 'kuery',
                                    query: `service.name: "${integration.pkgName}"`,
                                  },
                                }
                              : {
                                  dataViewSpec: {
                                    name: integration.pkgName,
                                    title: `${datastream.type}-${datastream.dataset}-*`,
                                    timeFieldName: '@timestamp',
                                  },
                                }
                          ) ?? ''
                        }
                        target="_blank"
                        iconType="document"
                        isDisabled={status !== 'dataReceived'}
                        flush="left"
                        size="s"
                      >
                        {integration.pkgName}
                      </EuiButtonEmpty>
                    </li>
                  ))
                )}
              </ul>
            </AccordionWithIcon>
          )}
        </>
      ) : null}
    </>
  );
};
