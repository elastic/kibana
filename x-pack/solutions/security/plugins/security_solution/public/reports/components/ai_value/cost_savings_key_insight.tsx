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

interface Props {
  from: string;
  to: string;
  minutesPerAlert: number;
  analystHourlyRate: number;
  lensResponse: VisualizationTablesWithMeta | null;
}

export const CostSavingsKeyInsight: React.FC<Props> = ({
  minutesPerAlert,
  analystHourlyRate,
  from,
  to,
  lensResponse,
}) => {
  const {
    euiTheme: { size },
  } = useEuiTheme();

  const { inference, uiSettings } = useKibana().services;
  const connectorId = uiSettings.get<string>(DEFAULT_AI_CONNECTOR);
  const [insightResult, setInsightResult] = useState<string>('');

  useEffect(() => {
    const fetchInsight = async () => {
      if (lensResponse && connectorId) {
        try {
          const prompt = getPrompt(JSON.stringify(lensResponse));
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
  }, [connectorId, lensResponse, inference]);
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

const getPrompt = (result: string) => {
  const prompt = `You are given Elasticsearch Lens aggregation results showing cost savings over time:

\`\`\`
${result}
\`\`\`

Generate a concise bulleted summary in HTML markup. Follow the style and tone of the example below, highlighting key trends, averages, peaks, and projections:

\`\`\`
<ul>
  <li>Between July 18 and August 18, daily cost savings <strong>averaged around $135K</strong></li>
  <li>The lowest point, <strong>just above $70K</strong>, occurred in early August.</li>
  <li><strong>Peaks near $160K</strong> appeared in late July and mid-August.</li>
  <li>After a mid-period decline, savings steadily recovered and grew toward the end of the month.</li>
  <li>At this pace, projected annual savings <strong>exceed $48M</strong>, confirming strong and predictable ROI.</li>
</ul>
\`\`\`

Respond only with the <ul>...</ul> markup. Do not include any explanation or extra text.`;

  return prompt;
};
