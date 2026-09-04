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
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageSection,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import type { NoDataConfig } from '@kbn/shared-ux-page-kibana-template';
import { AppHeader } from '@kbn/app-header';
import { useHistory, useLocation } from 'react-router-dom';
import { UX_APP_TITLE } from '../../../application/ux_breadcrumbs';
import { useLegacyUrlParams } from '../../../context/url_params_context/use_url_params';
import { pushRumPath, uxAppHref } from '../../../utils/rum_search';
import { serviceNameFromPath, uxAppPath } from '../../../utils/ux_app_path';
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
import { ConversionFunnelPage } from '../../session_replay/conversion_goal_panel';
import { OtelFilterBar } from '../rum_filters/otel_filter_bar';
import { RumKueryBar } from '../rum_filters/rum_kuery_bar';
import { RumPageLoadingBar, RumPageLoadingProvider } from './rum_page_loading';
import { UxTourAnchor } from '../rum_tour/ux_tour_anchor';
import { UxProductTour } from '../rum_tour/ux_tour_context';
import { ConvertToDashboardButton } from '../rum_overview/dashboard_actions';

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

const FUNNELS_LABEL = i18n.translate('xpack.ux.funnels.tab', {
  defaultMessage: 'Funnels',
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
  | 'funnels'
  | 'reports'
  | 'ai'
  | 'alerts'
  | 'budgets';

export function RumHome({ tab, templateId }: { tab: UxHomeTab; templateId?: string }) {
  const { docLinks, http, observabilityShared, observabilityAIAssistant, uiSettings } =
    useKibanaServices();
  const PageTemplateComponent = observabilityShared.navigation.PageTemplate;
  const { hasData, loading: isLoading, dataViewTitle } = useHasRumData();
  const {
    urlParams: { serviceName },
  } = useLegacyUrlParams();

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
    <RumPageLoadingProvider>
      <PageTemplateComponent
        noDataConfig={isLoading ? undefined : noDataConfig}
        isPageDataLoaded={isLoading === false}
        pageSectionProps={{
          paddingSize: 'none',
        }}
      >
        <AppHeader title={serviceName || UX_APP_TITLE} menu={appMenu} spacing="standard" />

        <EuiPageSection paddingSize="m" restrictWidth={false}>
          <DashboardToolbar tab={tab} />
          {tab === 'reports' && <RumReportPrintStyles />}
          {isLoading && tab === 'overview' && <EmptyStateLoading />}
          <RumAlertFlyoutProvider>
            <RumBudgetFlyoutProvider>
              <div style={{ visibility: isLoading && tab === 'overview' ? 'hidden' : 'initial' }}>
                {tab === 'overview' && <RumOverviewV2 />}
                {tab === 'pages' && <RumPagesPanel />}
                {tab === 'errors' && <RumErrorsPanel />}
                {tab === 'session-replay' && <SessionReplayPanel />}
                {tab === 'journeys' && <SessionFunnelPanel />}
                {tab === 'funnels' && <ConversionFunnelPage />}
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
    </RumPageLoadingProvider>
  );
}

function InventoryBackButton() {
  const history = useHistory();
  const { search } = useLocation();
  const { http } = useKibanaServices();
  const href = uxAppHref(http.basePath.prepend, { search });
  const tooltip = i18n.translate('xpack.ux.home.backToInventoryTooltip', {
    defaultMessage: 'to {destination}',
    values: { destination: UX_APP_TITLE },
  });

  return (
    <EuiToolTip content={tooltip} disableScreenReaderOutput>
      <EuiButtonIcon
        iconType="sortLeft"
        color="text"
        display="base"
        size="s"
        href={href}
        aria-label={tooltip}
        data-test-subj="uxAppInventoryBackButton"
        onClick={(event) => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
            return;
          }
          event.preventDefault();
          pushRumPath(history, '/', { serviceName: '' });
        }}
      />
    </EuiToolTip>
  );
}

function AppSettingsButton() {
  const history = useHistory();
  const { pathname, search } = useLocation();
  const { http } = useKibanaServices();
  const href = uxAppHref(http.basePath.prepend, {
    search,
    serviceName: serviceNameFromPath(pathname),
    suffix: '/settings',
  });
  const tooltip = i18n.translate('xpack.ux.home.settingsTooltip', {
    defaultMessage: 'Settings',
  });

  return (
    <EuiToolTip content={tooltip} disableScreenReaderOutput>
      <EuiButtonIcon
        iconType="gear"
        color="text"
        display="base"
        size="s"
        href={href}
        aria-label={tooltip}
        data-test-subj="uxAppSettingsButton"
        onClick={(event) => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
            return;
          }
          event.preventDefault();
          pushRumPath(history, '/settings');
        }}
      />
    </EuiToolTip>
  );
}

