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
import { useLogViewContext } from '@kbn/logs-shared-plugin/public';
import React, { useMemo, useState } from 'react';
import { LazyAlertFlyout } from '../../../alerting/log_threshold/components/lazy_alert_flyout';
import { INFRA_EBT_ACTIONS, INFRA_EBT_DETAILS } from '../../../common/ebt_constants';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import { LOGS_APP_MENU_ORDER } from './menu_items';

const ALERTS_LABEL = i18n.translate('xpack.infra.alerting.logs.alertsButton', {
  defaultMessage: 'Alerts',
});

const ADD_DATA_LABEL = i18n.translate('xpack.infra.logsHeaderAddDataButtonLabel', {
  defaultMessage: 'Add data',
});

const CREATE_RULE_LABEL = i18n.translate('xpack.infra.alerting.logs.createAlertButton', {
  defaultMessage: 'Create rule',
});

const MANAGE_RULES_LABEL = i18n.translate('xpack.infra.alerting.logs.manageAlerts', {
  defaultMessage: 'Manage rules',
});

const CREATE_RULE_BLOCKERS = {
  readOnly: {
    title: i18n.translate('xpack.infra.logs.alertDropdown.readOnlyCreateAlertTitle', {
      defaultMessage: 'Read only',
    }),
    content: i18n.translate('xpack.infra.logs.alertDropdown.readOnlyCreateAlertContent', {
      defaultMessage: 'Creating alerts requires more permissions in this application.',
    }),
  },
  inlineLogView: {
    title: i18n.translate('xpack.infra.logs.alertDropdown.inlineLogViewCreateAlertTitle', {
      defaultMessage: 'Inline Log View',
    }),
    content: i18n.translate('xpack.infra.logs.alertDropdown.inlineLogViewCreateAlertContent', {
      defaultMessage: 'Creating alerts is not supported with inline Log Views',
    }),
  },
} as const;

export const getCreateRuleBlocker = ({
  readOnly,
  isPersistedLogView,
}: {
  readOnly: boolean;
  isPersistedLogView: boolean;
}): (typeof CREATE_RULE_BLOCKERS)[keyof typeof CREATE_RULE_BLOCKERS] | undefined => {
  if (readOnly) {
    return CREATE_RULE_BLOCKERS.readOnly;
  }
  if (!isPersistedLogView) {
    return CREATE_RULE_BLOCKERS.inlineLogView;
  }
};

export interface LogsAppHeaderMenuOptions {
  extraItems?: AppHeaderMenu['items'];
  primaryActionItem?: AppHeaderMenu['primaryActionItem'];
}

export interface LogsAppHeaderMenuResult {
  menu: AppHeaderMenu;
  flyouts: React.ReactElement;
}

/**
 * Shared AppHeader menu for Logs Anomalies and Log Categories.
 * Alerts and Add data are regular items; pages pass app-specific primary/extra items.
 */
export function useLogsAppHeaderMenu(
  options: LogsAppHeaderMenuOptions = {}
): LogsAppHeaderMenuResult {
  const { extraItems, primaryActionItem } = options;
  const {
    services: { application, observability, share },
  } = useKibanaContextForPlugin();
  const { isPersistedLogView } = useLogViewContext();
  const [isAlertFlyoutVisible, setIsAlertFlyoutVisible] = useState(false);

  const readOnly = !application?.capabilities?.logs?.save;
  const createRuleBlocker = getCreateRuleBlocker({ readOnly, isPersistedLogView });
  const manageRulesLinkProps = observability.useRulesLink({
    hrefOnly: true,
  });
  const onboardingLocator = share?.url.locators.get<ObservabilityOnboardingLocatorParams>(
    OBSERVABILITY_ONBOARDING_LOCATOR
  );

  const menu = useMemo<AppHeaderMenu>(() => {
    const addDataHref = onboardingLocator?.getRedirectUrl({ category: 'host' });
    const items: NonNullable<AppHeaderMenu['items']> = [...(extraItems ?? [])];
    const alertItems: AppMenuPopoverItem[] = [
      {
        id: 'createRule',
        label: CREATE_RULE_LABEL,
        iconType: 'bell',
        disableButton: Boolean(createRuleBlocker),
        tooltipTitle: createRuleBlocker?.title,
        tooltipContent: createRuleBlocker?.content,
        ebt: { action: INFRA_EBT_ACTIONS.CREATE_LOG_THRESHOLD_RULE },
        run: () => {
          setIsAlertFlyoutVisible(true);
        },
      },
    ];

    const manageRulesHref = manageRulesLinkProps.href;
    if (manageRulesHref) {
      alertItems.push({
        id: 'manageRules',
        label: MANAGE_RULES_LABEL,
        iconType: 'tableOfContents',
        href: manageRulesHref,
        run: () => {
          void application.navigateToUrl(manageRulesHref);
        },
        ebt: { action: INFRA_EBT_ACTIONS.MANAGE_RULES },
      });
    }

    items.push({
      id: 'alerts',
      label: ALERTS_LABEL,
      iconType: 'bell',
      testId: 'logs-alerts-and-rules',
      popoverTestId: 'logs-alert-menu',
      order: LOGS_APP_MENU_ORDER.alerts,
      ebt: { action: INFRA_EBT_ACTIONS.OPEN_ALERTS_MENU },
      items: alertItems,
    });

    if (addDataHref) {
      items.push({
        id: 'addData',
        label: ADD_DATA_LABEL,
        iconType: 'plusCircle',
        href: addDataHref,
        run: () => {
          void application.navigateToUrl(addDataHref);
        },
        order: LOGS_APP_MENU_ORDER.addData,
        ebt: {
          action: INFRA_EBT_ACTIONS.ADD_DATA,
          detail: INFRA_EBT_DETAILS.ADD_DATA_HOST,
        },
      });
    }

    return {
      items,
      primaryActionItem,
    };
  }, [
    application,
    createRuleBlocker,
    extraItems,
    manageRulesLinkProps.href,
    onboardingLocator,
    primaryActionItem,
  ]);

  const flyouts = (
    <LazyAlertFlyout setVisible={setIsAlertFlyoutVisible} visible={isAlertFlyoutVisible} />
  );

  return { menu, flyouts };
}
