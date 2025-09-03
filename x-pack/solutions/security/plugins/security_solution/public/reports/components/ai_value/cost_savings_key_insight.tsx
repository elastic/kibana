/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useSelector } from 'react-redux';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { sourcererSelectors } from '../../../sourcerer/store';
import { useFetchCostSavingsData } from '../../hooks/use_fetch_cost_savings_data';
import type { ValueMetrics } from './metrics';
import * as i18n from './translations';

interface Props {
  valueMetrics: ValueMetrics;
}

export const CostSavingsKeyInsight: React.FC<Props> = ({ valueMetrics }) => {
  const {
    euiTheme: { size },
  } = useEuiTheme();

  const spaceId = useSpaceId();
  const signalIndexName = useSelector(sourcererSelectors.signalIndexName);
  const { data } = useFetchCostSavingsData({
    minutesPerAlert: 30, // Default value - you may want to make this configurable
    analystHourlyRate: 100, // Default value - you may want to make this configurable
    from: 'now-7d', // Default value - you may want to make this configurable
    to: 'now', // Default value - you may want to make this configurable
    indexPattern: signalIndexName ?? `.alerts-security.alerts-${spaceId}`,
  });
  if (data) {
    const prompt = getPrompt(JSON.stringify(data));
  }
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
          <ul>
            <li
              css={css`
                margin-bottom: 5px;
              `}
            />
            <li />
          </ul>
        </EuiText>
      </span>
    </div>
  );
};

const getPrompt = (result: string) => {
  const prompt = `You are given Elasticsearch aggregation results showing cost savings over time:

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
