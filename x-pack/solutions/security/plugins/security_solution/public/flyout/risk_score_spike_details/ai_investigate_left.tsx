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
  EuiLoadingSpinner,
  EuiAccordion,
  EuiTitle,
} from '@elastic/eui';
// import type { SpikeEntity } from '../../../common/api/entity_analytics';
// import { RiskScoreSpikeBadges } from './badges';
// import entityImage from './img/entity_high.png';
import { useRiskScoreSpikesAiSummary } from '../../entity_analytics/api/hooks/use_risk_spikes';

// replaces a space followed by numbers followed by a closing bracket ) with a newline and a dash followed by the numbers for
// better readability e,g  1) becomes \n - 1
const constConvertNumbersToLists = (str: string) => {
  const regex = /(\s\d+\))/g;
  return str.replace(regex, (match) => {
    const number = match.trim();
    return `<br/><br/> - ${number}`;
  });
};

export interface InvestigateRiskScoreSpikeExpandableFlyoutProps extends FlyoutPanelProps {
  key: 'investigate-risk-score-spike';
  params: InvestigateRiskScoreSpikePanelProps;
}

export const InvestigateRiskScoreSpikePanelKey: InvestigateRiskScoreSpikeExpandableFlyoutProps['key'] =
  'investigate-risk-score-spike';

export interface InvestigateRiskScoreSpikePanelProps extends Record<string, unknown> {
  spike: SpikeEntity;
}

interface SpikeEntity {
  identifier: string;
  identifierKey: string;
}

export const InvestigateRiskScoreSpikeLeftPanel = ({
  spike,
}: InvestigateRiskScoreSpikePanelProps) => {
  const [connectorId, setConnectorId] = React.useState<string | undefined>(undefined);
  const [performRequest, setPerformRequest] = React.useState(false);
  const { data, isLoading } = useRiskScoreSpikesAiSummary({
    identifier: spike.identifier,
    identifierKey: spike.identifierKey,
    connectorId,
    enabled: performRequest,
  });

  const requestLoading = performRequest && isLoading;

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
          <EuiTitle>
            <h3>{`Investigate Risk Score Spike for ${spike.identifier}`}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{/* <RiskScoreSpikeBadges spike={spike} /> */}</EuiFlexItem>
        <EuiHorizontalRule margin="m" />
        <EuiFlexItem grow={false}>
          {!data && (
            <EuiFlexGroup direction="row" gutterSize="s" justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <ConnectorSelectorInline
                  onConnectorSelected={noop}
                  onConnectorIdSelected={onConnectorIdSelected}
                  selectedConnectorId={connectorId}
                />
                <EuiSpacer size="xl" />
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {!data && (
            <EuiFlexGroup justifyContent="center">
              <EuiFlexItem grow={false}>
                <EuiButton
                  iconType="arrowRight"
                  iconSide="right"
                  onClick={() => setPerformRequest(true)}
                  isDisabled={!connectorId || requestLoading}
                  size="m"
                  css={{ maxWidth: '200px' }}
                >
                  {requestLoading ? <EuiLoadingSpinner size="s" /> : 'Begin Investigation'}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
          {data && (
            <EuiFlexGroup direction="column" gutterSize="m">
              <EuiFlexItem grow={false}>
                <EuiAccordion
                  id="risk-summary"
                  buttonContent={
                    <EuiTitle>
                      <h5>{'Risk Summary'}</h5>
                    </EuiTitle>
                  }
                  initialIsOpen={true}
                >
                  <EuiSpacer size="s" />
                  <EuiText>
                    <span
                      // eslint-disable-next-line react/no-danger
                      dangerouslySetInnerHTML={{
                        __html: constConvertNumbersToLists(data.summary),
                      }}
                    />
                  </EuiText>
                </EuiAccordion>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiAccordion
                  id="detailed-explanation"
                  buttonContent={
                    <EuiTitle>
                      <h5>{'Detailed Explanation'}</h5>
                    </EuiTitle>
                  }
                >
                  <EuiSpacer size="s" />
                  <EuiText>
                    <span
                      // eslint-disable-next-line react/no-danger
                      dangerouslySetInnerHTML={{
                        __html: constConvertNumbersToLists(data.detailedExplanation),
                      }}
                    />
                  </EuiText>
                </EuiAccordion>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiAccordion
                  id="recommendations"
                  buttonContent={
                    <EuiTitle>
                      <h5>{'Recommendations'}</h5>
                    </EuiTitle>
                  }
                >
                  <EuiSpacer size="s" />
                  <EuiText>
                    <span
                      // eslint-disable-next-line react/no-danger
                      dangerouslySetInnerHTML={{
                        __html: constConvertNumbersToLists(data.recommendations),
                      }}
                    />
                  </EuiText>
                </EuiAccordion>
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

InvestigateRiskScoreSpikeLeftPanel.displayName = 'InvestigateRiskScoreSpikePanel';
