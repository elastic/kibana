/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo } from 'react';
import { isEmpty } from 'lodash';
import { EuiLoadingSpinner } from '@elastic/eui';
import { UserActionTitle } from '@kbn/cases-components';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { getRuleInfo, type AlertAttachmentMetadata } from '@kbn/cases-plugin/common';
import { useFetchAlertData } from '../../../pages/use_fetch_alert_data';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import * as i18n from '../translations';
import { RulePanelKey } from '../../../../flyout/rule_details/right';

/**
 * Security signals (`signal.*`) shipped before the ECS `kibana.alert.*` move,
 * so we still need to read from these legacy paths in addition to ECS.
 */
const SECURITY_EXTRA_RULE_ID_PATHS = ['signal.rule.id'];
const SECURITY_EXTRA_RULE_NAME_PATHS = ['signal.rule.name'];

export interface AlertEventProps {
  alertId: string;
  /**
   * Schema-inferred `metadata.rule` from `SecurityAlertAttachmentPayloadSchema`.
   * The component reads `id` / `name` defensively so callers can pass it
   * through without coercion.
   */
  rule: AlertAttachmentMetadata['rule'];
  savedObjectId: string;
  totalAlerts: number;
}

export const AlertEvent: React.FC<AlertEventProps> = ({
  alertId,
  totalAlerts,
  savedObjectId,
  rule,
}) => {
  const { openFlyout } = useExpandableFlyoutApi();
  const {
    rulesPrivileges: {
      rules: { read: canReadRules },
    },
  } = useUserPrivileges();

  const ruleId = rule?.id ?? null;
  const ruleName = rule?.name ?? null;

  // Only fetch live alert data when the attachment does not already carry rule info.
  const hasRuleIdFromMetadata = !isEmpty(ruleId);
  const idsToFetch = useMemo(
    () => (hasRuleIdFromMetadata ? [] : [alertId]),
    [hasRuleIdFromMetadata, alertId]
  );
  const [loadingAlertData, alertsData] = useFetchAlertData(idsToFetch);

  const { ruleId: resolvedRuleId, ruleName: resolvedRuleName } = useMemo(
    () =>
      getRuleInfo({
        ruleId,
        ruleName,
        alertId,
        alertData: alertsData,
        extraIdPaths: SECURITY_EXTRA_RULE_ID_PATHS,
        extraNamePaths: SECURITY_EXTRA_RULE_NAME_PATHS,
      }),
    [ruleId, ruleName, alertId, alertsData]
  );

  const onRuleClick = useCallback(() => {
    if (resolvedRuleId && canReadRules) {
      openFlyout({ right: { id: RulePanelKey, params: { ruleId: resolvedRuleId } } });
    }
  }, [openFlyout, canReadRules, resolvedRuleId]);

  if (loadingAlertData) {
    return <EuiLoadingSpinner size="m" />;
  }

  const label =
    totalAlerts === 1
      ? i18n.ALERT_COMMENT_LABEL_TITLE
      : i18n.MULTIPLE_ALERTS_COMMENT_LABEL_TITLE(totalAlerts);

  return (
    <UserActionTitle
      label={label}
      link={{
        targetId: resolvedRuleId,
        label: resolvedRuleName,
        fallbackLabel: i18n.UNKNOWN_RULE,
        dataTestSubj: `alert-rule-link-${savedObjectId}`,
        onClick: onRuleClick,
      }}
      dataTestSubj={`alerts-user-action-${savedObjectId}`}
    />
  );
};

AlertEvent.displayName = 'AlertEvent';
