/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Detection } from '@kbn/streams-schema';

/*
 * Detection's `alert_samples` field is a flexible `record<string, unknown>[]`
 * with no fixed shape in the schema. We use its first entry as a metadata
 * envelope (description/esql_query/samples) — a pragmatic convention for
 * this branch, not a documented contract. See
 * use_fetch_detections.ts and dev/nightshift-v0-landing-page/STATUS.md for
 * why (Detection has no dedicated query/description fields today).
 */
interface SymptomMeta {
  description?: string;
  esql_query?: string;
  samples?: Array<{ timestamp?: string; message?: string }>;
}

function getSymptomMeta(detection: Detection): SymptomMeta {
  const first = detection.alert_samples?.[0] as SymptomMeta | undefined;
  return first ?? {};
}

const TYPE_LABEL = i18n.translate('xpack.observability.nightshift.symptomFlyout.type', {
  defaultMessage: 'Type',
});
const STREAMS_LABEL = i18n.translate('xpack.observability.nightshift.symptomFlyout.streams', {
  defaultMessage: 'Streams',
});
const DESCRIPTION_LABEL = i18n.translate(
  'xpack.observability.nightshift.symptomFlyout.description',
  { defaultMessage: 'Description' }
);
const QUERY_LABEL = i18n.translate('xpack.observability.nightshift.symptomFlyout.query', {
  defaultMessage: 'Query',
});
const OPEN_IN_DISCOVER_LABEL = i18n.translate(
  'xpack.observability.nightshift.symptomFlyout.openInDiscover',
  { defaultMessage: 'Open in Discover' }
);
const SAMPLE_LOGS_LABEL = i18n.translate(
  'xpack.observability.nightshift.symptomFlyout.sampleLogs',
  { defaultMessage: 'Sample logs' }
);

export function getTrendLabel(
  changePointType: string | undefined
): { label: string; color: 'danger' | 'success' | 'hollow' } {
  switch (changePointType) {
    case 'spike':
      return {
        label: i18n.translate('xpack.observability.nightshift.symptomFlyout.trend.spike', {
          defaultMessage: 'Spike',
        }),
        color: 'danger',
      };
    case 'step_down':
      return {
        label: i18n.translate('xpack.observability.nightshift.symptomFlyout.trend.droppedToZero', {
          defaultMessage: 'Dropped to zero',
        }),
        color: 'success',
      };
    default:
      return {
        label: i18n.translate('xpack.observability.nightshift.symptomFlyout.trend.stationary', {
          defaultMessage: 'Stationary',
        }),
        color: 'hollow',
      };
  }
}

/** Small decorative bar sparkline — not data-accurate, just a visual trend cue (no charting library dependency for this pass). */
function TrendSparkline({ changePointType }: { changePointType: string | undefined }) {
  const { euiTheme } = useEuiTheme();
  const heights =
    changePointType === 'spike'
      ? [20, 25, 30, 35, 45, 60, 85, 100]
      : changePointType === 'step_down'
      ? [90, 85, 80, 60, 30, 10, 5, 2]
      : [40, 45, 38, 42, 40, 44, 39, 41];
  const color =
    changePointType === 'spike'
      ? euiTheme.colors.textDanger
      : changePointType === 'step_down'
      ? euiTheme.colors.textSuccess
      : euiTheme.colors.textSubdued;

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 40 }}>
      {heights.map((h, idx) => (
        <div
          key={idx}
          style={{
            width: 6,
            height: `${h}%`,
            backgroundColor: color,
            borderRadius: 1,
          }}
        />
      ))}
    </div>
  );
}

export interface SymptomDetailFlyoutProps {
  detection: Detection;
  onClose: () => void;
  onOpenInDiscover: (esqlQuery: string) => void;
}

export function SymptomDetailFlyout({
  detection,
  onClose,
  onOpenInDiscover,
}: SymptomDetailFlyoutProps) {
  const flyoutTitleId = useGeneratedHtmlId({ prefix: 'symptomDetailFlyout' });
  const meta = getSymptomMeta(detection);
  const trend = getTrendLabel(detection.detection_evidence?.change_point_type);

  return (
    <EuiFlyout onClose={onClose} aria-labelledby={flyoutTitleId} size="s" type="overlay">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id={flyoutTitleId}>{detection.rule_name}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFlexGroup gutterSize="l" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {TYPE_LABEL}
            </EuiText>
            <EuiBadge color="hollow">{detection.kind}</EuiBadge>
          </EuiFlexItem>
          {detection.stream_name && (
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {STREAMS_LABEL}
              </EuiText>
              <EuiBadge color="hollow" iconType="documents">
                {detection.stream_name}
              </EuiBadge>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>

        {meta.description && (
          <>
            <EuiSpacer size="m" />
            <EuiTitle size="xxs">
              <h4>{DESCRIPTION_LABEL}</h4>
            </EuiTitle>
            <EuiSpacer size="xs" />
            <EuiText size="s">
              <p>{meta.description}</p>
            </EuiText>
          </>
        )}

        <EuiSpacer size="m" />
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="xxs">
              <h4>Trend</h4>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color={trend.color}>{trend.label}</EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="xs" />
        <EuiPanel hasBorder paddingSize="s">
          <TrendSparkline changePointType={detection.detection_evidence?.change_point_type} />
        </EuiPanel>

        {meta.esql_query && (
          <>
            <EuiSpacer size="m" />
            <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiTitle size="xxs">
                  <h4>{QUERY_LABEL}</h4>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="xs"
                  iconType="discoverApp"
                  onClick={() => onOpenInDiscover(meta.esql_query!)}
                >
                  {OPEN_IN_DISCOVER_LABEL}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="xs" />
            <EuiCodeBlock language="esql" fontSize="s" paddingSize="s" isCopyable>
              {meta.esql_query}
            </EuiCodeBlock>
          </>
        )}

        {meta.samples && meta.samples.length > 0 && (
          <>
            <EuiSpacer size="m" />
            <EuiTitle size="xxs">
              <h4>{SAMPLE_LOGS_LABEL}</h4>
            </EuiTitle>
            <EuiSpacer size="xs" />
            <EuiPanel color="subdued" paddingSize="s" hasBorder={false}>
              {meta.samples.map((sample, idx) => (
                <EuiText
                  key={idx}
                  size="xs"
                  css={{ fontFamily: 'monospace', marginBottom: idx < meta.samples!.length - 1 ? 4 : 0 }}
                >
                  [{sample.timestamp}] {sample.message}
                </EuiText>
              ))}
            </EuiPanel>
          </>
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
}
