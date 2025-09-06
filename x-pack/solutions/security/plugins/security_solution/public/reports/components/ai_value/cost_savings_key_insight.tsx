/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { MessageRole } from '@kbn/inference-common';
import type { VisualizationTablesWithMeta } from '../../../common/components/visualization_actions/types';
import { DEFAULT_AI_CONNECTOR } from '../../../../common/constants';
import { useKibana } from '../../../common/lib/kibana';
import * as i18n from './translations';
import { licenseService } from '../../../common/hooks/use_license';
import { useAssistantAvailability } from '../../../assistant/use_assistant_availability';
import { useFindCostSavingsPrompts } from '../../hooks/use_find_cost_savings_prompts';

interface Props {
  lensResponse: VisualizationTablesWithMeta | null;
}

export const CostSavingsKeyInsight: React.FC<Props> = ({ lensResponse }) => {
  const {
    euiTheme: { size },
  } = useEuiTheme();

  const { http, notifications, inference, uiSettings } = useKibana().services;
  const connectorId = uiSettings.get<string>(DEFAULT_AI_CONNECTOR);
  const [insightResult, setInsightResult] = useState<string>('');

  const hasEnterpriseLicence = licenseService.isEnterprise();
  const { hasAssistantPrivilege, isAssistantEnabled } = useAssistantAvailability();
  const prompts = useFindCostSavingsPrompts({
    context: {
      isAssistantEnabled:
        hasEnterpriseLicence && (isAssistantEnabled ?? false) && (hasAssistantPrivilege ?? false),
      httpFetch: http.fetch,
      toasts: notifications.toasts,
    },
    params: {
      prompt_group_id: 'aiForSoc',
      prompt_ids: ['costSavingsInsightPart1', 'costSavingsInsightPart2'],
    },
  });

  useEffect(() => {
    const fetchInsight = async () => {
      if (lensResponse && connectorId && prompts !== null) {
        try {
          const prompt = getPrompt(JSON.stringify(lensResponse), prompts);
          const result = await inference.chatComplete({
            connectorId,
            messages: [{ role: MessageRole.User, content: prompt }],
          });
          setInsightResult(result.content);
        } catch (error) {
          // Silently handle error - could add proper error state handling here
        }
      }
    };

    fetchInsight();
  }, [connectorId, lensResponse, inference, prompts]);
  return (
    <div
      data-test-subj="alertProcessingKeyInsightsContainer"
      css={css`
        background: linear-gradient(
          112deg,
          rgba(89, 159, 254, 0.08) 3.58%,
          rgba(240, 78, 152, 0.08) 98.48%
        );
        border-radius: ${size.s};
        padding: ${size.base};
        min-height: 200px;
      `}
    >
      <span>
        <EuiFlexGroup
          gutterSize="s"
          alignItems="center"
          responsive={false}
          data-test-subj="alertProcessingKeyInsightsGreetingGroup"
        >
          <EuiFlexItem grow={false}>
            <EuiIcon type="logoElastic" size="m" data-test-subj="alertProcessingKeyInsightsLogo" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="xs">
              <p data-test-subj="alertProcessingKeyInsightsGreeting">{i18n.KEY_INSIGHT}</p>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="m" />

        <EuiText
          size="s"
          css={css`
            line-height: 1.6em;
          `}
        >
          {insightResult ? (
            <div
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: insightResult }}
            />
          ) : (
            <EuiSkeletonText lines={3} size="s" isLoading={true} />
          )}
        </EuiText>
      </span>
    </div>
  );
};

const getPrompt = (result: string, prompts: { part1: string; part2: string }) => {
  const prompt = `${prompts.part1}

\`\`\`
${result}
\`\`\`

${prompts.part2}`;

  return prompt;
};
