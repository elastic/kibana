/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import { type DataTableRecord, getFieldValue } from '@kbn/discover-utils';
import { ALERT_RULE_PARAMETERS } from '@kbn/rule-data-utils';
import type { Threats } from '@kbn/securitysolution-io-ts-alerting-types';
import type { FC } from 'react';
import React, { useMemo } from 'react';
import { buildThreatDescription } from '../../../../detection_engine/rule_creation_ui/components/description_step/helpers';
import { MITRE_ATTACK_DETAILS_TEST_ID, MITRE_ATTACK_TITLE_TEST_ID } from './test_ids';

/**
 * Retrieves mitre attack information from the alert document.
 */
const getMitreComponentParts = (hit: DataTableRecord) => {
  const raw = getFieldValue(hit, ALERT_RULE_PARAMETERS);
  const ruleParameters = typeof raw === 'string' ? JSON.parse(raw) : raw;
  const firstParam = Array.isArray(ruleParameters) ? ruleParameters[0] : ruleParameters;
  const threat = firstParam?.threat ?? null;
  if (!threat) {
    return null;
  }

  const threats: Threats = Array.isArray(threat) ? (threat as Threats) : ([threat] as Threats);
  return buildThreatDescription({
    label: threats[0].framework,
    threat: threats,
  });
};

export interface MitreAttackProps {
  /**
   * Alert/event document
   */
  hit: DataTableRecord;
}

/**
 * Displays MITRE ATT&CK tactics and techniques extracted from the alert rule parameters.
 * Returns null when no threat data is available.
 */
export const MitreAttack: FC<MitreAttackProps> = ({ hit }) => {
  const threatDetails = useMemo(() => getMitreComponentParts(hit), [hit]);

  if (!threatDetails || !threatDetails[0]) {
    return null;
  }

  return (
    <>
      <EuiSpacer size="m" />
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiSpacer size="m" />
        <EuiFlexItem data-test-subj={MITRE_ATTACK_TITLE_TEST_ID}>
          <EuiTitle size="xxs">
            <h5>{threatDetails[0].title}</h5>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem data-test-subj={MITRE_ATTACK_DETAILS_TEST_ID}>
          {threatDetails[0].description}
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

MitreAttack.displayName = 'MitreAttack';
