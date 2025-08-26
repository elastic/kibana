/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import {
  ConnectorSelectorInline,
  useAssistantContext,
  useFetchAnonymizationFields,
  useLoadConnectors,
} from '@kbn/elastic-assistant';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiButton,
  EuiLoadingSpinner,
  EuiTitle,
} from '@elastic/eui';
import { replaceAnonymizedValuesWithOriginalValues } from '@kbn/elastic-assistant-common';
import useToggle from 'react-use/lib/useToggle';
import { AttackDiscoveryMarkdownFormatter } from '../../../../../attack_discovery/pages/results/attack_discovery_markdown_formatter';
import { useKibana } from '../../../../../common/lib/kibana/use_kibana';
import { useRiskScoreAiSummary } from '../../../../api/hooks/use_risk_summary';

export interface ExplainWithAIProps extends Record<string, unknown> {
  identifier: string;
  identifierKey: string;
}

export const ExplainWithAI = ({ identifier, identifierKey }: ExplainWithAIProps) => {
  const { http } = useKibana().services;
  const [connectorId, setConnectorId] = React.useState<string | undefined>(undefined);
  const [performRequest, setPerformRequest] = React.useState(false);
  // const effectiveGenAiConfig = getGenAiConfig(effectiveConnector);

  const { data: aiConnectors } = useLoadConnectors({
    http,
  });

  const { data: anonymizationFields } = useFetchAnonymizationFields();

  const selectedConnector = aiConnectors?.find((connector) => connector.id === connectorId);
  const { traceOptions, alertsIndexPattern } = useAssistantContext();
  const { data, isLoading } = useRiskScoreAiSummary({
    identifier,
    identifierKey,
    enabled: performRequest,
    selectedConnector,
    size: 30,
    start: 'now-30d',
    end: 'now',
    traceOptions,

    alertsIndexPattern,
    anonymizationFields,
  });

  const requestLoading = performRequest && isLoading;

  const onConnectorIdSelected = (newId: string) => {
    setConnectorId(newId);
  };

  const noop = () => {
    // No operation
  };

  const summaryMarkdownWithReplacements = useMemo(
    () =>
      replaceAnonymizedValuesWithOriginalValues({
        messageContent: data?.summary ?? '',
        replacements: data?.replacements ?? {},
      }),
    [data?.replacements, data?.summary]
  );

  const detailedExplanationMarkdownWithReplacements = useMemo(
    () =>
      replaceAnonymizedValuesWithOriginalValues({
        messageContent: data?.detailedExplanation ?? '',
        replacements: data?.replacements ?? {},
      }),
    [data?.detailedExplanation, data?.replacements]
  );

  const recommendationMarkdownWithReplacements = useMemo(
    () =>
      replaceAnonymizedValuesWithOriginalValues({
        messageContent: data?.recommendations ?? '',
        replacements: data?.replacements ?? {},
      }),
    [data?.recommendations, data?.replacements]
  );

  const [showAnonymized, toggleShowAnonymized] = useToggle(false);

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
              <EuiFlexItem grow={0} style={{ width: '30%' }}>
                <EuiButton onClick={toggleShowAnonymized}>
                  {showAnonymized ? 'Hide Anonymized Values' : 'Show Anonymized Values'}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiTitle size="xs">
                  <h5>{'Risk Summary'}</h5>
                </EuiTitle>

                <EuiSpacer size="s" />
                <EuiText>
                  <AttackDiscoveryMarkdownFormatter
                    disableActions={false}
                    markdown={showAnonymized ? data?.summary : summaryMarkdownWithReplacements}
                  />
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiTitle size="xs">
                  <h5>{'Detailed Explanation'}</h5>
                </EuiTitle>

                <EuiSpacer size="s" />
                <EuiText>
                  <AttackDiscoveryMarkdownFormatter
                    disableActions={false}
                    markdown={
                      showAnonymized
                        ? data.detailedExplanation
                        : detailedExplanationMarkdownWithReplacements
                    }
                  />
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiTitle size="xs">
                  <h5>{'Recommendations'}</h5>
                </EuiTitle>

                <EuiSpacer size="s" />
                <EuiText>
                  <AttackDiscoveryMarkdownFormatter
                    disableActions={false}
                    markdown={
                      showAnonymized ? data.recommendations : recommendationMarkdownWithReplacements
                    }
                  />
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

ExplainWithAI.displayName = 'ExplainWithAI';
