/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { AttackAttachmentMetadata } from '../../../../../common/cases/attachments/attack';
import {
  ATTACK_ALERT_COUNT_TEST_ID,
  ATTACK_ENTITY_COUNT_TEST_ID,
  ATTACK_RISK_SCORE_TEST_ID,
  ATTACK_SUMMARY_TEST_ID,
  ATTACK_TITLE_TEST_ID,
} from '../../../../../common/cases/attachments/attack/test_ids';

export interface AttackChildrenProps {
  /**
   * Attack document `_id` saved as the attachment id.
   */
  id: string;
  /**
   * Metadata saved in the case attachment (attack).
   */
  metadata: AttackAttachmentMetadata;
}

interface FieldRowProps {
  label: React.ReactNode;
  value: React.ReactNode;
  valueTestSubj: string;
}

const FieldRow: FC<FieldRowProps> = ({ label, value, valueTestSubj }) => (
  <EuiFlexGroup gutterSize="s">
    <EuiFlexItem grow={false}>
      <EuiText size="s">
        <strong>{label}</strong>
      </EuiText>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiText size="s">
        <p data-test-subj={valueTestSubj}>{value}</p>
      </EuiText>
    </EuiFlexItem>
  </EuiFlexGroup>
);

/**
 * Renders the attack preview card (title, summary snippet, risk score, alert count and
 * entity count) in the case activity log. Renders directly from the persisted metadata
 * and never fetches the attack: the activity feed can hold dozens of attachments, and the
 * card must still say something useful once the attack ages into a cold or frozen tier.
 *
 * Metadata cannot be backfilled onto attachments written by an earlier release, so every
 * optional field is guarded.
 */
export const AttackChildren: FC<AttackChildrenProps> = ({ metadata }) => {
  const { title, summaryMarkdown, riskScore, alertCount, entityCount } = metadata;

  return (
    <EuiFlexGroup gutterSize="s" direction="column">
      <EuiFlexItem grow={false}>
        <EuiText size="s">
          <h4 data-test-subj={ATTACK_TITLE_TEST_ID}>{title}</h4>
        </EuiText>
      </EuiFlexItem>
      {summaryMarkdown != null && (
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued">
            <p data-test-subj={ATTACK_SUMMARY_TEST_ID}>{summaryMarkdown}</p>
          </EuiText>
        </EuiFlexItem>
      )}
      {riskScore != null && (
        <FieldRow
          label={
            <FormattedMessage
              id="xpack.securitySolution.attackDiscovery.cases.attackRiskScore"
              defaultMessage="Risk score:"
            />
          }
          value={riskScore}
          valueTestSubj={ATTACK_RISK_SCORE_TEST_ID}
        />
      )}
      {alertCount != null && (
        <FieldRow
          label={
            <FormattedMessage
              id="xpack.securitySolution.attackDiscovery.cases.attackAlertCount"
              defaultMessage="Alerts:"
            />
          }
          value={alertCount}
          valueTestSubj={ATTACK_ALERT_COUNT_TEST_ID}
        />
      )}
      {entityCount != null && (
        <FieldRow
          label={
            <FormattedMessage
              id="xpack.securitySolution.attackDiscovery.cases.attackEntityCount"
              defaultMessage="Entities:"
            />
          }
          value={entityCount}
          valueTestSubj={ATTACK_ENTITY_COUNT_TEST_ID}
        />
      )}
    </EuiFlexGroup>
  );
};
