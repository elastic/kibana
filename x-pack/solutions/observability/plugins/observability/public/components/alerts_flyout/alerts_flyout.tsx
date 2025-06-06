/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlyout, EuiFlyoutHeader, EuiFlyoutProps } from '@elastic/eui';
import { ALERT_UUID } from '@kbn/rule-data-utils';

import type { Alert } from '@kbn/alerting-types';
import { AlertsFlyoutHeader } from './alerts_flyout_header';
import { AlertsFlyoutBody } from './alerts_flyout_body';
import { AlertsFlyoutFooter } from './alerts_flyout_footer';
import type { ObservabilityRuleTypeRegistry } from '../../rules/create_observability_rule_type_registry';
import { useFetchRule } from '../../hooks/use_fetch_rule';

type AlertsFlyoutProps = {
  alert?: Alert;
  alerts?: Alert[];
  selectedAlertId?: string;
  observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry;
} & EuiFlyoutProps;

export function AlertsFlyout({
  alert,
  alerts,
  onClose,
  selectedAlertId,
  observabilityRuleTypeRegistry,
}: AlertsFlyoutProps) {
  const selectedAlert = useMemo(
    () => alert ?? alerts?.find((a) => a[ALERT_UUID] === selectedAlertId),
    [alert, alerts, selectedAlertId]
  );
  const { rule } = useFetchRule({
    ruleId: selectedAlert?.['kibana.alert.rule.uuid']?.[0]?.toString(),
  });

  if (!selectedAlert || !rule) {
    return null;
  }

  return (
    <EuiFlyout className="oblt__flyout" onClose={onClose} size="m" data-test-subj="alertsFlyout">
      <EuiFlyoutHeader hasBorder>
        <AlertsFlyoutHeader alert={selectedAlert} />
      </EuiFlyoutHeader>
      <AlertsFlyoutBody
        rule={rule}
        alert={selectedAlert}
        observabilityRuleTypeRegistry={observabilityRuleTypeRegistry}
      />
      <AlertsFlyoutFooter
        alert={selectedAlert}
        observabilityRuleTypeRegistry={observabilityRuleTypeRegistry}
      />
    </EuiFlyout>
  );
}

// eslint-disable-next-line import/no-default-export
export default AlertsFlyout;
