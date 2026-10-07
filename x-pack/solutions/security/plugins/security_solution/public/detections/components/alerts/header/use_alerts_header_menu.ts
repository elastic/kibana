/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { AppHeaderMenu } from '@kbn/app-header';
import { SecurityPageName } from '../../../../app/types';
import { useGetSecuritySolutionUrl } from '../../../../common/components/link_to';
import { useUserPrivileges } from '../../../../common/components/user_privileges';

const MANAGE_RULES_LABEL = i18n.translate('xpack.securitySolution.alertsPage.buttonManageRules', {
  defaultMessage: 'Manage rules',
});

export const GO_TO_RULES_MENU_ITEM_TEST_ID = 'alerts-page-manage-alert-detection-rules';

/**
 * Builds the alerts page menu: "Manage rules" as the primary action when the user can read rules.
 * `SecurityAppHeader` merges in "Add integrations" and "ML job settings" automatically.
 */
export const useAlertsHeaderMenu = (): AppHeaderMenu => {
  const canReadRules = useUserPrivileges().rulesPrivileges.rules.read;
  const getSecuritySolutionUrl = useGetSecuritySolutionUrl();

  return useMemo<AppHeaderMenu>(() => {
    if (!canReadRules) {
      return {};
    }

    return {
      primaryActionItem: {
        id: 'manageRules',
        label: MANAGE_RULES_LABEL,
        iconType: 'gear',
        href: getSecuritySolutionUrl({ deepLinkId: SecurityPageName.rules }),
        testId: GO_TO_RULES_MENU_ITEM_TEST_ID,
      },
    };
  }, [canReadRules, getSecuritySolutionUrl]);
};
