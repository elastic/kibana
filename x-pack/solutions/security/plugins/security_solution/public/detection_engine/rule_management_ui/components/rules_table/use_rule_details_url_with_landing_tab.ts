/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { RuleDetailTabs } from '../../../rule_details_ui/pages/rule_details/use_rule_details_tabs';
import { getRuleDetailsTabUrl } from '../../../../common/components/link_to/redirect_to_detection_engine';

export const useRuleDetailsUrlPathWithLandingTab = (ruleId: string) => {
  const { alertsPrivileges, rulesPrivileges } = useUserPrivileges();
  const canReadAlerts = alertsPrivileges.alerts.read;
  const canReadExceptions = rulesPrivileges.exceptions.read;

  const ruleDetailsUrlPathWithLandingTab = useMemo(() => {
    const landingTab = canReadAlerts
      ? RuleDetailTabs.alerts
      : canReadExceptions
      ? RuleDetailTabs.exceptions
      : RuleDetailTabs.executionResults;

    return getRuleDetailsTabUrl(ruleId, landingTab);
  }, [ruleId, canReadAlerts, canReadExceptions]);

  return { ruleDetailsUrlPathWithLandingTab };
};
