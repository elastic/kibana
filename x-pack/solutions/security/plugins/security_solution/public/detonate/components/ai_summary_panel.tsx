/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { useFetchAnonymizationFields } from '@kbn/elastic-assistant';
import { useLoadConnectors } from '@kbn/inference-connectors';

import { useKibana } from '../../common/lib/kibana';
import { useDetonationAiSummary } from '../hooks/use_detonation_ai_summary';
import {
  AI_SUMMARY_ACTIONS,
  AI_SUMMARY_DISCLAIMER,
  AI_SUMMARY_ERROR,
  AI_SUMMARY_GENERATE,
  AI_SUMMARY_GENERATING,
  AI_SUMMARY_IOCS,
  AI_SUMMARY_NO_CONNECTOR,
  AI_SUMMARY_NO_CONNECTOR_BODY,
  AI_SUMMARY_PROMPT,
  AI_SUMMARY_REGENERATE,
  AI_SUMMARY_TITLE,
} from '../translations';

const DETONATE_AI_FEATURE_ID = 'detonate_summary';

interface AiSummaryPanelProps {
  taskId: string;
  /**
   * Whether the detonation produced any alerts. A detonation that produced none has nothing for the
   * model to describe, so it keeps the summary behind the button rather than spending a call on it.
   */
  hasAlerts: boolean;
}

const AiSummaryPanelComponent: React.FC<AiSummaryPanelProps> = ({ taskId, hasAlerts }) => {
  const { http, settings } = useKibana().services;
  const { data: anonymizationFields } = useFetchAnonymizationFields();
  const { data: aiConnectors, isLoading: isLoadingConnectors } = useLoadConnectors({
    http,
    featureId: DETONATE_AI_FEATURE_ID,
    settings,
  });

  const connectorId = useMemo(() => aiConnectors?.[0]?.id ?? '', [aiConnectors]);

  // Left undefined until the configuration loads, which holds the generation back rather than
  // letting it run with nothing anonymized.
  const { summary, isGenerating, error, generate } = useDetonationAiSummary({
    taskId,
    connectorId,
    anonymizationFields: anonymizationFields?.data,
    autoStart: hasAlerts,
  });

  const body = (() => {
    if (isLoadingConnectors) {
      return <EuiLoadingSpinner size="m" />;
    }

    if (!connectorId) {
      return (
        <EuiEmptyPrompt
          iconType="sparkles"
          title={<h4>{AI_SUMMARY_NO_CONNECTOR}</h4>}
          body={<p>{AI_SUMMARY_NO_CONNECTOR_BODY}</p>}
        />
      );
    }

    return (
      <>
        {error && (
          <>
            <EuiCallOut
              announceOnMount
              title={AI_SUMMARY_ERROR}
              color="danger"
              iconType="error"
              size="s"
            />
            <EuiSpacer size="s" />
          </>
        )}

        {summary === null ? (
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            {isGenerating && (
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="m" />
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
                {isGenerating ? AI_SUMMARY_GENERATING : AI_SUMMARY_PROMPT}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          <>
            <EuiText size="s">
              <p>{summary.summary}</p>
            </EuiText>

            {summary.iocs.length > 0 && (
              <>
                <EuiSpacer size="m" />
                <EuiTitle size="xxs">
                  <h4>{AI_SUMMARY_IOCS}</h4>
                </EuiTitle>
                <EuiSpacer size="xs" />
                <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
                  {summary.iocs.map((ioc) => (
                    <EuiFlexItem grow={false} key={`${ioc.type}-${ioc.value}`}>
                      <EuiBadge color="hollow">{`${ioc.type}: ${ioc.value}`}</EuiBadge>
                    </EuiFlexItem>
                  ))}
                </EuiFlexGroup>
              </>
            )}

            {summary.recommendedActions.length > 0 && (
              <>
                <EuiSpacer size="m" />
                <EuiTitle size="xxs">
                  <h4>{AI_SUMMARY_ACTIONS}</h4>
                </EuiTitle>
                <EuiText size="s">
                  <ul>
                    {summary.recommendedActions.map((action) => (
                      <li key={action}>{action}</li>
                    ))}
                  </ul>
                </EuiText>
              </>
            )}

            <EuiSpacer size="s" />
            <EuiText size="xs" color="subdued">
              {AI_SUMMARY_DISCLAIMER}
            </EuiText>
          </>
        )}

        <EuiSpacer size="m" />
        <EuiButton
          size="s"
          iconType="sparkles"
          onClick={generate}
          isLoading={isGenerating}
          data-test-subj="detonateGenerateSummary"
        >
          {summary === null ? AI_SUMMARY_GENERATE : AI_SUMMARY_REGENERATE}
        </EuiButton>
      </>
    );
  })();

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj="detonateAiSummary">
      <EuiTitle size="xs">
        <h3>{AI_SUMMARY_TITLE}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      {body}
    </EuiPanel>
  );
};

export const AiSummaryPanel = React.memo(AiSummaryPanelComponent);
