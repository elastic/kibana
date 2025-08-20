/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

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
import { useRiskScoreAiSummary } from '../../../../api/hooks/use_risk_summary';

// replaces a space followed by numbers followed by a closing bracket ) with a newline and a dash followed by the numbers for
// better readability e,g  1) becomes \n - 1
const constConvertNumbersToLists = (str: string) => {
  const regex = /(\s\d+\))/g;
  return str.replace(regex, (match) => {
    const number = match.trim();
    return `<br/><br/> - ${number}`;
  });
};

export interface ExplainWithAIProps extends Record<string, unknown> {
  identifier: string;
  identifierKey: string;
}

export const ExplainWithAI = ({ identifier, identifierKey }: ExplainWithAIProps) => {
  const [connectorId, setConnectorId] = React.useState<string | undefined>(undefined);
  const [performRequest, setPerformRequest] = React.useState(false);
  const { data, isLoading } = useRiskScoreAiSummary({
    identifier,
    identifierKey,
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
            <h3>{`Explain Risk Score Contributions for ${identifier}`}</h3>
          </EuiTitle>
        </EuiFlexItem>
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

ExplainWithAI.displayName = 'ExplainWithAI';
