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
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { AnomalySummaryEntry } from '../../../../../common/api/entity_analytics';
import { useBehavioralSummary } from '../hooks/use_behavioral_summary';

interface Props {
  entityId: string;
}

const getScoreColor = (score: number): string => {
  if (score >= 75) return '#BD271E';
  if (score >= 50) return '#F5A700';
  return '#006BB4';
};

const getDotColor = (score: number): string => {
  if (score >= 75) return 'danger';
  if (score >= 50) return 'warning';
  return 'primary';
};

export const BehavioralBaselineSection: React.FC<Props> = ({ entityId }) => {
  const { euiTheme } = useEuiTheme();
  const accordionId = useGeneratedHtmlId({ prefix: 'behavioral_baseline' });
  const { data } = useBehavioralSummary(entityId);
  const anomalies = data?.anomalies ?? [];

  if (!anomalies.length) return null;

  const subduedOverline = css`
    font-size: ${euiTheme.size.s};
    font-weight: ${euiTheme.font.weight.bold};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: ${euiTheme.colors.subduedText};
  `;

  const accordionCss = css`
    .euiAccordion__childWrapper {
      overflow: visible;
    }
  `;

  return (
    <EuiAccordion
      id={accordionId}
      initialIsOpen
      css={accordionCss}
      buttonContent={
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h4>{'Behavioral Baseline'}</h4>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="success">{'ML'}</EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="primary">{`${anomalies.length} anomalies`}</EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      extraAction={
        <EuiText size="xs" color="subdued">
          {'Last 90 days'}
        </EuiText>
      }
    >
      <EuiSpacer size="m" />
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="none">
        <EuiFlexItem grow={false}>
          <span css={subduedOverline}>{'Recent Anomalies'}</span>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      {anomalies.map((anomaly, idx) => (
        <AnomalyRow key={`${anomaly.jobId}-${idx}`} anomaly={anomaly} />
      ))}
    </EuiAccordion>
  );
};

interface AnomalyDetailProps {
  anomaly: AnomalySummaryEntry;
  actual: number | null;
  typical: number | null;
  multiplier: number | null;
}

const AnomalyDetail: React.FC<AnomalyDetailProps> = ({ anomaly, actual, typical, multiplier }) => {
  const { euiTheme } = useEuiTheme();

  const subduedOverline = css`
    font-size: ${euiTheme.size.s};
    font-weight: ${euiTheme.font.weight.bold};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: ${euiTheme.colors.subduedText};
  `;

  const baselineDisplay = anomaly.baseline.length
    ? anomaly.baseline
        .slice(0, 3)
        .map((b) => b.value)
        .join(', ')
    : '—';

  return (
    <EuiPanel
      color="subdued"
      paddingSize="s"
      css={css`
        border-radius: ${euiTheme.border.radius.medium};
      `}
    >
      <span css={subduedOverline}>{'Baseline vs. Observed'}</span>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="s" responsive={false}>
        <EuiFlexItem>
          <EuiPanel
            paddingSize="s"
            css={css`
              border: 1px solid ${euiTheme.colors.success};
              border-radius: ${euiTheme.border.radius.medium};
            `}
          >
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon type="check" color="success" size="s" aria-hidden={true} />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="success">
                  <strong>{'EXPECTED'}</strong>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="xs" />
            <EuiText size="s">
              <strong>{baselineDisplay}</strong>
            </EuiText>
            <EuiText size="xs" color="subdued">
              {'90d learned baseline'}
              {typical !== null && ` · typical: ${typical.toFixed(2)}`}
            </EuiText>
          </EuiPanel>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiPanel
            paddingSize="s"
            css={css`
              border: 1px solid ${euiTheme.colors.danger};
              border-radius: ${euiTheme.border.radius.medium};
              background-color: ${euiTheme.colors.danger}11;
            `}
          >
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon type="cross" color="danger" size="s" aria-hidden={true} />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="danger">
                  <strong>{'OBSERVED'}</strong>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="xs" />
            <EuiText size="s">
              <strong>{anomaly.byFieldValue ?? (actual !== null ? String(actual) : '—')}</strong>
            </EuiText>
            <EuiText size="xs" color="subdued">
              {actual !== null && `${actual} events`}
              {multiplier !== null && multiplier > 1 && ` · ${multiplier}× above baseline`}
            </EuiText>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>

      {anomaly.sourceIndex.length > 0 && (
        <>
          <EuiSpacer size="m" />
          <span css={subduedOverline}>{'Raw Evidence'}</span>
          <EuiSpacer size="xs" />
          <EuiPanel
            color="subdued"
            paddingSize="xs"
            css={css`
              font-family: ${euiTheme.font.familyCode};
              font-size: ${euiTheme.size.m};
            `}
          >
            <EuiText size="xs" color="subdued">
              {`Source: ${anomaly.sourceIndex.join(', ')}`}
            </EuiText>
            {anomaly.byFieldName && anomaly.byFieldValue && (
              <EuiText size="xs" color="subdued">
                {`${anomaly.byFieldName}: ${anomaly.byFieldValue}`}
              </EuiText>
            )}
            {actual !== null && (
              <EuiText size="xs" color="subdued">
                {`actual: ${actual}${typical !== null ? ` · typical: ${typical.toFixed(2)}` : ''}`}
              </EuiText>
            )}
          </EuiPanel>
        </>
      )}
    </EuiPanel>
  );
};

const AnomalyRow: React.FC<{ anomaly: AnomalySummaryEntry }> = ({ anomaly }) => {
  const { euiTheme } = useEuiTheme();
  const rowAccordionId = useGeneratedHtmlId({ prefix: `anomaly_row_${anomaly.jobId}` });
  const scoreColor = getScoreColor(anomaly.recordScore);
  const dotColor = getDotColor(anomaly.recordScore);

  const actual = anomaly.actual[0] ?? null;
  const typical = anomaly.typical[0] ?? null;
  const multiplier =
    actual !== null && typical !== null && typical > 0 ? Math.round(actual / typical) : null;

  const buttonContent = (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiIcon type="dot" color={dotColor} size="m" aria-hidden={true} />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText size="s">
          <strong>{anomaly.jobId}</strong>
          {anomaly.byFieldValue && (
            <span
              css={css`
                color: ${euiTheme.colors.subduedText};
              `}
            >
              {' · '}
              {anomaly.byFieldName}
              {': '}
              <em>{anomaly.byFieldValue}</em>
            </span>
          )}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBadge
          css={css`
            background-color: ${scoreColor}22;
            color: ${scoreColor};
            font-weight: ${euiTheme.font.weight.bold};
          `}
        >
          {`Score ${Math.round(anomaly.recordScore)}`}
        </EuiBadge>
      </EuiFlexItem>
      {multiplier !== null && multiplier > 1 && (
        <EuiFlexItem grow={false}>
          <EuiBadge
            css={css`
              background-color: ${euiTheme.colors.danger}22;
              color: ${euiTheme.colors.danger};
              font-weight: ${euiTheme.font.weight.bold};
            `}
          >
            {`+${multiplier}×`}
          </EuiBadge>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );

  return (
    <EuiAccordion
      id={rowAccordionId}
      buttonContent={buttonContent}
      buttonProps={{ style: { width: '100%' } }}
      css={css`
        border: 1px solid ${euiTheme.colors.lightShade};
        border-radius: ${euiTheme.border.radius.medium};
        padding: ${euiTheme.size.s};
        margin-bottom: ${euiTheme.size.s};

        .euiAccordion__childWrapper {
          overflow: visible;
        }
      `}
    >
      <EuiSpacer size="s" />
      <AnomalyDetail anomaly={anomaly} actual={actual} typical={typical} multiplier={multiplier} />
    </EuiAccordion>
  );
};
