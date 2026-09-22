/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppHeaderMenu } from '@kbn/app-header';
import type { AppMenuPopoverItem } from '@kbn/app-menu';
import { createExploratoryViewUrl } from '@kbn/exploratory-view-plugin/public';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { enableInspectEsQueries } from '@kbn/observability-plugin/public';
import { useInspectorContext } from '@kbn/observability-shared-plugin/public';
import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux-v7';
import { useHistory } from 'react-router-dom';
import {
  SYNTHETICS_STATUS_RULE,
  SYNTHETICS_TLS_RULE,
} from '../../../../../../common/constants/synthetics_alerts';
import { MONITOR_ADD_ROUTE, SETTINGS_ROUTE } from '../../../../../../common/constants';
import { useCanEditSynthetics } from '../../../../../hooks/use_capabilities';
import type { ClientPluginsStart } from '../../../../../plugin';
import { useSyntheticsSettingsContext } from '../../../contexts';
import { useEnablement, useGetUrlParams } from '../../../hooks';
import {
  selectAlertFlyoutVisibility,
  selectMonitorListState,
  setAlertFlyoutVisible,
} from '../../../state';
import { isExternalOverviewMonitor } from '../../../state/overview_status';
import { selectOverviewStatus } from '../../../state/overview_status';
import { stringifyUrlParams } from '../../../utils/url_params';
import {
  CREATE_STATUS_RULE,
  CREATE_TLS_RULE_NAME,
  EDIT_STATUS_RULE,
  EDIT_TLS_RULE_NAME,
  noWritePermissionsTooltipContent,
  statusRuleNotAvailableTooltipContent,
  tlsRuleNotAvailableTooltipContent,
} from '../../alerts/toggle_alert_flyout_button';
import {
  STATUS_RULE_NAME,
  TLS_RULE_NAME,
  ToggleFlyoutTranslations,
} from '../../alerts/hooks/translations';
import { useSyntheticsRules } from '../../alerts/hooks/use_synthetics_rules';
import { CANNOT_PERFORM_ACTION_SYNTHETICS } from '../components/permissions';
import { SERVICE_NOT_ALLOWED } from '../../monitors_page/management/disabled_callout';
import { SyntheticsDiagnosticsFlyoutLauncher } from '../../settings/synthetics_diagnostics_flyout';

const ANALYZE_DATA = i18n.translate('xpack.synthetics.analyzeDataButtonLabel', {
  defaultMessage: 'Explore data',
});

const ANALYZE_MESSAGE = i18n.translate('xpack.synthetics.analyzeDataButtonLabel.message', {
  defaultMessage:
    'Go to Explore Data, where you can select and filter result data in any dimension and look for the cause or impact of performance problems.',
});

const INSPECT_LABEL = i18n.translate('xpack.synthetics.inspectButtonText', {
  defaultMessage: 'Inspect',
});

const SETTINGS_LABEL = i18n.translate('xpack.synthetics.page_header.settingsLink', {
  defaultMessage: 'Settings',
});

const DIAGNOSTICS_LABEL = i18n.translate('xpack.synthetics.diagnostics.openButton', {
  defaultMessage: 'Diagnostics bundle',
});

const CREATE_MONITOR_LABEL = i18n.translate(
  'xpack.synthetics.monitors.pageHeader.createButton.label',
  {
    defaultMessage: 'Create Monitor',
  }
);

export interface SyntheticsAppHeaderMenuOptions {
  showSettings?: boolean;
  showDiagnostics?: boolean;
  showCreateMonitor?: boolean;
  primaryActionItem?: AppHeaderMenu['primaryActionItem'];
}

export interface SyntheticsAppHeaderMenuResult {
  menu: AppHeaderMenu;
  flyouts: React.ReactElement;
}

