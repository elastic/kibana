/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { SpikeEntity } from '../../../common/api/entity_analytics';

export const RiskScoreSpikeBadges: React.FC<{
  spike: SpikeEntity;
}> = ({ spike }) => {
  return (
    <EuiFlexGroup alignItems="flexStart" gutterSize="s">
      {!!spike.baseline && (
        <EuiFlexItem grow={false}>
          <EuiBadge color="warning" iconType="warning">
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.scoreSpikesCallout.spikeAboveBaseline"
              defaultMessage="Score +{spike} above baseline"
              values={{ spike: Math.round(spike.spike) }}
            />
          </EuiBadge>
        </EuiFlexItem>
      )}
      {!spike.baseline && (
        <>
          <EuiFlexItem grow={false}>
            <EuiBadge color="success" iconType="asterisk">
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.scoreSpikesCallout.newScore"
                defaultMessage="New score"
              />
            </EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="danger" iconType="warning">
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.scoreSpikesCallout.highFirstScore"
                defaultMessage="High first score"
              />
            </EuiBadge>
          </EuiFlexItem>
        </>
      )}
    </EuiFlexGroup>
  );
};