function DashboardToolbar({ tab }: { tab: UxHomeTab }) {
  const {
    urlParams: { serviceName },
  } = useLegacyUrlParams();

  return (
    <div className={tab === 'reports' ? 'uxRumReportNoPrint' : undefined}>
      <EuiFlexGroup gutterSize="m" alignItems="center" justifyContent="spaceBetween" wrap>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <InventoryBackButton />
            </EuiFlexItem>
            {serviceName ? (
              <EuiFlexItem grow={false}>
                <EuiTitle>
                  <h1 className="eui-textNoWrap">{serviceName}</h1>
                </EuiTitle>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false} style={{ marginLeft: 'auto' }}>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <UxProductTour />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <AppSettingsButton />
            </EuiFlexItem>
            {tab === 'overview' ? (
              <EuiFlexItem grow={false}>
                <ConvertToDashboardButton />
              </EuiFlexItem>
            ) : null}
            <EuiFlexItem grow={false}>
              <RumDatePicker />
            </EuiFlexItem>
          </EuiFlexGroup>
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
      <div style={{ position: 'relative' }}>
        <UxHomeTabs tab={tab} />
        <RumPageLoadingBar />
      </div>
      <EuiSpacer size="m" />
    </div>
  );
}

function UxHomeTabs({ tab }: { tab: UxHomeTab }) {
  const history = useHistory();
  const location = useLocation();
  const serviceName = serviceNameFromPath(location.pathname);

  const tabHref = (suffix: string) => {
    const pathname = uxAppPath(serviceName, suffix === '/' ? '' : suffix);
    return {
      href: history.createHref({ pathname, search: location.search }),
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        history.push({ pathname, search: location.search });
      },
    };
  };

  return (
    <div data-test-subj="uxHomeTabs">
      <EuiTabs>
        <EuiTab isSelected={tab === 'overview'} data-test-subj="uxDashboardTab" {...tabHref('/')}>
          {DASHBOARD_LABEL}
        </EuiTab>
        <EuiTab
          isSelected={tab === 'session-replay'}
          data-test-subj="uxSessionReplayTab"
          {...tabHref('/session-replay')}
        >
          <UxTourAnchor stepId="sessions">
            <span>{SESSIONS_LABEL}</span>
          </UxTourAnchor>
        </EuiTab>
        <EuiTab isSelected={tab === 'pages'} data-test-subj="uxPagesTab" {...tabHref('/pages')}>
          {PAGES_LABEL}
        </EuiTab>
        <EuiTab isSelected={tab === 'errors'} data-test-subj="uxErrorsTab" {...tabHref('/errors')}>
          {ERRORS_LABEL}
        </EuiTab>
        <EuiTab
          isSelected={tab === 'journeys'}
          data-test-subj="uxJourneysTab"
          {...tabHref('/journeys')}
        >
          {JOURNEYS_LABEL}
        </EuiTab>
        <EuiTab
          isSelected={tab === 'funnels'}
          data-test-subj="uxFunnelsTab"
          {...tabHref('/funnels')}
        >
          {FUNNELS_LABEL}
        </EuiTab>
        <EuiTab isSelected={tab === 'ai'} data-test-subj="uxAiTab" {...tabHref('/ai')}>
          {AI_LABEL}
        </EuiTab>
        <EuiTab
          isSelected={tab === 'budgets'}
          data-test-subj="uxBudgetsTab"
          {...tabHref('/budgets')}
        >
          {BUDGETS_LABEL}
        </EuiTab>
        <EuiTab isSelected={tab === 'alerts'} data-test-subj="uxAlertsTab" {...tabHref('/alerts')}>
          {ALERTS_LABEL}
        </EuiTab>
        <EuiTab
          isSelected={tab === 'reports'}
          data-test-subj="uxReportsTab"
          {...tabHref('/reports')}
        >
          {REPORTS_LABEL}
        </EuiTab>
      </EuiTabs>
    </div>
  );
}
