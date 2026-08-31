/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppHeaderMenu } from '@kbn/app-header';
import type { AppMenuPopoverItem } from '@kbn/app-menu';
import type { ObservabilityOnboardingLocatorParams } from '@kbn/deeplinks-observability';
import { OBSERVABILITY_ONBOARDING_LOCATOR } from '@kbn/deeplinks-observability';
import { i18n } from '@kbn/i18n';
import { useLinkProps, useInspectorContext } from '@kbn/observability-shared-plugin/public';
import { enableInspectEsQueries } from '@kbn/observability-plugin/public';
import React, { useCallback, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  MetricsAlertFlyout,
  type MetricsAlertFlyoutType,
} from '../../../alerting/common/components/metrics_alert_dropdown';
import { AnomalyDetectionFlyout } from '../../../components/ml/anomaly_detection/anomaly_detection_flyout';
import { usePluginConfig } from '../../../containers/plugin_config_context';
import { useInfraMLCapabilitiesContext } from '../../../containers/ml/infra_ml_capabilities';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import { getMetricsHeaderMenuVisibility } from './get_metrics_header_menu_visibility';
import { isMetricsInventoryPath } from './metrics_header_paths';

const ANOMALY_DETECTION_LABEL = i18n.translate('xpack.infra.ml.anomalyDetectionButton', {
  defaultMessage: 'Anomaly detection',
});

const ALERTS_LABEL = i18n.translate('xpack.infra.alerting.alertsButton', {
  defaultMessage: 'Alerts',
});

const SETTINGS_LABEL = i18n.translate('xpack.infra.metrics.settingsTabTitle', {
  defaultMessage: 'Settings',
});

const INSPECT_LABEL = i18n.translate('xpack.infra.inspectButtonText', {
  defaultMessage: 'Inspect',
});

const ADD_DATA_LABEL = i18n.translate('xpack.infra.metricsHeaderAddDataButtonLabel', {
  defaultMessage: 'Add data',
});

const MANAGE_RULES_LABEL = i18n.translate('xpack.infra.alerting.manageRules', {
  defaultMessage: 'Manage rules',
});

const INFRASTRUCTURE_RULES_LABEL = i18n.translate(
  'xpack.infra.alerting.infrastructureDropdownMenu',
  {
    defaultMessage: 'Infrastructure',
  }
);

const CREATE_INVENTORY_RULE_LABEL = i18n.translate(
  'xpack.infra.alerting.createInventoryRuleButton',
  {
    defaultMessage: 'Create inventory rule',
  }
);

const METRICS_RULES_LABEL = i18n.translate('xpack.infra.alerting.metricsDropdownMenu', {
  defaultMessage: 'Metrics',
});

const CREATE_THRESHOLD_RULE_LABEL = i18n.translate(
  'xpack.infra.alerting.createThresholdRuleButton',
  {
    defaultMessage: 'Create threshold rule',
  }
);

const CREATE_CUSTOM_THRESHOLD_RULE_LABEL = i18n.translate(
  'xpack.infra.alerting.customThresholdDropdownMenu',
  {
    defaultMessage: 'Create custom threshold rule',
  }
);

export interface MetricsAppHeaderMenuResult {
  menu: AppHeaderMenu;
  flyouts: React.ReactElement;
}

/**
 * Structured AppHeader menu for migrated Metrics routes.
 * Unmigrated routes keep using MetricsHeaderActionMenu in HeaderMenuPortal.
 */
