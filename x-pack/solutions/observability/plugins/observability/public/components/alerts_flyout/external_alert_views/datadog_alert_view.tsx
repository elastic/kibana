/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
  EuiBadge,
  EuiLink,
  EuiIcon,
  EuiPanel,
  EuiText,
  EuiCodeBlock,
  EuiImage,
  EuiHorizontalRule,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { Alert } from '@kbn/alerting-types';
import datadogIcon from '../../../assets/icons/datadog.svg';

interface DatadogAlertViewProps {
  alert: Alert;
}

// Styles
const rowStyles = css`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
`;

const labelStyles = css`
  font-weight: 600;
  min-width: 120px;
  flex-shrink: 0;
  color: #69707d;
  font-size: 12px;
`;

const valueStyles = css`
  flex: 1;
  min-width: 0;
  word-break: break-word;
  overflow-wrap: break-word;
`;

const reasonStyles = css`
  white-space: pre-wrap;
  word-break: break-all;
  overflow-wrap: anywhere;
  font-size: 13px;
  line-height: 1.5;
  max-width: 100%;
`;

const codeBlockContainerStyles = css`
  max-width: 100%;
  overflow: hidden;

  & .euiCodeBlock__pre {
    white-space: pre-wrap;
    word-break: break-all;
  }
`;

/**
 * Extracts snapshot graph URL from the alert message/reason
 */
function extractSnapshotUrl(text: string | undefined): string | undefined {
  if (!text) return undefined;
  const markdownMatch = text.match(/\[!\[.*?\]\((https:\/\/p\.datadoghq\.com\/snapshot\/[^)]+)\)/);
  if (markdownMatch) return markdownMatch[1];
  const directMatch = text.match(/(https:\/\/p\.datadoghq\.com\/snapshot\/[^\s\])"]+)/);
  if (directMatch) return directMatch[1];
  return undefined;
}

const FieldRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div css={rowStyles}>
    <span css={labelStyles}>{label}</span>
    <span css={valueStyles}>{children}</span>
  </div>
);

export const DatadogAlertView: React.FC<DatadogAlertViewProps> = ({ alert }) => {
  const rawPayload = alert['kibana.alert.raw_payload'] as Record<string, unknown> | undefined;
  const externalUrl = alert['kibana.alert.external_url']?.[0] as string | undefined;
  const connectorId = alert['kibana.alert.connector_id']?.[0] as string | undefined;
  const alertTitle = alert['kibana.alert.rule.name']?.[0] as string;
  const alertReason = alert['kibana.alert.reason']?.[0] as string;
  const severity = alert['kibana.alert.severity']?.[0] as string;
  const status = alert['kibana.alert.status']?.[0] as string;
  const timestamp = alert['@timestamp']?.[0] as string;

  // Datadog-specific fields
  const nestedPayload = rawPayload?.raw_payload as Record<string, unknown> | undefined;
  const monitorId =
    (rawPayload?.monitor_id as string) || (nestedPayload?.alertId as string) || undefined;
  const priority = (nestedPayload?.alertPriority as string) || undefined;
  const alertQuery = (nestedPayload?.alertQuery as string) || undefined;

  const snapshotUrl = useMemo(() => {
    const directSnapshot = nestedPayload?.snapshotUrl as string;
    if (directSnapshot) return directSnapshot;
    return extractSnapshotUrl(alertReason);
  }, [nestedPayload, alertReason]);

  const connectorPageUrl = connectorId
    ? `/app/management/insightsAndAlerting/triggersActionsConnectors/connectors/${connectorId}`
    : undefined;

  return (
    <>
      {/* Header */}
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type={datadogIcon} size="xl" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiTitle size="s">
            <h3>Datadog Alert</h3>
          </EuiTitle>
        </EuiFlexItem>
        {connectorId && connectorPageUrl && (
          <EuiFlexItem grow={false}>
            <EuiLink href={connectorPageUrl} target="_blank">
              <EuiBadge color="hollow" iconType="link" iconSide="left">
                Connector: {connectorId.substring(0, 8)}...
              </EuiBadge>
            </EuiLink>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      {/* Snapshot Graph */}
      {snapshotUrl && (
        <>
          <EuiPanel hasBorder paddingSize="s">
            <EuiTitle size="xs">
              <h4>Metric Graph</h4>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiLink href={snapshotUrl} target="_blank">
              <EuiImage
                src={snapshotUrl}
                alt="Datadog Metric Graph"
                style={{ maxHeight: 180, width: '100%', objectFit: 'contain' }}
                allowFullScreen
              />
            </EuiLink>
          </EuiPanel>
          <EuiSpacer size="m" />
        </>
      )}

      {/* Alert Details */}
      <EuiPanel hasBorder paddingSize="s">
        <EuiTitle size="xs">
          <h4>Alert Details</h4>
        </EuiTitle>
        <EuiSpacer size="s" />

        <FieldRow label="Alert Title">
          <EuiText size="s">{alertTitle || '--'}</EuiText>
        </FieldRow>

        <FieldRow label="Status">
          <EuiBadge color={status === 'active' ? 'danger' : 'success'}>
            {status?.toUpperCase() || 'UNKNOWN'}
          </EuiBadge>
        </FieldRow>

        <FieldRow label="Severity">
          <EuiBadge
            color={
              severity === 'critical'
                ? 'danger'
                : severity === 'high'
                ? 'warning'
                : 'default'
            }
          >
            {priority || severity?.toUpperCase() || 'UNKNOWN'}
          </EuiBadge>
        </FieldRow>

        <FieldRow label="Triggered At">
          <EuiText size="s">{timestamp ? new Date(timestamp).toLocaleString() : '--'}</EuiText>
        </FieldRow>

        {monitorId && (
          <FieldRow label="Monitor ID">
            <EuiText size="s">{monitorId}</EuiText>
          </FieldRow>
        )}
      </EuiPanel>

      <EuiSpacer size="m" />

      {/* Reason */}
      {alertReason && (
        <>
          <EuiPanel hasBorder paddingSize="s">
            <EuiTitle size="xs">
              <h4>Reason</h4>
            </EuiTitle>
            <EuiSpacer size="s" />
            <div css={reasonStyles}>{alertReason}</div>
          </EuiPanel>
          <EuiSpacer size="m" />
        </>
      )}

      {/* Query */}
      {alertQuery && (
        <>
          <EuiPanel hasBorder paddingSize="s">
            <EuiTitle size="xs">
              <h4>Monitor Query</h4>
            </EuiTitle>
            <EuiSpacer size="s" />
            <div css={codeBlockContainerStyles}>
              <EuiCodeBlock
                language="text"
                fontSize="s"
                paddingSize="s"
                overflowHeight={80}
                isCopyable
              >
                {alertQuery}
              </EuiCodeBlock>
            </div>
          </EuiPanel>
          <EuiSpacer size="m" />
        </>
      )}

      {/* View in Datadog */}
      {externalUrl && (
        <>
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiIcon type={datadogIcon} size="m" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiLink href={externalUrl} target="_blank" external>
                View in Datadog
              </EuiLink>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
        </>
      )}

      {/* Raw Payload */}
      {rawPayload && (
        <EuiPanel hasBorder paddingSize="s">
          <EuiTitle size="xs">
            <h4>Raw Payload</h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          <div css={codeBlockContainerStyles}>
            <EuiCodeBlock
              language="json"
              fontSize="s"
              paddingSize="s"
              overflowHeight={300}
              isCopyable
            >
              {JSON.stringify(rawPayload, null, 2)}
            </EuiCodeBlock>
          </div>
        </EuiPanel>
      )}
    </>
  );
};