export function useSyntheticsAppHeaderMenu(
  options: SyntheticsAppHeaderMenuOptions = {}
): SyntheticsAppHeaderMenuResult {
  const {
    showSettings = true,
    showDiagnostics = false,
    showCreateMonitor: enableCreateMonitor = false,
    primaryActionItem,
  } = options;
  const history = useHistory();
  const params = useGetUrlParams();
  const { dateRangeStart, dateRangeEnd } = params;
  const { basePath, isDev } = useSyntheticsSettingsContext();
  const { isEnabled, isServiceAllowed } = useEnablement();
  const canEditSynthetics = useCanEditSynthetics();
  const dispatch = useDispatch();
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);

  const {
    services: { inspector, uiSettings, observability, application },
  } = useKibana<ClientPluginsStart>();
  const inspectorContext = useInspectorContext();
  const inspectorAdapters = inspectorContext?.inspectorAdapters;

  const isInspectorEnabled = Boolean(uiSettings?.get<boolean>(enableInspectEsQueries)) || isDev;
  const hasUptimeWrite = application?.capabilities.uptime?.save ?? false;
  const manageRulesUrl = observability.useRulesLink();

  const { loaded, data: monitors } = useSelector(selectMonitorListState);
  const { allConfigs } = useSelector(selectOverviewStatus);
  const hasSavedMonitors = Boolean(loaded && monitors.absoluteTotal && monitors.absoluteTotal > 0);
  const hasExternalMonitors = (allConfigs ?? []).some(isExternalOverviewMonitor);
  const hasMonitors = hasSavedMonitors || hasExternalMonitors;

  const { loading, defaultRules, EditAlertFlyout, NewRuleFlyout } = useSyntheticsRules(true);
  const alertFlyoutVisible = useSelector(selectAlertFlyoutVisibility);
  const statusRuleExists = Boolean(defaultRules?.statusRule);
  const tlsRuleExists = Boolean(defaultRules?.tlsRule);

  const showCreateMonitor = enableCreateMonitor && hasMonitors;

  const exploreHref = useMemo(
    () =>
      createExploratoryViewUrl(
        {
          reportType: 'kpi-over-time',
          allSeries: [
            {
              dataType: 'synthetics',
              seriesType: 'area',
              selectedMetricField: 'monitor.duration.us',
              time: { from: dateRangeStart, to: dateRangeEnd },
              breakdown: 'monitor.type',
              reportDefinitions: {
                'monitor.name': [],
                'url.full': ['ALL_VALUES'],
              },
              name: 'All monitors response duration',
            },
          ],
        },
        basePath
      ),
    [basePath, dateRangeEnd, dateRangeStart]
  );

  const settingsHref = history.createHref({
    pathname: SETTINGS_ROUTE,
    search: stringifyUrlParams(params, true),
  });

  const createMonitorDisabled = !isEnabled || !canEditSynthetics || !isServiceAllowed;
  const createMonitorTooltip = !isServiceAllowed
    ? SERVICE_NOT_ALLOWED
    : !canEditSynthetics
    ? CANNOT_PERFORM_ACTION_SYNTHETICS
    : undefined;

  const menu = useMemo<AppHeaderMenu>(() => {
    const items: NonNullable<AppHeaderMenu['items']> = [];
    let order = 0;

    const alertItems: AppMenuPopoverItem[] = [
      {
        id: 'statusRule',
        label: STATUS_RULE_NAME,
        testId: 'manageStatusRuleName',
        items: [
          {
            id: 'createStatusRule',
            label: CREATE_STATUS_RULE,
            iconType: 'plusCircle',
            testId: 'createNewStatusRule',
            run: () => {
              dispatch(
                setAlertFlyoutVisible({ id: SYNTHETICS_STATUS_RULE, isNewRuleFlyout: true })
              );
            },
          },
          {
            id: 'editStatusRule',
            label: EDIT_STATUS_RULE,
            iconType: 'bell',
            testId: 'editDefaultStatusRule',
            disableButton: !hasUptimeWrite || loading || !statusRuleExists,
            tooltipContent: !hasUptimeWrite
              ? noWritePermissionsTooltipContent
              : !statusRuleExists
              ? statusRuleNotAvailableTooltipContent
              : undefined,
            run: () => {
              dispatch(
                setAlertFlyoutVisible({ id: SYNTHETICS_STATUS_RULE, isNewRuleFlyout: false })
              );
            },
          },
        ],
      },
      {
        id: 'tlsRule',
        label: TLS_RULE_NAME,
        testId: 'manageTlsRuleName',
        items: [
          {
            id: 'createTlsRule',
            label: CREATE_TLS_RULE_NAME,
            iconType: 'plusCircle',
            testId: 'createNewTLSRule',
            run: () => {
              dispatch(setAlertFlyoutVisible({ id: SYNTHETICS_TLS_RULE, isNewRuleFlyout: true }));
            },
          },
          {
            id: 'editTlsRule',
            label: EDIT_TLS_RULE_NAME,
            iconType: 'bell',
            testId: 'editDefaultTlsRule',
            disableButton: !hasUptimeWrite || loading || !tlsRuleExists,
            tooltipContent: !hasUptimeWrite
              ? noWritePermissionsTooltipContent
              : !tlsRuleExists
              ? tlsRuleNotAvailableTooltipContent
              : undefined,
            run: () => {
              dispatch(setAlertFlyoutVisible({ id: SYNTHETICS_TLS_RULE, isNewRuleFlyout: false }));
            },
          },
        ],
      },
    ];

    if (manageRulesUrl.href) {
      alertItems.push({
        id: 'manageRules',
        label: ToggleFlyoutTranslations.navigateToAlertingButtonContent,
        iconType: 'tableOfContents',
        href: manageRulesUrl.href,
        testId: 'xpack.synthetics.navigateToAlertingUi',
      });
    }

    items.push({
      id: 'alerts',
      label: ToggleFlyoutTranslations.alertsAndRules,
      iconType: 'bell',
      testId: 'syntheticsAlertsRulesButton',
      order: order++,
      disableButton: !hasMonitors,
      items: alertItems,
    });

    if (isInspectorEnabled) {
      items.push({
        id: 'inspect',
        label: INSPECT_LABEL,
        iconType: 'inspect',
        order: order++,
        overflow: true,
        run: () => {
          inspector.open(inspectorAdapters ?? {});
        },
      });
    }

    items.push({
      id: 'exploreData',
      label: ANALYZE_DATA,
      iconType: 'visArea',
      href: exploreHref,
      testId: 'syntheticsExploreDataButton',
      order: order++,
      overflow: true,
      tooltipContent: ANALYZE_MESSAGE,
    });

    if (showDiagnostics) {
      items.push({
        id: 'diagnostics',
        label: DIAGNOSTICS_LABEL,
        iconType: 'inspect',
        testId: 'syntheticsDiagnosticsOpenButton',
        order: order++,
        overflow: true,
        disableButton: !canEditSynthetics,
        tooltipContent: !canEditSynthetics ? CANNOT_PERFORM_ACTION_SYNTHETICS : undefined,
        run: () => {
          if (canEditSynthetics) {
            setIsDiagnosticsOpen(true);
          }
        },
      });
    }

    if (showSettings) {
      items.push({
        id: 'settings',
        label: SETTINGS_LABEL,
        iconType: 'gear',
        href: settingsHref,
        testId: 'settings-page-link',
        order: order++,
        overflow: true,
      });
    }

    return {
      items,
      primaryActionItem:
        primaryActionItem ??
        (showCreateMonitor
          ? {
              id: 'createMonitor',
              label: CREATE_MONITOR_LABEL,
              iconType: 'plusCircle',
              href: `${basePath}/app/synthetics${MONITOR_ADD_ROUTE}`,
              testId: 'syntheticsAddMonitorBtn',
              disableButton: createMonitorDisabled,
              tooltipContent: createMonitorTooltip,
            }
          : undefined),
    };
  }, [
    basePath,
    canEditSynthetics,
    createMonitorDisabled,
    createMonitorTooltip,
    dispatch,
    exploreHref,
    hasMonitors,
    hasUptimeWrite,
    inspector,
    inspectorAdapters,
    isInspectorEnabled,
    loading,
    manageRulesUrl.href,
    primaryActionItem,
    settingsHref,
    showCreateMonitor,
    showDiagnostics,
    showSettings,
    statusRuleExists,
    tlsRuleExists,
  ]);

  const flyouts = (
    <>
      {alertFlyoutVisible && EditAlertFlyout}
      {alertFlyoutVisible && NewRuleFlyout}
      {showDiagnostics ? (
        <SyntheticsDiagnosticsFlyoutLauncher
          hideTrigger
          isOpen={isDiagnosticsOpen}
          onClose={() => setIsDiagnosticsOpen(false)}
        />
      ) : null}
    </>
  );

  return { menu, flyouts };
}
