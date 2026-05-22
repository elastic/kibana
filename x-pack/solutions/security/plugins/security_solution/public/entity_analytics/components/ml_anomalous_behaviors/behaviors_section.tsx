/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
  useEuiFontSize,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { AnomalyRow } from './anomaly_row';
import { useBehavioralSummary } from '../../api/hooks/use_behavioral_summary';
import { MOCK_ANOMALIES } from './anomalies';

const SHOW_MOCK_ANOMALIES = true;
interface BehaviorsSectionProps {
  entityId: string;
}

export const BehaviorsSection: React.FC<BehaviorsSectionProps> = ({ entityId }) => {
  const xxsFontSize = useEuiFontSize('xxs').fontSize;
  const { data } = useBehavioralSummary(entityId);
  const anomalies = SHOW_MOCK_ANOMALIES ? MOCK_ANOMALIES : data?.anomalies ?? [];

  if (!anomalies.length) return null;

  return (
    <EuiAccordion
      id={'entity_behaviors'}
      buttonContent={
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h3>
                <FormattedMessage
                  id="xpack.securitySolution.flyout.entityBehaviors.title"
                  defaultMessage="Behaviors"
                />
              </h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="primary">
              <FormattedMessage
                id="xpack.securitySolution.flyout.entityBehaviors.numAnomalies"
                defaultMessage="{num} anomalies"
                values={{ num: anomalies.length }}
              />
            </EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      extraAction={
        <span
          data-test-subj="behaviorsSectionTimeRange"
          css={css`
            font-size: ${xxsFontSize};
          `}
        >
          <FormattedMessage
            id="xpack.securitySolution.flyout.entityBehaviors.timeRange"
            defaultMessage="Last 90 days"
          />
        </span>
      }
    >
      <EuiSpacer size="m" />
      {anomalies.map((anomaly, idx) => (
        <AnomalyRow key={`${anomaly.jobId}-${idx}`} anomaly={anomaly} />
      ))}
    </EuiAccordion>
  );
};
