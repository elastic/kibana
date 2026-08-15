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
import { useHasRumData } from './hooks/use_has_rum_data';
import { RumDatePicker } from './rum_datepicker';
import { EmptyStateLoading } from './empty_state_loading';
import { useKibanaServices } from '../../../hooks/use_kibana_services';
import { UxEnvironmentFilter } from './environment_filter';
import { useAppMenu } from '../../../hooks/use_app_menu';
import { useUxPluginContext } from '../../../context/use_ux_plugin_context';
import { RumOverviewV2 } from '../rum_overview';
import { RumPagesPanel } from '../rum_pages';
import { RumErrorsPanel } from '../rum_errors';
import { RumReportsCatalog } from '../rum_reports';
import { RumReportPrintStyles } from '../rum_reports/print.styles';
import { RumReportView } from '../rum_reports/report_view';
import { RumAiPanel } from './rum_ai_panel';
import { RumAlertsPanel } from '../rum_alerts';
import { RumAlertFlyoutProvider } from '../rum_alerts/alert_flyout_context';
import { RumBudgetsPanel } from '../rum_budgets';
import { RumBudgetFlyoutProvider } from '../rum_budgets/budget_flyout_context';
import { SessionReplayPanel } from '../../session_replay/session_replay_panel';
import { SessionFunnelPanel } from '../../session_replay/session_funnel_panel';
import { OtelFilterBar } from '../rum_filters/otel_filter_bar';
import { RumKueryBar } from '../rum_filters/rum_kuery_bar';
import { AnalyticsStatusBanner } from './analytics_status_banner';

export const DASHBOARD_LABEL = i18n.translate('xpack.ux.overview.tab', {
  defaultMessage: 'Overview',
});

const PAGES_LABEL = i18n.translate('xpack.ux.pages.tab', {
  defaultMessage: 'Pages',
});

const ERRORS_LABEL = i18n.translate('xpack.ux.errors.tab', {
  defaultMessage: 'Errors',
});

const SESSIONS_LABEL = i18n.translate('xpack.ux.sessions.tab', {
  defaultMessage: 'Sessions',
});

const JOURNEYS_LABEL = i18n.translate('xpack.ux.journeys.tab', {
  defaultMessage: 'Journeys',
});

const REPORTS_LABEL = i18n.translate('xpack.ux.reports.tab', {
  defaultMessage: 'Reporting',
});

const AI_LABEL = i18n.translate('xpack.ux.ai.tab', {
  defaultMessage: 'AI Analyst',
});

const ALERTS_LABEL = i18n.translate('xpack.ux.alerts.tab', {
  defaultMessage: 'Alerts',
});

const BUDGETS_LABEL = i18n.translate('xpack.ux.budgets.tabLabel', {
  defaultMessage: 'Budgets',
});

export type UxHomeTab =
  | 'overview'
  | 'pages'
  | 'errors'
  | 'session-replay'
  | 'journeys'
  | 'reports'
  | 'ai'
  | 'alerts'
  | 'budgets';

export function RumHome({ tab, templateId }: { tab: UxHomeTab; templateId?: string }) {
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

  return (
    <PageTemplateComponent
      noDataConfig={isLoading ? undefined : noDataConfig}
      isPageDataLoaded={isLoading === false}
      pageSectionProps={{
        paddingSize: 'none',
      }}
    >
      <AppHeader
        title={i18n.translate('xpack.ux.home.title', {
          defaultMessage: 'User Experience',
        })}
        menu={appMenu}
        spacing="standard"
      />

      <EuiPageSection paddingSize="m" restrictWidth={false}>
        <DashboardToolbar tab={tab} />
        {tab === 'reports' && <RumReportPrintStyles />}
        {isLoading && tab === 'overview' && <EmptyStateLoading />}
        <RumAlertFlyoutProvider>
          <RumBudgetFlyoutProvider>
            <div style={{ visibility: isLoading && tab === 'overview' ? 'hidden' : 'initial' }}>
              <AnalyticsStatusBanner />
              {tab === 'overview' && <RumOverviewV2 />}
              {tab === 'pages' && <RumPagesPanel />}
              {tab === 'errors' && <RumErrorsPanel />}
              {tab === 'session-replay' && <SessionReplayPanel />}
              {tab === 'journeys' && <SessionFunnelPanel />}
              {tab === 'reports' &&
                (templateId ? <RumReportView templateId={templateId} /> : <RumReportsCatalog />)}
              {tab === 'ai' && <RumAiPanel />}
              {tab === 'alerts' && <RumAlertsPanel />}
              {tab === 'budgets' && <RumBudgetsPanel />}
            </div>
          </RumBudgetFlyoutProvider>
        </RumAlertFlyoutProvider>
      </EuiPageSection>
    </PageTemplateComponent>
  );
}

