/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { RuleExecutionStatusErrorReasons } from '@kbn/alerting-plugin/common';
import type { FilterGroupHandler } from '@kbn/alerts-ui-shared';
import { DEFAULT_CONTROLS } from '@kbn/alerts-ui-shared/src/alert_filter_controls/constants';
import { usePageReady } from '@kbn/ebt-tools';
import type { BoolQuery } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import { RuleFormFlyout } from '@kbn/response-ops-rule-form/flyout';
import { ALERT_STATUS } from '@kbn/rule-data-utils';
import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { ruleDetailsLocatorID } from '../../../common';
import {
  ALERT_STATUS_ALL,
  OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES,
  observabilityAlertFeatureIds,
} from '../../../common/constants';
import { paths, relativePaths } from '../../../common/locators/paths';
import type { AlertStatus } from '../../../common/typings';
import { CenterJustifiedSpinner } from '../../components/center_justified_spinner';
import { useFetchRule } from '../../hooks/use_fetch_rule';
import { useFetchRuleTypes } from '../../hooks/use_fetch_rule_types';
import { useGetFilteredRuleTypes } from '../../hooks/use_get_filtered_rule_types';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { RuleDetailsLocatorParams } from '../../locators/rule_details';
import { getControlIndex } from '../../utils/alert_controls/get_control_index';
import { setStatusOnControlConfigs } from '../../utils/alert_controls/set_status_on_control_configs';
import { updateSelectedOptions } from '../../utils/alert_controls/update_selected_options';
import {
  defaultTimeRange,
  getDefaultAlertSummaryTimeRange,
} from '../../utils/alert_summary_widget';
import { useKibana } from '../../utils/kibana_react';
import { HeaderMenu } from '../overview/components/header_menu/header_menu';
import { DeleteConfirmationModal } from './components/delete_confirmation_modal';
import { HeaderActions } from './components/header_actions';
import { NoRuleFoundPanel } from './components/no_rule_found_panel';
import { PageTitleContent } from './components/page_title_content';
import { RuleDetailsTabs } from './components/rule_details_tabs';
import {
  RULE_DETAILS_ALERTS_TAB,
  RULE_DETAILS_EXECUTION_TAB,
  RULE_DETAILS_TAB_URL_STORAGE_KEY,
} from './constants';
import { getHealthColor } from './helpers/get_health_color';
import { isRuleEditable } from './helpers/is_rule_editable';

export type TabId = typeof RULE_DETAILS_ALERTS_TAB | typeof RULE_DETAILS_EXECUTION_TAB;

