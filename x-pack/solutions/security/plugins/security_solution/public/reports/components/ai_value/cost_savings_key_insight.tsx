/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSkeletonText,
  EuiSpacer,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { Markdown } from '@kbn/shared-ux-markdown';
import { MessageRole } from '@kbn/inference-common';
import { useLoadConnectors } from '@kbn/inference-connectors';
import type { VisualizationTablesWithMeta } from '../../../common/components/visualization_actions/types';
import { useKibana } from '../../../common/lib/kibana';
import * as i18n from './translations';
import { licenseService } from '../../../common/hooks/use_license';
import { useAssistantAvailability } from '../../../assistant/use_assistant_availability';
import { useFindCostSavingsPrompts } from '../../hooks/use_find_cost_savings_prompts';
import { useAIValueExportContext } from '../../providers/ai_value/export_provider';
import { getSampleKeyInsightMarkdown } from './sample_data';

interface Props {
  isSample: boolean;
  from: string;
  to: string;
  lensResponse: VisualizationTablesWithMeta | null;
}

const CostSavingsKeyInsightLoader: React.FC<{
  lensResponse: VisualizationTablesWithMeta | null;
}> = ({ lensResponse }) => {
  const { http, notifications, inference } = useKibana().services;
  const [insightResult, setInsightResult] = useState<string>('');
  const { data: aiConnectors } = useLoadConnectors({
    http,
    featureId: 'ai_value_report',
    toasts: notifications.toasts,
  });
  const defaultConnectorId = aiConnectors?.[0]?.id;
  const exportContext = useAIValueExportContext();
  const setInsightForExportContext = exportContext?.setInsight;

  const hasEnterpriseLicense = licenseService.isEnterprise();
  const { hasAssistantPrivilege, isAssistantEnabled } = useAssistantAvailability();
  const prompts = useFindCostSavingsPrompts({
    context: {
      isAssistantEnabled:
        hasEnterpriseLicense && (isAssistantEnabled ?? false) && (hasAssistantPrivilege ?? false),
      httpFetch: http.fetch,
      toasts: notifications.toasts,
    },
  });
  const fetchInsight = useCallback(async () => {
    if (lensResponse && defaultConnectorId && prompts !== null) {
      try {
        const prompt = getPrompt(JSON.stringify(lensResponse), prompts);
        const result = await inference.chatComplete({
          connectorId: defaultConnectorId,
          messages: [{ role: MessageRole.User, content: prompt }],
        });
        setInsightResult(result.content);
      } catch (error) {
        setInsightResult(
          `${i18n.INSIGHTS_ERROR} ${error.body?.message ?? error.message ?? error.toString()}`
        );
      }
    }
  }, [defaultConnectorId, lensResponse, inference, prompts]);

  useEffect(() => {
    fetchInsight();
  }, [fetchInsight]);
  useEffect(() => {
    if (!lensResponse) setInsightResult('');
  }, [lensResponse]);
  useEffect(() => {
    if (insightResult.length) {
      setInsightForExportContext?.(insightResult);
    }
  }, [setInsightForExportContext, insightResult]);
  return <CostSavingsKeyInsightView insight={insightResult} />;
};

interface ViewProps {
  insight: string;
}

const CostSavingsKeyInsightView: React.FC<ViewProps> = ({ insight }) => {
  const {
    euiTheme: { size, colors },
  } = useEuiTheme();
  const [isRenderComplete, setIsRenderComplete] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isRenderComplete && containerRef.current) {
      containerRef.current.dispatchEvent(new CustomEvent('renderComplete', { bubbles: true }));
    }
  }, [isRenderComplete]);

  const handleMarkdownRender = useCallback(() => {
    setIsRenderComplete(true);
  }, []);

  return (
    <div
      data-test-subj="costSavingsKeyInsightsContainer"
      css={css`
        background: linear-gradient(
          112deg,
          rgba(89, 159, 254, 0.08) 3.58%,
          rgba(240, 78, 152, 0.08) 98.48%
        );
        border-radius: ${size.s};
        padding: ${size.base};
        min-height: 200px;

        .keyInsightMarkdown {
          color: ${colors.textSubdued};
        }
      `}
    >
      <EuiFlexGroup
        gutterSize="s"
        alignItems="flexStart"
        responsive={false}
        data-test-subj="costSavingsKeyInsightsGreetingGroup"
        // These props are necessary when rendering the component in export mode.
        // This attribute signals the export logic that it should wait for this element
        data-shared-item
        // This indicates that it finished loading and therefore it can be exported
        data-render-complete={isRenderComplete}
        ref={containerRef}
      >
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <p data-test-subj="costSavingsKeyInsightsGreeting">{i18n.KEY_INSIGHT}</p>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIcon type="sparkles" color="primary" aria-hidden={true} />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      {insight ? (
        <Markdown
          onRender={handleMarkdownRender}
          markdownContent={insight}
          className="keyInsightMarkdown"
          readOnly
        />
      ) : (
        <EuiSkeletonText lines={3} size="s" isLoading={true} />
      )}
    </div>
  );
};

export const CostSavingsKeyInsight: React.FC<Props> = ({ isSample, from, to, lensResponse }) => {
  const exportContext = useAIValueExportContext();
  const Loading = useMemo(() => <CostSavingsKeyInsightView insight={''} />, []);

  if (isSample) {
    return <CostSavingsKeyInsightView insight={getSampleKeyInsightMarkdown(from, to)} />;
  }

  if (exportContext?.forwardedState?.insight) {
    const {
      forwardedState: { insight },
      isInsightVerified,
      shouldRegenerateInsight,
    } = exportContext;
    if (!isInsightVerified) {
      return Loading;
    }

    if (shouldRegenerateInsight === false) {
      return <CostSavingsKeyInsightView insight={insight} />;
    }
  }

  return <CostSavingsKeyInsightLoader lensResponse={lensResponse} />;
};

const getPrompt = (result: string, prompts: { part1: string; part2: string }) => {
  const prompt = `${prompts.part1}

\`\`\`
${result}
\`\`\`

${prompts.part2}`;

  return prompt;
};
