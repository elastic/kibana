/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import { usePerformanceContext } from '@kbn/ebt-tools';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiEmptyPrompt,
  EuiPanel,
  EuiSpacer,
  EuiTabbedContent,
  EuiLoadingSpinner,
  EuiTabbedContentTab,
  useEuiTheme,
  EuiFlexGroup,
} from '@elastic/eui';
import {
  AlertStatus,
  ALERT_RULE_CATEGORY,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_UUID,
  ALERT_STATUS,
  ALERT_STATUS_UNTRACKED,
} from '@kbn/rule-data-utils';
import { RuleTypeModel } from '@kbn/triggers-actions-ui-plugin/public';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import dedent from 'dedent';
import { AlertFieldsTable } from '@kbn/alerts-ui-shared/src/alert_fields_table';
import { css } from '@emotion/react';
import { omit } from 'lodash';
import { BetaBadge } from '../../components/experimental_badge';
import { RelatedAlerts } from './components/related_alerts';
import { AlertDetailsSource } from './types';
import { SourceBar } from './components';
import { StatusBar } from './components/status_bar';
import { observabilityFeatureId } from '../../../common';
import { useKibana } from '../../utils/kibana_react';
import { useFetchRule } from '../../hooks/use_fetch_rule';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { AlertData, useFetchAlertDetail } from '../../hooks/use_fetch_alert_detail';
import { HeaderActions } from './components/header_actions';
import { CenterJustifiedSpinner } from '../../components/center_justified_spinner';
import { getTimeZone } from '../../utils/get_time_zone';
import { isAlertDetailsEnabledPerApp } from '../../utils/is_alert_details_enabled';
import { paths } from '../../../common/locators/paths';
import { HeaderMenu } from '../overview/components/header_menu/header_menu';
import { AlertOverview } from '../../components/alert_overview/alert_overview';
import { CustomThresholdRule } from '../../components/custom_threshold/components/types';
import { AlertDetailContextualInsights } from './alert_details_contextual_insights';
import { AlertHistoryChart } from './components/alert_history';

interface AlertDetailsPathParams {
  alertId: string;
}

export const ALERT_DETAILS_PAGE_ID = 'alert-details-o11y';
const defaultBreadcrumb = i18n.translate('xpack.observability.breadcrumbs.alertDetails', {
  defaultMessage: 'Alert details',
});

export const LOG_DOCUMENT_COUNT_RULE_TYPE_ID = 'logs.alert.document.count';
export const METRIC_THRESHOLD_ALERT_TYPE_ID = 'metrics.alert.threshold';
export const METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID = 'metrics.alert.inventory.threshold';

const OVERVIEW_TAB_ID = 'overview';
const METADATA_TAB_ID = 'metadata';
const RELATED_ALERTS_TAB_ID = 'related_alerts';
const ALERT_DETAILS_TAB_URL_STORAGE_KEY = 'tabId';
type TabId = typeof OVERVIEW_TAB_ID | typeof METADATA_TAB_ID | typeof RELATED_ALERTS_TAB_ID;

export const getPageTitle = (ruleCategory: string) => {
  return i18n.translate('xpack.observability.pages.alertDetails.pageTitle.title', {
    defaultMessage:
      '{ruleCategory} {ruleCategory, select, Anomaly {detected} Inventory {threshold breached} other {breached}}',
    values: {
      ruleCategory,
    },
  });
};

