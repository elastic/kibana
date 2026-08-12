/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { enableInspectEsQueries } from '@kbn/observability-plugin/public';
import {
  EuiBetaBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageSection,
  EuiSpacer,
  EuiTab,
  EuiTabs,
} from '@elastic/eui';
import type { NoDataConfig } from '@kbn/shared-ux-page-kibana-template';
import { AppHeader } from '@kbn/app-header';
import { useHistory, useLocation } from 'react-router-dom';
import { WebApplicationSelect } from './panels/web_application_select';
import { UserPercentile } from './user_percentile';
import { useHasRumData } from './hooks/use_has_rum_data';
import { RumDatePicker } from './rum_datepicker';
import { EmptyStateLoading } from './empty_state_loading';
import { useKibanaServices } from '../../../hooks/use_kibana_services';
import { UxEnvironmentFilter } from './environment_filter';
import { useAppMenu } from '../../../hooks/use_app_menu';
import { useUxPluginContext } from '../../../context/use_ux_plugin_context';

import { RumOverview } from '.';
import { SessionReplayPanel } from '../../session_replay/session_replay_panel';

export const DASHBOARD_LABEL = i18n.translate('xpack.ux.title', {
  defaultMessage: 'Dashboard',
});

const SESSIONS_LABEL = i18n.translate('xpack.ux.sessions.tab', {
  defaultMessage: 'Sessions',
});

export type UxHomeTab = 'dashboard' | 'session-replay';

export function RumHome({ tab }: { tab: UxHomeTab }) {
  const { docLinks, http, observabilityShared, observabilityAIAssistant, uiSettings } =
    useKibanaServices();
  const PageTemplateComponent = observabilityShared.navigation.PageTemplate;
  const { hasData, loading: isLoading, dataViewTitle } = useHasRumData();

  const noDataConfig: NoDataConfig | undefined = !hasData
    ? {
        action: {
          elasticAgent: {
            title: i18n.translate('xpack.ux.overview.beatsCard.title', {
              defaultMessage: 'Add RUM data',
            }),
            description: i18n.translate('xpack.ux.overview.beatsCard.description', {
              defaultMessage: 'Enable RUM with the APM agent to collect user experience data.',
            }),
            href: http.basePath.prepend('/app/apm/tutorial'),
            buttonText: i18n.translate('xpack.ux.overview.beatsCard.buttonLabel', {
              defaultMessage: 'Add RUM data',
            }),
            docsLink: docLinks.links.observability.guide,
            'data-test-subj': 'rumNoDataCard',
          },
        },
      }
    : undefined;

  let screenDescription = '';

  if (!hasData) {
    screenDescription = `The user is looking at a Getting Started screen that is displayed because no data could be retrieved.`;
  }
  if (dataViewTitle) {
    screenDescription = `${screenDescription} The index that was used to query the system is called ${dataViewTitle}.`;
  } else {
    screenDescription = `${screenDescription} The index that was used to query the system is undefined, so it is not configured yet.`;
  }

  const { isDev } = useUxPluginContext();
  const enableInspector = isDev || uiSettings.get<boolean>(enableInspectEsQueries);
  const { appMenu } = useAppMenu(enableInspector);

  useEffect(() => {
    return observabilityAIAssistant?.service.setScreenContext({
      screenDescription,
      starterPrompts: [
        ...(!hasData
          ? [
              {
                title: i18n.translate('xpack.ux.aiAssistant.starterPrompts.explainNoData.title', {
                  defaultMessage: 'Explain',
                }),
                prompt: i18n.translate('xpack.ux.aiAssistant.starterPrompts.explainNoData.prompt', {
                  defaultMessage: "Why don't I see any data?",
                }),
                icon: 'sparkles',
              },
            ]
          : []),
      ],
    });
  }, [hasData, observabilityAIAssistant?.service, screenDescription]);

  const headerTitle =
    tab === 'session-replay'
      ? i18n.translate('xpack.ux.home.sessionsTitle', {
          defaultMessage: 'Sessions',
        })
      : DASHBOARD_LABEL;

  return (
    <PageTemplateComponent
      noDataConfig={isLoading ? undefined : noDataConfig}
      isPageDataLoaded={isLoading === false}
      pageSectionProps={{
        paddingSize: 'none',
      }}
    >
      <AppHeader title={headerTitle} menu={appMenu} spacing="standard" />

      <EuiPageSection paddingSize="m" restrictWidth={false}>
        <DashboardToolbar tab={tab} />
        {isLoading && tab === 'dashboard' && <EmptyStateLoading />}
        <div style={{ visibility: isLoading && tab === 'dashboard' ? 'hidden' : 'initial' }}>
          {tab === 'dashboard' ? <RumOverview /> : <SessionReplayPanel />}
        </div>
      </EuiPageSection>
    </PageTemplateComponent>
  );
}

function DashboardToolbar({ tab }: { tab: UxHomeTab }) {
  const history = useHistory();
  const location = useLocation();

  return (
    <>
      <EuiFlexGroup wrap>
        <EuiFlexItem>
          <WebApplicationSelect />
        </EuiFlexItem>
        {tab === 'dashboard' && (
          <EuiFlexItem>
            <UserPercentile />
          </EuiFlexItem>
        )}
        <EuiFlexItem>
          <UxEnvironmentFilter />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <RumDatePicker />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiTabs>
        <EuiTab
          isSelected={tab === 'dashboard'}
          href={history.createHref({ pathname: '/', search: location.search })}
          onClick={(e: React.MouseEvent) => {
            e.preventDefault();
            history.push({ pathname: '/', search: location.search });
          }}
          data-test-subj="uxDashboardTab"
        >
          {DASHBOARD_LABEL}
        </EuiTab>
        <EuiTab
          isSelected={tab === 'session-replay'}
          href={history.createHref({ pathname: '/session-replay', search: location.search })}
          onClick={(e: React.MouseEvent) => {
            e.preventDefault();
            history.push({ pathname: '/session-replay', search: location.search });
          }}
          data-test-subj="uxSessionReplayTab"
        >
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>{SESSIONS_LABEL}</EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBetaBadge
                label={i18n.translate('xpack.ux.sessionReplay.experimentalBadge', {
                  defaultMessage: 'Technical preview',
                })}
                tooltipContent={i18n.translate('xpack.ux.sessionReplay.experimentalTooltip', {
                  defaultMessage:
                    'Sessions and Session Replay are an experimental POC and may change or be removed.',
                })}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiTab>
      </EuiTabs>
      <EuiSpacer size="m" />
    </>
  );
}
