/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedDate, FormattedMessage } from '@kbn/i18n-react';
import { AnomalyDetail } from './anomaly_detail';
import type { AnomalySummaryEntry } from '../../../../common/api/entity_analytics';
import type { AnomalyBand } from '../recent_anomalies';
import { useAnomalyBands } from '../recent_anomalies';

const getColorFromBands = (bands: AnomalyBand[], score: number): string => {
  const band = [...bands].reverse().find((b) => score >= b.start);
  return band?.color ?? bands[0].color;
};

interface AnomalyRowProps {
  anomaly: AnomalySummaryEntry;
}

export const AnomalyRow: React.FC<AnomalyRowProps> = ({ anomaly }) => {
  const rowAccordionId = useGeneratedHtmlId({ prefix: `anomaly_row_${anomaly.jobId}` });
  const { euiTheme } = useEuiTheme();
  const { bands } = useAnomalyBands();

  const color = getColorFromBands(bands, anomaly.recordScore);

  const buttonContent = (
    <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiIcon type="dot" color={color} size="m" aria-hidden={true} />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText size="s">
          <strong>{anomaly.jobId}</strong>
          <EuiText
            size="xs"
            color="subdued"
            css={css`
              margin-top: 2px;
            `}
          >
            <FormattedDate
              value={anomaly.timestamp}
              year="numeric"
              month="short"
              day="numeric"
              hour="2-digit"
              minute="2-digit"
            />
          </EuiText>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiBadge
          css={css`
            background-color: ${color}22;
            color: color-mix(in srgb, ${color}, black 30%);
            font-weight: ${euiTheme.font.weight.bold};
          `}
        >
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.components.mlAnomalousBehaviors.anomalyRow.score"
            defaultMessage="Score {score}"
            values={{ score: Math.round(anomaly.recordScore) }}
          />
        </EuiBadge>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <EuiAccordion
      id={rowAccordionId}
      buttonContent={buttonContent}
      buttonProps={{ style: { width: '100%' } }}
      css={css`
        border: 1px solid ${euiTheme.border.color};
        border-radius: ${euiTheme.border.radius.medium};
        padding-top: ${euiTheme.size.s};
        padding-bottom: ${euiTheme.size.s};
        padding-left: 0;
        padding-right: 0;

        &.euiAccordion-isOpen {
          padding-bottom: 0;
        }
        margin-bottom: ${euiTheme.size.s};

        .euiAccordion__arrow {
          margin-left: ${euiTheme.size.s};
        }
      `}
    >
      <EuiSpacer size="s" />
      <AnomalyDetail anomaly={anomaly} />
    </EuiAccordion>
  );
};
