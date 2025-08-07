/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText, EuiIcon, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { DocumentAnalysisOutput } from './analyze_documents';
import { Badge } from './label_node_badges';

const alertedEventsText = i18n.translate(
  'securitySolutionPackages.csp.graph.labelNode.tooltip.alertedEvents',
  {
    defaultMessage: 'Alerted events',
  }
);

const defaultEventsText = i18n.translate(
  'securitySolutionPackages.csp.graph.labelNode.tooltip.defaultEvents',
  {
    defaultMessage: 'Default events',
  }
);

interface LabelNodeTooltipProps {
  analysis: DocumentAnalysisOutput;
}

export const LabelNodeTooltipContent = ({ analysis }: LabelNodeTooltipProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      css={css`
        display: flex;
        flex-direction: column;
        gap: ${euiTheme.size.s};
        margin-top: ${euiTheme.size.s};
      `}
    >
      {analysis.alertsCount > 0 && (
        <div
          data-test-subj="label-node-tooltip-alert-section"
          css={css`
            display: flex;
            align-items: center;
            gap: ${euiTheme.size.s};
          `}
        >
          <Badge
            euiTheme={euiTheme}
            bgColor={euiTheme.colors.danger}
            css={css`
              gap: ${euiTheme.size.xxs};
            `}
          >
            <EuiIcon
              type="warningFilled"
              color="ghost"
              size="s"
              data-test-subj="label-node-tooltip-alert-icon"
            />
            {analysis.alertsCount > 1 && (
              <EuiText
                data-test-subj="label-node-tooltip-alert-count"
                size="m"
                css={css`
                  font-weight: ${euiTheme.font.weight.medium};
                  color: ${euiTheme.colors.textInverse};
                `}
              >
                {analysis.alertsCount}
              </EuiText>
            )}
          </Badge>
          <EuiText
            size="s"
            css={css`
              font-weight: ${euiTheme.font.weight.medium};
              color: ${euiTheme.colors.textInverse};
            `}
          >
            {alertedEventsText}
          </EuiText>
        </div>
      )}
      {analysis.eventsCount > 0 && (
        <div
          data-test-subj="label-node-tooltip-event-section"
          css={css`
            display: flex;
            align-items: center;
            gap: ${euiTheme.size.s};
          `}
        >
          <Badge euiTheme={euiTheme} bgColor={euiTheme.colors.backgroundBasePlain}>
            <EuiText
              data-test-subj="label-node-tooltip-event-count"
              size="m"
              css={css`
                font-weight: ${euiTheme.font.weight.medium};
                color: ${euiTheme.colors.textHeading};
              `}
            >
              {analysis.eventsCount}
            </EuiText>
          </Badge>
          <EuiText
            size="s"
            css={css`
              font-weight: ${euiTheme.font.weight.medium};
              color: ${euiTheme.colors.textInverse};
            `}
          >
            {defaultEventsText}
          </EuiText>
        </div>
      )}
    </div>
  );
};
