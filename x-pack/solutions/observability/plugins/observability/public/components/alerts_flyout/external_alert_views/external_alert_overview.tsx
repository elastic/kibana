/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiDescriptionList,
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
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Alert } from '@kbn/alerting-types';
import { ALERT_SOURCE } from '../../alerts_table/common/get_columns';
import { DatadogAlertView } from './datadog_alert_view';
import { SentryAlertView } from './sentry_alert_view';
import { PrometheusAlertView } from './prometheus_alert_view';

interface ExternalAlertOverviewProps {
  alert: Alert;
}

/**
 * Returns the appropriate alert view component based on the source
 */
export function getExternalAlertView(source: string): React.ComponentType<{ alert: Alert }> | null {
  const sourceKey = source?.toLowerCase();

  switch (sourceKey) {
    case 'datadog':
      return DatadogAlertView;
    case 'sentry':
      return SentryAlertView;
    case 'prometheus':
      return PrometheusAlertView;
    default:
      return null;
  }
}

/**
 * Generic external alert overview component
 * Used as a fallback when no provider-specific view is available
 */
export const ExternalAlertOverview: React.FC<ExternalAlertOverviewProps> = ({ alert }) => {
  const source = alert[ALERT_SOURCE]?.[0] as string | undefined;
  const rawPayload = alert['kibana.alert.raw_payload'] as Record<string, unknown> | undefined;
  const externalUrl = alert['kibana.alert.external_url']?.[0] as string | undefined;
  const connectorId = alert['kibana.alert.connector_id']?.[0] as string | undefined;
  const alertTitle = alert['kibana.alert.rule.name']?.[0] as string;
  const alertReason = alert['kibana.alert.reason']?.[0] as string;
  const severity = alert['kibana.alert.severity']?.[0] as string;
  const status = alert['kibana.alert.status']?.[0] as string;
  const timestamp = alert['@timestamp']?.[0] as string;
  const tags = alert.tags as string[] | undefined;

  // Check if we have a provider-specific view
  const ProviderView = source ? getExternalAlertView(source) : null;

  if (ProviderView) {
    return <ProviderView alert={alert} />;
  }

  // Generic external alert view
  const descriptionListItems = [
    {
      title: i18n.translate('xpack.observability.externalAlertOverview.source', {
        defaultMessage: 'Source',
      }),
      description: (
        <EuiBadge color="hollow">{source?.toUpperCase() || 'EXTERNAL'}</EuiBadge>
      ),
    },
    {
      title: i18n.translate('xpack.observability.externalAlertOverview.alertTitle', {
        defaultMessage: 'Alert Title',
      }),
      description: alertTitle || '--',
    },
    {
      title: i18n.translate('xpack.observability.externalAlertOverview.status', {
        defaultMessage: 'Status',
      }),
      description: (
        <EuiBadge color={status === 'active' ? 'danger' : 'success'}>
          {status?.toUpperCase() || 'UNKNOWN'}
        </EuiBadge>
      ),
    },
    {
      title: i18n.translate('xpack.observability.externalAlertOverview.severity', {
        defaultMessage: 'Severity',
      }),
      description: (
        <EuiBadge
          color={
            severity === 'critical'
              ? 'danger'
              : severity === 'high'
              ? 'warning'
              : severity === 'medium'
              ? 'primary'
              : 'default'
          }
        >
          {severity?.toUpperCase() || 'UNKNOWN'}
        </EuiBadge>
      ),
    },
    {
      title: i18n.translate('xpack.observability.externalAlertOverview.timestamp', {
        defaultMessage: 'Triggered At',
      }),
      description: timestamp ? new Date(timestamp).toLocaleString() : '--',
    },
  ];

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      {/* Header */}
      <EuiFlexItem>
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiIcon type="globe" size="xl" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiTitle size="s">
              <h3>
                {i18n.translate('xpack.observability.externalAlertOverview.title', {
                  defaultMessage: 'External Alert',
                })}
              </h3>
            </EuiTitle>
          </EuiFlexItem>
          {connectorId && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">
                {i18n.translate('xpack.observability.externalAlertOverview.connectorId', {
                  defaultMessage: 'Connector: {connectorId}',
                  values: { connectorId },
                })}
              </EuiBadge>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>

      {/* Alert details */}
      <EuiFlexItem>
        <EuiPanel hasBorder paddingSize="m">
          <EuiTitle size="xs">
            <h4>
              {i18n.translate('xpack.observability.externalAlertOverview.alertDetails', {
                defaultMessage: 'Alert Details',
              })}
            </h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiDescriptionList
            type="column"
            listItems={descriptionListItems}
            columnWidths={[1, 3]}
          />
        </EuiPanel>
      </EuiFlexItem>

      {/* Alert reason */}
      {alertReason && (
        <EuiFlexItem>
          <EuiPanel hasBorder paddingSize="m">
            <EuiTitle size="xs">
              <h4>
                {i18n.translate('xpack.observability.externalAlertOverview.reason', {
                  defaultMessage: 'Reason',
                })}
              </h4>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiText size="s">{alertReason}</EuiText>
          </EuiPanel>
        </EuiFlexItem>
      )}

      {/* Tags */}
      {tags && tags.length > 0 && (
        <EuiFlexItem>
          <EuiPanel hasBorder paddingSize="m">
            <EuiTitle size="xs">
              <h4>
                {i18n.translate('xpack.observability.externalAlertOverview.tags', {
                  defaultMessage: 'Tags',
                })}
              </h4>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiFlexGroup wrap gutterSize="xs">
              {tags.map((tag, index) => (
                <EuiFlexItem grow={false} key={index}>
                  <EuiBadge color="hollow">{tag}</EuiBadge>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
      )}

      {/* External link */}
      {externalUrl && (
        <EuiFlexItem>
          <EuiLink href={externalUrl} target="_blank" external>
            {i18n.translate('xpack.observability.externalAlertOverview.viewInSource', {
              defaultMessage: 'View in Source System',
            })}
          </EuiLink>
        </EuiFlexItem>
      )}

      {/* Raw payload */}
      {rawPayload && (
        <EuiFlexItem>
          <EuiPanel hasBorder paddingSize="m">
            <EuiTitle size="xs">
              <h4>
                {i18n.translate('xpack.observability.externalAlertOverview.rawPayload', {
                  defaultMessage: 'Raw Payload',
                })}
              </h4>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiCodeBlock language="json" fontSize="s" paddingSize="s" overflowHeight={300}>
              {JSON.stringify(rawPayload, null, 2)}
            </EuiCodeBlock>
          </EuiPanel>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