export function useMetricsAppHeaderMenu(): MetricsAppHeaderMenuResult {
  const { pathname } = useLocation();
  const visibility = getMetricsHeaderMenuVisibility(pathname);
  const config = usePluginConfig();
  const { isTopbarMenuVisible } = useInfraMLCapabilitiesContext();
  const {
    services: { inspector, observability, share, uiSettings, application },
  } = useKibanaContextForPlugin();
  const { inspectorAdapters } = useInspectorContext();
  const settingsLinkProps = useLinkProps({
    app: 'metrics',
    pathname: 'settings',
  });
  const [isAnomalyFlyoutOpen, setIsAnomalyFlyoutOpen] = useState(false);
  const [visibleFlyoutType, setVisibleFlyoutType] = useState<MetricsAlertFlyoutType | null>(null);

  const closeAnomalyFlyout = useCallback(() => {
    setIsAnomalyFlyoutOpen(false);
  }, []);

  const closeAlertFlyout = useCallback(() => {
    setVisibleFlyoutType(null);
  }, []);

  const canCreateAlerts = Boolean(application?.capabilities?.infrastructure?.save);
  const isInspectorEnabled = Boolean(uiSettings?.get<boolean>(enableInspectEsQueries));
  const manageRulesLinkProps = observability.useRulesLink();
  const onboardingLocator = share?.url.locators.get<ObservabilityOnboardingLocatorParams>(
    OBSERVABILITY_ONBOARDING_LOCATOR
  );
  const addDataHref = onboardingLocator?.getRedirectUrl({
    category: visibility.showHostsOnboarding ? 'host' : undefined,
  });

  const menu = useMemo<AppHeaderMenu>(() => {
    const items: NonNullable<AppHeaderMenu['items']> = [];
    const alertItems: AppMenuPopoverItem[] = [];
    let order = 0;

    if (visibility.showAnomalyDetection && isTopbarMenuVisible) {
      items.push({
        id: 'anomalyDetection',
        label: ANOMALY_DETECTION_LABEL,
        iconType: 'machineLearningApp',
        testId: 'openAnomalyFlyoutButton',
        order: order++,
        run: () => {
          setIsAnomalyFlyoutOpen(true);
        },
      });
    }

    if (config.featureFlags.alertsAndRulesDropdownEnabled) {
      if (canCreateAlerts && config.featureFlags.inventoryThresholdAlertRuleEnabled) {
        alertItems.push({
          id: 'infrastructureRules',
          label: INFRASTRUCTURE_RULES_LABEL,
          testId: 'inventory-alerts-menu-option',
          items: [
            {
              id: 'createInventoryRule',
              label: CREATE_INVENTORY_RULE_LABEL,
              testId: 'inventory-alerts-create-rule',
              run: () => {
                setVisibleFlyoutType('inventory');
              },
            },
          ],
        });
      }

      if (canCreateAlerts && config.featureFlags.metricThresholdAlertRuleEnabled) {
        alertItems.push({
          id: 'metricsRules',
          label: METRICS_RULES_LABEL,
          testId: 'metrics-threshold-alerts-menu-option',
          items: [
            {
              id: 'createThresholdRule',
              label: CREATE_THRESHOLD_RULE_LABEL,
              testId: 'metrics-threshold-alerts-create-rule',
              run: () => {
                setVisibleFlyoutType('metricThreshold');
              },
            },
          ],
        });
      }

      if (canCreateAlerts && config.featureFlags.customThresholdAlertsEnabled) {
        alertItems.push({
          id: 'createCustomThresholdRule',
          label: CREATE_CUSTOM_THRESHOLD_RULE_LABEL,
          testId: 'custom-threshold-alerts-menu-option',
          run: () => {
            setVisibleFlyoutType('customThreshold');
          },
        });
      }

      if (manageRulesLinkProps.href) {
        alertItems.push({
          id: 'manageRules',
          label: MANAGE_RULES_LABEL,
          iconType: 'tableOfContents',
          href: manageRulesLinkProps.href,
        });
      }

      if (alertItems.length > 0) {
        items.push({
          id: 'alerts',
          label: ALERTS_LABEL,
          iconType: 'bell',
          testId: 'infrastructure-alerts-and-rules',
          order: order++,
          items: alertItems,
        });
      }
    }

    if (settingsLinkProps.href) {
      items.push({
        id: 'settings',
        label: SETTINGS_LABEL,
        iconType: 'gear',
        href: settingsLinkProps.href,
        order: order++,
        overflow: true,
      });
    }

    if (isInspectorEnabled) {
      items.push({
        id: 'inspect',
        label: INSPECT_LABEL,
        iconType: 'inspect',
        testId: 'infraInspectHeaderLink',
        order: order++,
        overflow: true,
        run: () => {
          inspector.open(inspectorAdapters);
        },
      });
    }

    return {
      items,
      primaryActionItem: addDataHref
        ? {
            id: 'addData',
            label: ADD_DATA_LABEL,
            iconType: 'plusCircle',
            href: addDataHref,
          }
        : undefined,
    };
  }, [
    addDataHref,
    canCreateAlerts,
    config.featureFlags.alertsAndRulesDropdownEnabled,
    config.featureFlags.customThresholdAlertsEnabled,
    config.featureFlags.inventoryThresholdAlertRuleEnabled,
    config.featureFlags.metricThresholdAlertRuleEnabled,
    inspector,
    inspectorAdapters,
    isInspectorEnabled,
    isTopbarMenuVisible,
    manageRulesLinkProps.href,
    settingsLinkProps.href,
    visibility.showAnomalyDetection,
  ]);

  const flyouts = (
    <>
      <AnomalyDetectionFlyout
        trigger="none"
        isOpen={isAnomalyFlyoutOpen}
        onClose={closeAnomalyFlyout}
        hideJobType={!isMetricsInventoryPath(pathname)}
        hideSelectGroup={!isMetricsInventoryPath(pathname)}
      />
      <MetricsAlertFlyout visibleFlyoutType={visibleFlyoutType} onClose={closeAlertFlyout} />
    </>
  );

  return { menu, flyouts };
}