function DashboardToolbar({ tab }: { tab: UxHomeTab }) {
  const history = useHistory();
  const location = useLocation();

  const tabHref = (pathname: string) => ({
    href: history.createHref({ pathname, search: location.search }),
    onClick: (e: React.MouseEvent) => {
      e.preventDefault();
      history.push({ pathname, search: location.search });
    },
  });

  return (
    <div className={tab === 'reports' ? 'uxRumReportNoPrint' : undefined}>
      <EuiFlexGroup gutterSize="m" alignItems="center" justifyContent="spaceBetween" wrap>
        <EuiFlexItem grow={false}>
          <EuiBetaBadge
            label={i18n.translate('xpack.ux.sessionReplay.experimentalBadge', {
              defaultMessage: 'Technical preview',
            })}
            tooltipContent={i18n.translate('xpack.ux.sessionReplay.experimentalTooltip', {
              defaultMessage:
                'OTel-first RUM views, sessions, journeys, and Session Replay are an experimental POC and may change or be removed.',
            })}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false} style={{ marginLeft: 'auto' }}>
          <RumDatePicker />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="m" alignItems="center" wrap>
        <EuiFlexItem grow={false} style={{ minWidth: 200, maxWidth: 260 }}>
          <WebApplicationSelect />
        </EuiFlexItem>
        <EuiFlexItem grow={true} style={{ minWidth: 280 }}>
          <RumKueryBar />
        </EuiFlexItem>
        <UxEnvironmentFilter />
        <EuiFlexItem grow={false}>
          <OtelFilterBar />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiTabs>
        <EuiTab isSelected={tab === 'overview'} data-test-subj="uxDashboardTab" {...tabHref('/')}>
          {DASHBOARD_LABEL}
        </EuiTab>
        <EuiTab isSelected={tab === 'pages'} data-test-subj="uxPagesTab" {...tabHref('/pages')}>
          {PAGES_LABEL}
        </EuiTab>
        <EuiTab isSelected={tab === 'errors'} data-test-subj="uxErrorsTab" {...tabHref('/errors')}>
          {ERRORS_LABEL}
        </EuiTab>
        <EuiTab
          isSelected={tab === 'session-replay'}
          data-test-subj="uxSessionReplayTab"
          {...tabHref('/session-replay')}
        >
          {SESSIONS_LABEL}
        </EuiTab>
        <EuiTab
          isSelected={tab === 'journeys'}
          data-test-subj="uxFunnelsTab"
          {...tabHref('/journeys')}
        >
          {JOURNEYS_LABEL}
        </EuiTab>
        <EuiTab
          isSelected={tab === 'reports'}
          data-test-subj="uxReportsTab"
          {...tabHref('/reports')}
        >
          {REPORTS_LABEL}
        </EuiTab>
        <EuiTab isSelected={tab === 'ai'} data-test-subj="uxAiTab" {...tabHref('/ai')}>
          {AI_LABEL}
        </EuiTab>
        <EuiTab isSelected={tab === 'alerts'} data-test-subj="uxAlertsTab" {...tabHref('/alerts')}>
          {ALERTS_LABEL}
        </EuiTab>
        <EuiTab
          isSelected={tab === 'budgets'}
          data-test-subj="uxBudgetsTab"
          {...tabHref('/budgets')}
        >
          {BUDGETS_LABEL}
        </EuiTab>
      </EuiTabs>
      <EuiSpacer size="m" />
    </div>
  );
}
