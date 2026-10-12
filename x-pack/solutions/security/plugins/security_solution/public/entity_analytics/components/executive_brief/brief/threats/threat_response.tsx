/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiText, EuiTitle } from '@elastic/eui';
import type { BriefThreat } from '../../../../../../common/entity_analytics/executive_brief/brief';
import type { Fact } from '../../../../../../common/entity_analytics/executive_brief/evidence';
import { FactEvidenceChip } from '../../evidence/evidence_chip';
import { STATUS_COLOR, STATUS_LABEL } from './labels';

const RESPONSE_TITLE = 'Response';

const sumNumbers = (facts: readonly Fact[], key: string): number =>
  facts.reduce((total, { numbers }) => total + (numbers?.[key] ?? 0), 0);

interface ThreatResponseProps {
  threat: BriefThreat;
  /** The threat's cited `alert_response` and `case` facts. */
  responseFacts: readonly Fact[];
}

/** The response state, the threat's cases and the alert handling counts. */
export const ThreatResponse: React.FC<ThreatResponseProps> = ({ threat, responseFacts }) => {
  const cases = responseFacts.filter(({ kind }) => kind === 'case');
  const alertFacts = responseFacts.filter(({ kind }) => kind === 'alert_response');

  return (
    <div data-test-subj="executiveBriefResponse">
      <EuiTitle size="xxs">
        <h5>{RESPONSE_TITLE}</h5>
      </EuiTitle>
      <EuiFlexGroup gutterSize="s" alignItems="center" wrap responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiBadge
            color={STATUS_COLOR[threat.status]}
            data-test-subj="executiveBriefResponseState"
          >
            {STATUS_LABEL[threat.status]}
          </EuiBadge>
        </EuiFlexItem>
        {cases.map((fact) => (
          <EuiFlexItem grow={false} key={fact.id}>
            <EuiText size="s">
              <FactEvidenceChip fact={fact} />
            </EuiText>
          </EuiFlexItem>
        ))}
        {alertFacts.length > 0 && (
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow" data-test-subj="executiveBriefResponseAlerts">
              {`${sumNumbers(alertFacts, 'open')} open · ${sumNumbers(
                alertFacts,
                'acknowledged'
              )} acknowledged · ${sumNumbers(alertFacts, 'closed')} closed`}
            </EuiBadge>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </div>
  );
};
