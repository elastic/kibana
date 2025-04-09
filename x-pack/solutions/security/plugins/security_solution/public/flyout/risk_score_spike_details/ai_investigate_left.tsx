/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FlyoutPanelProps } from '@kbn/expandable-flyout';
import { ConnectorSelectorInline } from '@kbn/elastic-assistant';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiButton,
  EuiImage,
} from '@elastic/eui';
import type { SpikeEntity } from '../../../common/api/entity_analytics';
import { FlyoutLoading } from '../shared/components/flyout_loading';
import { RiskScoreSpikeBadges } from './badges';
import entityImage from './img/entity_high.png';

export interface InvestigateRiskScoreSpikeExpandableFlyoutProps extends FlyoutPanelProps {
  key: 'investigate-risk-score-spike';
  params: InvestigateRiskScoreSpikePanelProps;
}

export const InvestigateRiskScoreSpikePanelKey: InvestigateRiskScoreSpikeExpandableFlyoutProps['key'] =
  'investigate-risk-score-spike';

export interface InvestigateRiskScoreSpikePanelProps extends Record<string, unknown> {
  spike: SpikeEntity;
}

export const InvestigateRiskScoreSpikeLeftPanel = ({
  spike,
}: InvestigateRiskScoreSpikePanelProps) => {
  const loading = false;
  const [connectorId, setConnectorId] = React.useState<string | undefined>(undefined);

  if (loading) return <FlyoutLoading />;

  const onConnectorIdSelected = (newId: string) => {
    setConnectorId(newId);
  };

  const noop = () => {
    // No operation
  };

  return (
    <EuiPanel hasShadow={false} hasBorder={true}>
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiText>
            <h4>{`Investigate Risk Score Spike for ${spike.identifier}`}</h4>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <RiskScoreSpikeBadges spike={spike} />
        </EuiFlexItem>
        <EuiHorizontalRule margin="m" />
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="row" gutterSize="s" justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <ConnectorSelectorInline
                onConnectorSelected={noop}
                onConnectorIdSelected={onConnectorIdSelected}
                selectedConnectorId={connectorId}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSpacer size="xl" />
          <EuiFlexGroup justifyContent="center">
            <EuiFlexItem grow={false}>
              <EuiImage
                size="m"
                hasShadow={false}
                hasBorder={false}
                alt="Entity"
                url={entityImage}
              />
              <EuiButton
                iconType="arrowRight"
                iconSide="right"
                onClick={() => {
                  // Handle the click event
                }}
                isDisabled={!connectorId}
                size="m"
                css={{ maxWidth: '200px' }}
              >
                {'Begin Investigation'}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

InvestigateRiskScoreSpikeLeftPanel.displayName = 'InvestigateRiskScoreSpikePanel';
