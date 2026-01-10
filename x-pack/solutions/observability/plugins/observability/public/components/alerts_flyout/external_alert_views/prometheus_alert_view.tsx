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

interface PrometheusAlertViewProps {
  alert: Alert;
}

export const PrometheusAlertView: React.FC<PrometheusAlertViewProps> = ({ alert }) => {
  const rawPayload = alert['kibana.alert.raw_payload'] as Record<string, unknown> | undefined;
  const externalUrl = alert['kibana.alert.external_url']?.[0] as string | undefined;
  const connectorId = alert['kibana.alert.connector_id']?.[0] as string | undefined;
  const alertTitle = alert['kibana.alert.rule.name']?.[0] as string;
  const alertReason = alert['kibana.alert.reason']?.[0] as string;
  const severity = alert['kibana.alert.severity']?.[0] as string;
  const status = alert['kibana.alert.status']?.[0] as string;
  const timestamp = alert['@timestamp']?.[0] as string;

  // Prometheus-specific fields from raw payload
  const alertname = rawPayload?.alertname as string | undefined;
  const instance = rawPayload?.instance as string | undefined;
  const job = rawPayload?.job as string | undefined;
  const prometheusState = rawPayload?.state as string | undefined;
  const startsAt = rawPayload?.startsAt as string | undefined;
  const endsAt = rawPayload?.endsAt as string | undefined;
  const generatorURL = rawPayload?.generatorURL as string | undefined;
  const fingerprint = rawPayload?.fingerprint as string | undefined;
  const annotations = rawPayload?.annotations as Record<string, string> | undefined;
  const labels = rawPayload?.labels as Record<string, string> | undefined;
  const expression = rawPayload?.expr as string | undefined;
  const forDuration = rawPayload?.for as string | undefined;

  const descriptionListItems = [
    {
      title: i18n.translate('xpack.observability.prometheusAlertView.alertName', {
        defaultMessage: 'Alert Name',
      }),
      description: alertname || alertTitle || '--',
    },
    {
      title: i18n.translate('xpack.observability.prometheusAlertView.status', {
        defaultMessage: 'Status',
      }),
      description: (
        <EuiBadge
          color={
            prometheusState === 'firing' || status === 'active' ? 'danger' : 'success'
          }
        >
          {(prometheusState || status)?.toUpperCase() || 'UNKNOWN'}
        </EuiBadge>
      ),
    },
    {
      title: i18n.translate('xpack.observability.prometheusAlertView.severity', {
        defaultMessage: 'Severity',
      }),
      description: (
        <EuiBadge
          color={
            severity === 'critical'
              ? 'danger'
              : severity === 'high' || severity === 'warning'
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
      title: i18n.translate('xpack.observability.prometheusAlertView.timestamp', {
        defaultMessage: 'Triggered At',
      }),
      description: startsAt
        ? new Date(startsAt).toLocaleString()
        : timestamp
        ? new Date(timestamp).toLocaleString()
        : '--',
    },
  ];

  const prometheusSpecificItems = [
    ...(instance
      ? [
          {
            title: i18n.translate('xpack.observability.prometheusAlertView.instance', {
              defaultMessage: 'Instance',
            }),
            description: instance,
          },
        ]
      : []),
    ...(job
      ? [
          {
            title: i18n.translate('xpack.observability.prometheusAlertView.job', {
              defaultMessage: 'Job',
            }),
            description: <EuiBadge color="hollow">{job}</EuiBadge>,
          },
        ]
      : []),
    ...(fingerprint
      ? [
          {
            title: i18n.translate('xpack.observability.prometheusAlertView.fingerprint', {
              defaultMessage: 'Fingerprint',
            }),
            description: <code>{fingerprint}</code>,
          },
        ]
      : []),
    ...(forDuration
      ? [
          {
            title: i18n.translate('xpack.observability.prometheusAlertView.forDuration', {
              defaultMessage: 'For Duration',
            }),
            description: forDuration,
          },
        ]
      : []),
    ...(endsAt
      ? [
          {
            title: i18n.translate('xpack.observability.prometheusAlertView.endsAt', {
              defaultMessage: 'Ends At',
            }),
            description: new Date(endsAt).toLocaleString(),
          },
        ]
      : []),
  ];

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      {/* Header with Prometheus branding */}
      <EuiFlexItem>
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiIcon type="logoPrometheus" size="xl" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiTitle size="s">
              <h3>
                {i18n.translate('xpack.observability.prometheusAlertView.title', {
                  defaultMessage: 'Prometheus Alert',
                })}
              </h3>
            </EuiTitle>
          </EuiFlexItem>
          {connectorId && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">
                {i18n.translate('xpack.observability.prometheusAlertView.connectorId', {
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
              {i18n.translate('xpack.observability.prometheusAlertView.alertDetails', {
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

      {/* Alert description/reason */}
      {alertReason && (
        <EuiFlexItem>
          <EuiPanel hasBorder paddingSize="m">
            <EuiTitle size="xs">
              <h4>
                {i18n.translate('xpack.observability.prometheusAlertView.description', {
                  defaultMessage: 'Description',
                })}
              </h4>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiText size="s">{alertReason}</EuiText>
          </EuiPanel>
        </EuiFlexItem>
      )}

      {/* Prometheus-specific metadata */}
      {prometheusSpecificItems.length > 0 && (
        <EuiFlexItem>
          <EuiPanel hasBorder paddingSize="m">
            <EuiTitle size="xs">
              <h4>
                {i18n.translate('xpack.observability.prometheusAlertView.prometheusMetadata', {
                  defaultMessage: 'Prometheus Metadata',
                })}
              </h4>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiDescriptionList
              type="column"
              listItems={prometheusSpecificItems}
              columnWidths={[1, 3]}
            />
          </EuiPanel>
        </EuiFlexItem>
      )}

      {/* PromQL Expression */}
      {expression && (
        <EuiFlexItem>
          <EuiPanel hasBorder paddingSize="m">
            <EuiTitle size="xs">
              <h4>
                {i18n.translate('xpack.observability.prometheusAlertView.expression', {
                  defaultMessage: 'PromQL Expression',
                })}
              </h4>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiCodeBlock language="promql" fontSize="s" paddingSize="s">
              {expression}
            </EuiCodeBlock>
          </EuiPanel>
        </EuiFlexItem>
      )}

      {/* Labels */}
      {labels && Object.keys(labels).length > 0 && (
        <EuiFlexItem>
          <EuiPanel hasBorder paddingSize="m">
            <EuiTitle size="xs">
              <h4>
                {i18n.translate('xpack.observability.prometheusAlertView.labels', {
                  defaultMessage: 'Labels',
                })}
              </h4>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiFlexGroup wrap gutterSize="xs">
              {Object.entries(labels).map(([key, value]) => (
                <EuiFlexItem grow={false} key={key}>
                  <EuiBadge color="hollow">
                    {key}={value}
                  </EuiBadge>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
      )}

      {/* Annotations */}
      {annotations && Object.keys(annotations).length > 0 && (
        <EuiFlexItem>
          <EuiPanel hasBorder paddingSize="m">
            <EuiTitle size="xs">
              <h4>
                {i18n.translate('xpack.observability.prometheusAlertView.annotations', {
                  defaultMessage: 'Annotations',
                })}
              </h4>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiDescriptionList
              type="column"
              listItems={Object.entries(annotations).map(([key, value]) => ({
                title: key,
                description: value,
              }))}
              columnWidths={[1, 3]}
            />
          </EuiPanel>
        </EuiFlexItem>
      )}

      {/* External links */}
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="m">
          {generatorURL && (
            <EuiFlexItem grow={false}>
              <EuiLink href={generatorURL} target="_blank" external>
                {i18n.translate('xpack.observability.prometheusAlertView.viewExpression', {
                  defaultMessage: 'View Expression in Prometheus',
                })}
              </EuiLink>
            </EuiFlexItem>
          )}
          {externalUrl && (
            <EuiFlexItem grow={false}>
              <EuiLink href={externalUrl} target="_blank" external>
                {i18n.translate('xpack.observability.prometheusAlertView.viewInPrometheus', {
                  defaultMessage: 'View Alert in Prometheus',
                })}
              </EuiLink>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>

      {/* Raw payload */}
      {rawPayload && (
        <EuiFlexItem>
          <EuiPanel hasBorder paddingSize="m">
            <EuiTitle size="xs">
              <h4>
                {i18n.translate('xpack.observability.prometheusAlertView.rawPayload', {
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