export function AlertDetails() {
  const {
    cases: {
      helpers: { canUseCases },
      ui: { getCasesContext },
    },
    http,
    triggersActionsUi: { ruleTypeRegistry },
    observabilityAIAssistant,
    uiSettings,
    serverless,
  } = useKibana().services;
  const { onPageReady } = usePerformanceContext();

  const { search } = useLocation();
  const history = useHistory();
  const { ObservabilityPageTemplate, config } = usePluginContext();
  const { alertId } = useParams<AlertDetailsPathParams>();
  const [isLoading, alertDetail] = useFetchAlertDetail(alertId);
  const [ruleTypeModel, setRuleTypeModel] = useState<RuleTypeModel | null>(null);
  const CasesContext = getCasesContext();
  const userCasesPermissions = canUseCases([observabilityFeatureId]);
  const ruleId = alertDetail?.formatted.fields[ALERT_RULE_UUID];
  const { rule } = useFetchRule({
    ruleId,
  });
  const [alertStatus, setAlertStatus] = useState<AlertStatus>();
  const { euiTheme } = useEuiTheme();

  const [sources, setSources] = useState<AlertDetailsSource[]>();
  const [activeTabId, setActiveTabId] = useState<TabId>(() => {
    const searchParams = new URLSearchParams(search);
    const urlTabId = searchParams.get(ALERT_DETAILS_TAB_URL_STORAGE_KEY);

    return urlTabId && [OVERVIEW_TAB_ID, METADATA_TAB_ID, RELATED_ALERTS_TAB_ID].includes(urlTabId)
      ? (urlTabId as TabId)
      : OVERVIEW_TAB_ID;
  });
  const handleSetTabId = async (tabId: TabId) => {
    setActiveTabId(tabId);

    let searchParams = new URLSearchParams(search);
    if (tabId === RELATED_ALERTS_TAB_ID) {
      searchParams.set(ALERT_DETAILS_TAB_URL_STORAGE_KEY, tabId);
    } else {
      searchParams = new URLSearchParams();
      searchParams.set(ALERT_DETAILS_TAB_URL_STORAGE_KEY, tabId);
    }
    history.replace({ search: searchParams.toString() });
  };

  useEffect(() => {
    if (!alertDetail || !observabilityAIAssistant) {
      return;
    }

    const screenDescription = getScreenDescription(alertDetail);

    return observabilityAIAssistant.service.setScreenContext({
      screenDescription,
      data: [
        {
          name: 'alert_fields',
          description: 'The fields and values for the alert',
          value: getRelevantAlertFields(alertDetail),
        },
      ],
    });
  }, [observabilityAIAssistant, alertDetail]);

  useEffect(() => {
    if (alertDetail) {
      setRuleTypeModel(ruleTypeRegistry.get(alertDetail?.formatted.fields[ALERT_RULE_TYPE_ID]!));
      setAlertStatus(alertDetail?.formatted?.fields[ALERT_STATUS] as AlertStatus);
    }
  }, [alertDetail, ruleTypeRegistry]);

  useBreadcrumbs(
    [
      {
        href: http.basePath.prepend(paths.observability.alerts),
        text: i18n.translate('xpack.observability.breadcrumbs.alertsLinkText', {
          defaultMessage: 'Alerts',
        }),
        deepLinkId: 'observability-overview:alerts',
      },
      {
        text: alertDetail
          ? getPageTitle(alertDetail.formatted.fields[ALERT_RULE_CATEGORY])
          : defaultBreadcrumb,
      },
    ],
    { serverless }
  );

  const onUntrackAlert = () => {
    setAlertStatus(ALERT_STATUS_UNTRACKED);
  };

  useEffect(() => {
    if (!isLoading && !!alertDetail && activeTabId === OVERVIEW_TAB_ID) {
      onPageReady();
    }
  }, [onPageReady, alertDetail, isLoading, activeTabId]);

  if (isLoading) {
    return <CenterJustifiedSpinner />;
  }

  if (!isLoading && !alertDetail)
    return (
      <EuiPanel data-test-subj="alertDetailsError">
        <EuiEmptyPrompt
          iconType="warning"
          color="danger"
          title={
            <h2>
              {i18n.translate('xpack.observability.alertDetails.errorPromptTitle', {
                defaultMessage: 'Unable to load alert details',
              })}
            </h2>
          }
          body={
            <p>
              {i18n.translate('xpack.observability.alertDetails.errorPromptBody', {
                defaultMessage: 'There was an error loading the alert details.',
              })}
            </p>
          }
        />
      </EuiPanel>
    );
  const AlertDetailsAppSection = ruleTypeModel ? ruleTypeModel.alertDetailsAppSection : null;
  const timeZone = getTimeZone(uiSettings);

  const overviewTab = alertDetail ? (
    AlertDetailsAppSection &&
    /*
    when feature flag is enabled, show alert details page with customized overview tab,
    otherwise show default overview tab
    */
    isAlertDetailsEnabledPerApp(alertDetail.formatted, config) ? (
      <>
        <EuiSpacer size="m" />
        <EuiFlexGroup direction="column" gutterSize="m">
          <SourceBar alert={alertDetail.formatted} sources={sources} />
          <AlertDetailContextualInsights alert={alertDetail} />
          {rule && alertDetail.formatted && (
            <>
              <AlertDetailsAppSection
                alert={alertDetail.formatted}
                rule={rule}
                timeZone={timeZone}
                setSources={setSources}
              />
              <AlertHistoryChart
                alert={alertDetail.formatted}
                rule={rule as unknown as CustomThresholdRule}
              />
            </>
          )}
        </EuiFlexGroup>
      </>
    ) : (
      <EuiPanel hasShadow={false} data-test-subj="overviewTabPanel" paddingSize="none">
        <EuiSpacer size="l" />
        <AlertDetailContextualInsights alert={alertDetail} />
        <EuiSpacer size="l" />
        <AlertOverview alert={alertDetail.formatted} alertStatus={alertStatus} />
      </EuiPanel>
    )
  ) : (
    <></>
  );

  const metadataTab = alertDetail?.raw && (
    <EuiPanel hasShadow={false} data-test-subj="metadataTabPanel" paddingSize="none">
      <EuiSpacer size="l" />
      <AlertFieldsTable alert={alertDetail.raw} />
    </EuiPanel>
  );

  const tabs: EuiTabbedContentTab[] = [
    {
      id: OVERVIEW_TAB_ID,
      name: i18n.translate('xpack.observability.alertDetails.tab.overviewLabel', {
        defaultMessage: 'Overview',
      }),
      'data-test-subj': 'overviewTab',
      content: overviewTab,
    },
    {
      id: METADATA_TAB_ID,
      name: i18n.translate('xpack.observability.alertDetails.tab.metadataLabel', {
        defaultMessage: 'Metadata',
      }),
      'data-test-subj': 'metadataTab',
      content: metadataTab,
    },
    {
      id: RELATED_ALERTS_TAB_ID,
      name: (
        <>
          <FormattedMessage
            id="xpack.observability.alertDetails.tab.relatedAlertsLabe"
            defaultMessage="Related alerts"
          />
          &nbsp;
          <BetaBadge size="s" iconType="beta" style={{ verticalAlign: 'middle' }} />
        </>
      ),
      'data-test-subj': 'relatedAlertsTab',
      content: <RelatedAlerts alert={alertDetail?.formatted} />,
    },
  ];

  return (
    <ObservabilityPageTemplate
      pageHeader={{
        pageTitle: alertDetail?.formatted ? (
          getPageTitle(alertDetail.formatted.fields[ALERT_RULE_CATEGORY])
        ) : (
          <EuiLoadingSpinner />
        ),
        rightSideItems: [
          <CasesContext
            owner={[observabilityFeatureId]}
            permissions={userCasesPermissions}
            features={{ alerts: { sync: false } }}
          >
            <HeaderActions
              alert={alertDetail?.formatted ?? null}
              alertIndex={alertDetail?.raw._index}
              alertStatus={alertStatus}
              onUntrackAlert={onUntrackAlert}
            />
          </CasesContext>,
        ],
        bottomBorder: false,
        'data-test-subj': rule?.ruleTypeId || 'alertDetailsPageTitle',
      }}
      pageSectionProps={{
        paddingSize: 'none',
        css: css`
          padding: 0 ${euiTheme.size.l} ${euiTheme.size.l} ${euiTheme.size.l};
        `,
      }}
      data-test-subj="alertDetails"
    >
      <StatusBar alert={alertDetail?.formatted ?? null} alertStatus={alertStatus} />
      <EuiSpacer size="l" />
      <HeaderMenu />
      <EuiTabbedContent
        data-test-subj="alertDetailsTabbedContent"
        tabs={tabs}
        selectedTab={tabs.find((tab) => tab.id === activeTabId)}
        onTabClick={(tab) => handleSetTabId(tab.id as TabId)}
      />
    </ObservabilityPageTemplate>
  );
}

export function getScreenDescription(alertDetail: AlertData) {
  const alertState = alertDetail.formatted.active ? 'active' : 'recovered';
  const alertStarted = new Date(alertDetail.formatted.start).toISOString();
  const alertUpdated = new Date(alertDetail.formatted.lastUpdated).toISOString();

  return dedent(`The user is looking at an ${alertState} alert. It started at ${alertStarted}, and was last updated at ${alertUpdated}.

  ${
    alertDetail.formatted.reason
      ? `The reason given for the alert is ${alertDetail.formatted.reason}.`
      : ''
  }

  Use the following alert fields as background information for generating a response. Do not list them as bullet points in the response.
  ${Object.entries(getRelevantAlertFields(alertDetail))
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join('\n')}
  `);
}

function getRelevantAlertFields(alertDetail: AlertData) {
  return omit(alertDetail.formatted.fields, [
    'kibana.alert.rule.revision',
    'kibana.alert.rule.execution.uuid',
    'kibana.alert.flapping_history',
    'kibana.alert.uuid',
    'kibana.alert.rule.uuid',
    'event.action',
    'event.kind',
    'kibana.alert.rule.tags',
    'kibana.alert.maintenance_window_ids',
    'kibana.alert.consecutive_matches',
  ]);
}