interface RuleDetailsPathParams {
  ruleId: string;
}
export function RuleDetailsPage() {
  const { services } = useKibana();
  const {
    application: { capabilities, navigateToUrl, navigateToApp },
    http: { basePath },
    share: {
      url: { locators },
    },
    triggersActionsUi: {
      actionTypeRegistry,
      ruleTypeRegistry,
      getAlertSummaryWidget: AlertSummaryWidget,
      getRuleDefinition: RuleDefinition,
      getRuleStatusPanel: RuleStatusPanel,
    },
    serverless,
  } = services;
  const { ObservabilityPageTemplate } = usePluginContext();

  const { ruleId } = useParams<RuleDetailsPathParams>();
  const { search } = useLocation();
  const { rule, isLoading, isError, refetch, isRefetching, isInitialLoading } = useFetchRule({
    ruleId,
  });
  const filteredRuleTypes = useGetFilteredRuleTypes();
  const { ruleTypes } = useFetchRuleTypes({
    filterByRuleTypeIds: filteredRuleTypes,
  });

  useBreadcrumbs(
    [
      {
        text: i18n.translate('xpack.observability.breadcrumbs.alertsLinkText', {
          defaultMessage: 'Alerts',
        }),
        href: basePath.prepend(paths.observability.alerts),
        deepLinkId: 'observability-overview:alerts',
      },
      {
        href: basePath.prepend(paths.observability.rules),
        text: i18n.translate('xpack.observability.breadcrumbs.rulesLinkText', {
          defaultMessage: 'Rules',
        }),
      },
      {
        text: rule && rule.name,
      },
    ],
    { serverless }
  );

  const [controlApi, setControlApi] = useState<FilterGroupHandler | undefined>();
  const [activeTabId, setActiveTabId] = useState<TabId>(() => {
    const searchParams = new URLSearchParams(search);
    const urlTabId = searchParams.get(RULE_DETAILS_TAB_URL_STORAGE_KEY);

    return urlTabId && [RULE_DETAILS_EXECUTION_TAB, RULE_DETAILS_ALERTS_TAB].includes(urlTabId)
      ? (urlTabId as TabId)
      : RULE_DETAILS_ALERTS_TAB;
  });

  const [esQuery, setEsQuery] = useState<{ bool: BoolQuery }>();

  const [alertSummaryWidgetTimeRange, setAlertSummaryWidgetTimeRange] = useState(
    getDefaultAlertSummaryTimeRange
  );

  const [isEditRuleFlyoutVisible, setEditRuleFlyoutVisible] = useState<boolean>(false);

  const [ruleToDelete, setRuleToDelete] = useState<string | undefined>(undefined);
  const [isRuleDeleting, setIsRuleDeleting] = useState(false);

  const tabsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAlertSummaryWidgetTimeRange(getDefaultAlertSummaryTimeRange());
  }, [esQuery]);

  const handleSetTabId = async (tabId: TabId) => {
    setActiveTabId(tabId);

    await locators.get<RuleDetailsLocatorParams>(ruleDetailsLocatorID)?.navigate(
      {
        ruleId,
        tabId,
      },
      {
        replace: true,
      }
    );
  };

  const handleAlertSummaryWidgetClick = async (status: AlertStatus = ALERT_STATUS_ALL) => {
    setAlertSummaryWidgetTimeRange(getDefaultAlertSummaryTimeRange());
    const searchParams = new URLSearchParams(search);
    let controlConfigs: any = searchParams.get('controlConfigs') ?? DEFAULT_CONTROLS;

    const statusControlIndex = getControlIndex(ALERT_STATUS, controlConfigs);
    controlConfigs = setStatusOnControlConfigs(status, controlConfigs);
    updateSelectedOptions(status, statusControlIndex, controlApi);

    await locators.get<RuleDetailsLocatorParams>(ruleDetailsLocatorID)?.navigate(
      {
        controlConfigs,
        rangeFrom: defaultTimeRange.from,
        rangeTo: defaultTimeRange.to,
        ruleId,
        tabId: RULE_DETAILS_ALERTS_TAB,
      },
      {
        replace: true,
      }
    );

    setActiveTabId(RULE_DETAILS_ALERTS_TAB);

    tabsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleEditRule = () => {
    if (rule) {
      navigateToApp('observability', {
        path: relativePaths.observability.editRule(rule.id),
        state: {
          returnApp: 'observability',
          returnPath: relativePaths.observability.ruleDetails(rule.id),
        },
      });
    }
  };

  const handleCloseRuleFlyout = () => {
    setEditRuleFlyoutVisible(false);
  };

  const handleDeleteRule = () => {
    setRuleToDelete(rule?.id);
    setEditRuleFlyoutVisible(false);
  };

  const handleIsDeletingRule = () => {
    setIsRuleDeleting(true);
  };

  const handleIsRuleDeleted = () => {
    setRuleToDelete(undefined);
    setIsRuleDeleting(false);
    navigateToUrl(basePath.prepend(paths.observability.rules));
  };

  const ruleType = ruleTypes?.find((type) => type.id === rule?.ruleTypeId);
  const isEditable = isRuleEditable({ capabilities, rule, ruleType, ruleTypeRegistry });

  const ruleStatusMessage =
    rule?.executionStatus.error?.reason === RuleExecutionStatusErrorReasons.License
      ? rulesStatusesTranslationsMapping.noLicense
      : rule
      ? rulesStatusesTranslationsMapping[rule.executionStatus.status]
      : '';

  usePageReady({
    isReady: !isInitialLoading,
    isRefreshing: isRefetching,
    meta: {
      description:
        '[ttfmp_rule_details] The Observability Rule Details overview page has loaded successfully.',
    },
  });

  if (isLoading || isRuleDeleting) return <CenterJustifiedSpinner />;
  if (!rule || isError) return <NoRuleFoundPanel />;

  return (
    <ObservabilityPageTemplate
      data-test-subj="ruleDetails"
      pageHeader={{
        pageTitle: rule.name,
        pageTitleProps: {
          'data-test-subj': 'ruleName',
        },
        children: <PageTitleContent rule={rule} />,
        bottomBorder: false,
        rightSideItems: ruleId
          ? [
              <HeaderActions
                ruleId={ruleId}
                isLoading={isLoading || isRuleDeleting}
                isRuleEditable={isEditable}
                onEditRule={handleEditRule}
                onDeleteRule={handleDeleteRule}
              />,
            ]
          : [],
      }}
    >
      <HeaderMenu />
      <EuiFlexGroup wrap gutterSize="m" data-test-subj={`ruleType_${rule.ruleTypeId}`}>
        <EuiFlexItem css={{ minWidth: 350 }}>
          <RuleStatusPanel
            rule={rule}
            isEditable={isEditable}
            requestRefresh={refetch}
            healthColor={getHealthColor(rule.executionStatus.status)}
            statusMessage={ruleStatusMessage}
          />
        </EuiFlexItem>

        <EuiFlexItem css={{ minWidth: 350 }}>
          <AlertSummaryWidget
            ruleTypeIds={OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES}
            consumers={observabilityAlertFeatureIds}
            onClick={handleAlertSummaryWidgetClick}
            timeRange={alertSummaryWidgetTimeRange}
            filter={{
              term: {
                'kibana.alert.rule.uuid': ruleId,
              },
            }}
          />
        </EuiFlexItem>

        <RuleDefinition
          actionTypeRegistry={actionTypeRegistry}
          rule={rule}
          ruleTypeRegistry={ruleTypeRegistry}
          navigateToEditRuleForm={handleEditRule}
          onEditRule={async () => {
            refetch();
          }}
        />
      </EuiFlexGroup>

      <EuiSpacer size="l" />

      <div ref={tabsRef} />

      <RuleDetailsTabs
        esQuery={esQuery}
        ruleTypeIds={OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES}
        rule={rule}
        ruleId={ruleId}
        ruleType={ruleType}
        activeTabId={activeTabId}
        onEsQueryChange={setEsQuery}
        onSetTabId={handleSetTabId}
        onControlApiAvailable={setControlApi}
        controlApi={controlApi}
      />

      {isEditRuleFlyoutVisible && (
        <RuleFormFlyout
          plugins={{ ...services, actionTypeRegistry, ruleTypeRegistry }}
          id={rule.id}
          onCancel={handleCloseRuleFlyout}
          onSubmit={() => {
            handleCloseRuleFlyout();
            refetch();
          }}
        />
      )}

      {ruleToDelete ? (
        <DeleteConfirmationModal
          ruleIdToDelete={ruleToDelete}
          title={rule.name}
          onCancel={() => setRuleToDelete(undefined)}
          onDeleting={handleIsDeletingRule}
          onDeleted={handleIsRuleDeleted}
        />
      ) : null}
    </ObservabilityPageTemplate>
  );
}

const rulesStatusesTranslationsMapping = {
  ok: i18n.translate('xpack.observability.ruleDetails.ruleStatusOk', {
    defaultMessage: 'Ok',
  }),
  active: i18n.translate('xpack.observability.ruleDetails.ruleStatusActive', {
    defaultMessage: 'Active',
  }),
  error: i18n.translate('xpack.observability.ruleDetails.ruleStatusError', {
    defaultMessage: 'Error',
  }),
  pending: i18n.translate('xpack.observability.ruleDetails.ruleStatusPending', {
    defaultMessage: 'Pending',
  }),
  unknown: i18n.translate('xpack.observability.ruleDetails.ruleStatusUnknown', {
    defaultMessage: 'Unknown',
  }),
  warning: i18n.translate('xpack.observability.ruleDetails.ruleStatusWarning', {
    defaultMessage: 'Warning',
  }),
  noLicense: i18n.translate('xpack.observability.ruleDetails.ruleStatusLicenseError', {
    defaultMessage: 'License Error',
  }),
};
