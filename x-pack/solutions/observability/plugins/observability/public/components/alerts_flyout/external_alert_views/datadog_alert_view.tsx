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

interface DatadogAlertViewProps {
  alert: Alert;
}

export const DatadogAlertView: React.FC<DatadogAlertViewProps> = ({ alert }) => {
  const rawPayload = alert['kibana.alert.raw_payload'] as Record<string, unknown> | undefined;
  const externalUrl = alert['kibana.alert.external_url']?.[0] as string | undefined;
  const connectorId = alert['kibana.alert.connector_id']?.[0] as string | undefined;
  const alertTitle = alert['kibana.alert.rule.name']?.[0] as string;
  const alertReason = alert['kibana.alert.reason']?.[0] as string;
  const severity = alert['kibana.alert.severity']?.[0] as string;
  const status = alert['kibana.alert.status']?.[0] as string;
  const timestamp = alert['@timestamp']?.[0] as string;

  // Datadog-specific fields from raw payload
  const monitorId = rawPayload?.monitor_id as string | undefined;
  const monitorName = rawPayload?.monitor_name as string | undefined;
  const monitorType = rawPayload?.monitor_type as string | undefined;
  const priority = rawPayload?.priority as string | undefined;
  const host = rawPayload?.host as string | undefined;
  const service = rawPayload?.service as string | undefined;
  const env = rawPayload?.env as string | undefined;
  const alertQuery = rawPayload?.query as string | undefined;
  const thresholds = rawPayload?.thresholds as Record<string, number> | undefined;
  const currentValue = rawPayload?.current_value as number | undefined;

  const descriptionListItems = [
    {
      title: i18n.translate('xpack.observability.datadogAlertView.alertTitle', {
        defaultMessage: 'Alert Title',
      }),
      description: alertTitle || '--',
    },
    {
      title: i18n.translate('xpack.observability.datadogAlertView.status', {
        defaultMessage: 'Status',
      }),
      description: (
        <EuiBadge color={status === 'active' ? 'danger' : 'success'}>
          {status?.toUpperCase() || 'UNKNOWN'}
        </EuiBadge>
      ),
    },
    {
      title: i18n.translate('xpack.observability.datadogAlertView.severity', {
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
      title: i18n.translate('xpack.observability.datadogAlertView.timestamp', {
        defaultMessage: 'Triggered At',
      }),
      description: timestamp ? new Date(timestamp).toLocaleString() : '--',
    },
  ];

  const datadogSpecificItems = [
    ...(monitorId
      ? [
          {
            title: i18n.translate('xpack.observability.datadogAlertView.monitorId', {
              defaultMessage: 'Monitor ID',
            }),
            description: monitorId,
          },
        ]
      : []),
    ...(monitorName
      ? [
          {
            title: i18n.translate('xpack.observability.datadogAlertView.monitorName', {
              defaultMessage: 'Monitor Name',
            }),
            description: monitorName,
          },
        ]
      : []),
    ...(monitorType
      ? [
          {
            title: i18n.translate('xpack.observability.datadogAlertView.monitorType', {
              defaultMessage: 'Monitor Type',
            }),
            description: <EuiBadge color="hollow">{monitorType}</EuiBadge>,
          },
        ]
      : []),
    ...(priority
      ? [
          {
            title: i18n.translate('xpack.observability.datadogAlertView.priority', {
              defaultMessage: 'Priority',
            }),
            description: <EuiBadge color="primary">{priority}</EuiBadge>,
          },
        ]
      : []),
    ...(host
      ? [
          {
            title: i18n.translate('xpack.observability.datadogAlertView.host', {
              defaultMessage: 'Host',
            }),
            description: host,
          },
        ]
      : []),
    ...(service
      ? [
          {
            title: i18n.translate('xpack.observability.datadogAlertView.service', {
              defaultMessage: 'Service',
            }),
            description: service,
          },
        ]
      : []),
    ...(env
      ? [
          {
            title: i18n.translate('xpack.observability.datadogAlertView.environment', {
              defaultMessage: 'Environment',
            }),
            description: <EuiBadge color="hollow">{env}</EuiBadge>,
          },
        ]
      : []),
    ...(currentValue !== undefined
      ? [
          {
            title: i18n.translate('xpack.observability.datadogAlertView.currentValue', {
              defaultMessage: 'Current Value',
            }),
            description: String(currentValue),
          },
        ]
      : []),
  ];

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      {/* Header with Datadog branding */}
      <EuiFlexItem>
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiIcon type="visAreaStacked" size="xl" color="#632CA6" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiTitle size="s">
              <h3>
                {i18n.translate('xpack.observability.datadogAlertView.title', {
                  defaultMessage: 'Datadog Alert',
                })}
              </h3>
            </EuiTitle>
          </EuiFlexItem>
          {connectorId && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">
                {i18n.translate('xpack.observability.datadogAlertView.connectorId', {
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
              {i18n.translate('xpack.observability.datadogAlertView.alertDetails', {
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
                {i18n.translate('xpack.observability.datadogAlertView.reason', {
                  defaultMessage: 'Reason',
                })}
              </h4>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiText size="s">{alertReason}</EuiText>
          </EuiPanel>
        </EuiFlexItem>
      )}

      {/* Datadog-specific metadata */}
      {datadogSpecificItems.length > 0 && (
        <EuiFlexItem>
          <EuiPanel hasBorder paddingSize="m">
            <EuiTitle size="xs">
              <h4>
                {i18n.translate('xpack.observability.datadogAlertView.datadogMetadata', {
                  defaultMessage: 'Datadog Metadata',
                })}
              </h4>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiDescriptionList
              type="column"
              listItems={datadogSpecificItems}
              columnWidths={[1, 3]}
            />
          </EuiPanel>
        </EuiFlexItem>
      )}

      {/* Query */}
      {alertQuery && (
        <EuiFlexItem>
          <EuiPanel hasBorder paddingSize="m">
            <EuiTitle size="xs">
              <h4>
                {i18n.translate('xpack.observability.datadogAlertView.query', {
                  defaultMessage: 'Monitor Query',
                })}
              </h4>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiCodeBlock language="text" fontSize="s" paddingSize="s">
              {alertQuery}
            </EuiCodeBlock>
          </EuiPanel>
        </EuiFlexItem>
      )}

      {/* Thresholds */}
      {thresholds && Object.keys(thresholds).length > 0 && (
        <EuiFlexItem>
          <EuiPanel hasBorder paddingSize="m">
            <EuiTitle size="xs">
              <h4>
                {i18n.translate('xpack.observability.datadogAlertView.thresholds', {
                  defaultMessage: 'Thresholds',
                })}
              </h4>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiDescriptionList
              type="column"
              listItems={Object.entries(thresholds).map(([key, value]) => ({
                title: key,
                description: String(value),
              }))}
              columnWidths={[1, 3]}
            />
          </EuiPanel>
        </EuiFlexItem>
      )}

      {/* External link */}
      {externalUrl && (
        <EuiFlexItem>
          <EuiLink href={externalUrl} target="_blank" external>
            {i18n.translate('xpack.observability.datadogAlertView.viewInDatadog', {
              defaultMessage: 'View in Datadog',
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
                {i18n.translate('xpack.observability.datadogAlertView.rawPayload', {
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

