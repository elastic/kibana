/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiButton, EuiCallOut } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { useRiskScoreSpikes } from '../api/hooks/use_risk_score_spikes';
import { RiskScoreSpikeDetailsPanelKey } from '../../flyout/risk_score_spike_details';

export const ScoreSpikesCallout = () => {
  const { isLoading: loadingSpikes, error: spikesError, data: spikesData } = useRiskScoreSpikes();
  const { openRightPanel } = useExpandableFlyoutApi();

  const onClick = () => {
    openRightPanel({
      id: RiskScoreSpikeDetailsPanelKey,
      params: {
        spikes: spikesData,
      },
    });
  };

  if (loadingSpikes) {
    return null;
  }

  if (spikesError) {
    return null;
  }

  if (!spikesData) {
    return null;
  }

  const { spikesAboveBaseline, newScoreSpikes } = spikesData;

  if (!spikesAboveBaseline?.length && !newScoreSpikes?.length) {
    return null;
  }

  return (
    <EuiCallOut
      css={{ marginBottom: '16px' }}
      title={
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.scoreSpikesCallout.title"
          defaultMessage="Entity risk score spikes detected"
        />
      }
      iconType="iInCircle"
      color="warning"
      data-test-subj="score-spikes-callout"
    >
      <FormattedMessage
        id="xpack.securitySolution.entityAnalytics.scoreSpikesCallout.description"
        defaultMessage="Some entities scores have recently increased significantly. This may indicate a change in the entity's behavior or a new threat. Click the button below to investigate further."
      />
      <EuiButton color="warning" fill onClick={onClick} iconType="magnifyingGlass">
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.scoreSpikesCallout.investigateButton"
          defaultMessage="Investigate"
        />
      </EuiButton>
    </EuiCallOut>
  );
};
