/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import { ALERT_CASE_IDS, ALERT_STATUS_ACTIVE, ALERT_UUID } from '@kbn/rule-data-utils';
import moment from 'moment';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { i18n } from '@kbn/i18n';
import { RuleFormFlyout } from '@kbn/response-ops-rule-form/flyout';
import { METRIC_TYPE, useUiTracker } from '@kbn/observability-shared-plugin/public';
import type { TopAlert } from '../../../typings/alerts';
import { useKibana } from '../../../utils/kibana_react';
import { useBulkUntrackAlerts } from '../hooks/use_bulk_untrack_alerts';

function StaleAlert({
  alert,
  alertIndex,
  alertStatus,
  rule,
  refetchRule,
  onUntrackAlert,
}: {
  alert: TopAlert;
  alertIndex: string | undefined;
  alertStatus: string | undefined;
  rule: Rule | undefined;
  refetchRule: () => void;
  onUntrackAlert: () => void;
}) {
  const { services } = useKibana();
  const {
    triggersActionsUi: { ruleTypeRegistry, actionTypeRegistry },
  } = services;
  const [ruleConditionsFlyoutOpen, setRuleConditionsFlyoutOpen] = useState<boolean>(false);
  const { mutateAsync: untrackAlerts } = useBulkUntrackAlerts();
  const trackEvent = useUiTracker();
  const handleUntrackAlert = useCallback(async () => {
    const alertUuid = alert?.fields[ALERT_UUID];
    if (alertUuid && alertIndex) {
      await untrackAlerts({
        indices: [alertIndex],
        alertUuids: [alertUuid],
      });
      onUntrackAlert();
    }
  }, [alert?.fields, alertIndex, untrackAlerts, onUntrackAlert]);
  const handleEditRuleDetails = () => {
    setRuleConditionsFlyoutOpen(true);
  };
  const isAlertStale = useMemo(() => {
    if (alertStatus === ALERT_STATUS_ACTIVE) {
      const numOfCases = alert.fields[ALERT_CASE_IDS]?.length || 0;
      const timestamp = alert.start;
      const givenDate = moment(timestamp);
      const now = moment();
      const diffInDays = now.diff(givenDate, 'days');

      // The heuristics to show the stale alert callout are:
      // 1. The alert has been active for more than 5 days

      if (diffInDays >= 5) {
        trackEvent({
          app: 'alerts',
          metricType: METRIC_TYPE.LOADED,
          metric: `alert_details_alert_stale_callout__ruleType_${rule?.ruleTypeId}`,
        });
        return {
          isStale: true,
          days: diffInDays,
          cases: numOfCases,
        };
      }
    } else {
      return {
        isStale: false,
        days: 0,
        cases: 0,
      };
    }
  }, [alert.fields, alert.start, alertStatus, rule?.ruleTypeId, trackEvent]);

  return (
    <>
      {isAlertStale?.isStale && (
        <KbnWarningCallout
          announceOnMount
          data-test-subj="o11yAlertDetailsAlertStaleCallout"
          title={i18n.translate('xpack.observability.alertDetails.staleAlertCallout.title', {
            defaultMessage: 'This alert may be stale',
          })}
          text={i18n.translate('xpack.observability.alertDetails.staleAlertCallout.message', {
            defaultMessage:
              'This alert has been active for {numOfDays} days and is assigned to {numOfCases} {cases}.',
            values: {
              numOfDays: isAlertStale?.days,
              numOfCases: isAlertStale?.cases,
              cases: isAlertStale?.cases > 1 ? 'cases' : 'case',
            },
          })}
          actionProps={{
            primary: {
              'data-test-subj': 'o11yAlertDetailsAlertStaleCalloutMarkAsUntrackedButton',
              iconType: 'eyeSlash',
              onClick: handleUntrackAlert,
              children: i18n.translate(
                'xpack.observability.alertDetails.alertStaleCallout.markAsUntrackedButton',
                {
                  defaultMessage: 'Untrack',
                }
              ),
            },
            secondary: {
              'data-test-subj': 'o11yAlertDetailsAlertStaleCalloutEditRule',
              iconType: 'pencil',
              onClick: handleEditRuleDetails,
              children: i18n.translate(
                'xpack.observability.alertDetails.alertStaleCallout.editRuleButton',
                {
                  defaultMessage: 'Edit rule',
                }
              ),
            },
          }}
        />
      )}
      {rule && ruleConditionsFlyoutOpen ? (
        <RuleFormFlyout
          plugins={{ ...services, ruleTypeRegistry, actionTypeRegistry }}
          id={rule.id}
          onCancel={() => {
            setRuleConditionsFlyoutOpen(false);
          }}
          onSubmit={() => {
            setRuleConditionsFlyoutOpen(false);
            refetchRule();
          }}
        />
      ) : null}
    </>
  );
}

// eslint-disable-next-line import/no-default-export
export default StaleAlert;
