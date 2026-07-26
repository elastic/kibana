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
import { getRuleInfo, type AlertAttachmentMetadata } from '@kbn/cases-plugin/common';
import { getRulesAppDetailsRoute, rulesAppRoute } from '@kbn/rule-data-utils';
import { useKibana } from '../../../../utils/kibana_react';
import {
  ALERT_COMMENT_LABEL_TITLE,
  MULTIPLE_ALERTS_COMMENT_LABEL_TITLE,
  UNKNOWN_RULE,
} from '../translations';
import { useFetchAlertData } from '../../../../hooks/use_fetch_alert_data';

export interface AlertEventProps {
  alertId: string;
  totalAlerts: number;
  savedObjectId: string;
  /**
   * Schema-inferred `metadata.rule` from `ObservabilityAlertAttachmentPayloadSchema`.
   * The component reads `id` / `name` defensively so callers can pass it
   * through without coercion.
   */
  rule: AlertAttachmentMetadata['rule'];
}

export function AlertEvent({ alertId, totalAlerts, savedObjectId, rule }: AlertEventProps) {
  const {
    application: { navigateToUrl },
    http,
  } = useKibana().services;

  const ruleId = rule?.id ?? null;
  const ruleName = rule?.name ?? null;

  // Only fetch rule metadata from the live alert data when the attachment does not already carry rule info.
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
      }),
    [ruleId, ruleName, alertId, alertsData]
  );

  // Build the rule details URL the same way the legacy `cases.tsx`
  // `ruleDetailsNavigation` did: prepend the basePath to the alerting rules
  // app route. `getHref` lets the link render as a real anchor; `onClick`
  // performs SPA navigation so we don't trigger a full page reload.
  const ruleHref = useMemo(
    () =>
      resolvedRuleId
        ? http.basePath.prepend(`${rulesAppRoute}${getRulesAppDetailsRoute(resolvedRuleId)}`)
        : undefined,
    [http, resolvedRuleId]
  );

  const getRuleHref = useCallback(() => ruleHref, [ruleHref]);

  const onRuleClick = useCallback(
    (_targetId: string | null | undefined, ev: React.MouseEvent | MouseEvent) => {
      if (!ruleHref) {
        return;
      }
      ev.preventDefault();
      navigateToUrl(ruleHref);
    },
    [navigateToUrl, ruleHref]
  );

  if (loadingAlertData) {
    return <EuiLoadingSpinner size="m" />;
  }

  const isSingleAlert = totalAlerts === 1;
  const label = isSingleAlert
    ? ALERT_COMMENT_LABEL_TITLE
    : MULTIPLE_ALERTS_COMMENT_LABEL_TITLE(totalAlerts);

  return (
    <UserActionTitle
      label={label}
      link={{
        targetId: resolvedRuleId,
        label: resolvedRuleName,
        fallbackLabel: UNKNOWN_RULE,
        dataTestSubj: `alert-rule-link-${savedObjectId}`,
        getHref: getRuleHref,
        onClick: onRuleClick,
      }}
      dataTestSubj={`alerts-user-action-${savedObjectId}`}
    />
  );
}
