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

interface SentryAlertViewProps {
  alert: Alert;
}

export const SentryAlertView: React.FC<SentryAlertViewProps> = ({ alert }) => {
  const rawPayload = alert['kibana.alert.raw_payload'] as Record<string, unknown> | undefined;
  const externalUrl = alert['kibana.alert.external_url']?.[0] as string | undefined;
  const connectorId = alert['kibana.alert.connector_id']?.[0] as string | undefined;
  const alertTitle = alert['kibana.alert.rule.name']?.[0] as string;
  const alertReason = alert['kibana.alert.reason']?.[0] as string;
  const severity = alert['kibana.alert.severity']?.[0] as string;
  const status = alert['kibana.alert.status']?.[0] as string;
  const timestamp = alert['@timestamp']?.[0] as string;

  // Sentry-specific fields from raw payload
  const issueId = rawPayload?.issue_id as string | undefined;
  const issueTitle = rawPayload?.issue_title as string | undefined;
  const culprit = rawPayload?.culprit as string | undefined;
  const platform = rawPayload?.platform as string | undefined;
  const project = rawPayload?.project as string | undefined;
  const projectSlug = rawPayload?.project_slug as string | undefined;
  const environment = rawPayload?.environment as string | undefined;
  const release = rawPayload?.release as string | undefined;
  const level = rawPayload?.level as string | undefined;
  const eventCount = rawPayload?.event_count as number | undefined;
  const userCount = rawPayload?.user_count as number | undefined;
  const firstSeen = rawPayload?.first_seen as string | undefined;
  const lastSeen = rawPayload?.last_seen as string | undefined;
  const stacktrace = rawPayload?.stacktrace as string | undefined;
  const tags = rawPayload?.tags as Record<string, string> | undefined;

  const descriptionListItems = [
    {
      title: i18n.translate('xpack.observability.sentryAlertView.issueTitle', {
        defaultMessage: 'Issue Title',
      }),
      description: issueTitle || alertTitle || '--',
    },
    {
      title: i18n.translate('xpack.observability.sentryAlertView.status', {
        defaultMessage: 'Status',
      }),
      description: (
        <EuiBadge color={status === 'active' ? 'danger' : 'success'}>
          {status?.toUpperCase() || 'UNKNOWN'}
        </EuiBadge>
      ),
    },
    {
      title: i18n.translate('xpack.observability.sentryAlertView.level', {
        defaultMessage: 'Level',
      }),
      description: (
        <EuiBadge
          color={
            level === 'fatal' || level === 'error'
              ? 'danger'
              : level === 'warning'
              ? 'warning'
              : 'default'
          }
        >
          {level?.toUpperCase() || severity?.toUpperCase() || 'UNKNOWN'}
        </EuiBadge>
      ),
    },
    {
      title: i18n.translate('xpack.observability.sentryAlertView.timestamp', {
        defaultMessage: 'Triggered At',
      }),
      description: timestamp ? new Date(timestamp).toLocaleString() : '--',
    },
  ];

  const sentrySpecificItems = [
    ...(issueId
      ? [
          {
            title: i18n.translate('xpack.observability.sentryAlertView.issueId', {
              defaultMessage: 'Issue ID',
            }),
            description: issueId,
          },
        ]
      : []),
    ...(project || projectSlug
      ? [
          {
            title: i18n.translate('xpack.observability.sentryAlertView.project', {
              defaultMessage: 'Project',
            }),
            description: project || projectSlug,
          },
        ]
      : []),
    ...(platform
      ? [
          {
            title: i18n.translate('xpack.observability.sentryAlertView.platform', {
              defaultMessage: 'Platform',
            }),
            description: <EuiBadge color="hollow">{platform}</EuiBadge>,
          },
        ]
      : []),
    ...(environment
      ? [
          {
            title: i18n.translate('xpack.observability.sentryAlertView.environment', {
              defaultMessage: 'Environment',
            }),
            description: <EuiBadge color="hollow">{environment}</EuiBadge>,
          },
        ]
      : []),
    ...(release
      ? [
          {
            title: i18n.translate('xpack.observability.sentryAlertView.release', {
              defaultMessage: 'Release',
            }),
            description: release,
          },
        ]
      : []),
    ...(culprit
      ? [
          {
            title: i18n.translate('xpack.observability.sentryAlertView.culprit', {
              defaultMessage: 'Culprit',
            }),
            description: <code>{culprit}</code>,
          },
        ]
      : []),
    ...(eventCount !== undefined
      ? [
          {
            title: i18n.translate('xpack.observability.sentryAlertView.eventCount', {
              defaultMessage: 'Event Count',
            }),
            description: String(eventCount),
          },
        ]
      : []),
    ...(userCount !== undefined
      ? [
          {
            title: i18n.translate('xpack.observability.sentryAlertView.userCount', {
              defaultMessage: 'Affected Users',
            }),
            description: String(userCount),
          },
        ]
      : []),
    ...(firstSeen
      ? [
          {
            title: i18n.translate('xpack.observability.sentryAlertView.firstSeen', {
              defaultMessage: 'First Seen',
            }),
            description: new Date(firstSeen).toLocaleString(),
          },
        ]
      : []),
    ...(lastSeen
      ? [
          {
            title: i18n.translate('xpack.observability.sentryAlertView.lastSeen', {
              defaultMessage: 'Last Seen',
            }),
            description: new Date(lastSeen).toLocaleString(),
          },
        ]
      : []),
  ];

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      {/* Header with Sentry branding */}
      <EuiFlexItem>
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiIcon type="bug" size="xl" color="#362D59" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiTitle size="s">
              <h3>
                {i18n.translate('xpack.observability.sentryAlertView.title', {
                  defaultMessage: 'Sentry Issue',
                })}
              </h3>
            </EuiTitle>
          </EuiFlexItem>
          {connectorId && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">
                {i18n.translate('xpack.observability.sentryAlertView.connectorId', {
                  defaultMessage: 'Connector: {connectorId}',
                  values: { connectorId },
                })}
              </EuiBadge>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>

      {/* Issue details */}
      <EuiFlexItem>
        <EuiPanel hasBorder paddingSize="m">
          <EuiTitle size="xs">
            <h4>
              {i18n.translate('xpack.observability.sentryAlertView.issueDetails', {
                defaultMessage: 'Issue Details',
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

      {/* Error message */}
      {alertReason && (
        <EuiFlexItem>
          <EuiPanel hasBorder paddingSize="m">
            <EuiTitle size="xs">
              <h4>
                {i18n.translate('xpack.observability.sentryAlertView.errorMessage', {
                  defaultMessage: 'Error Message',
                })}
              </h4>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiText size="s" color="danger">
              {alertReason}
            </EuiText>
          </EuiPanel>
        </EuiFlexItem>
      )}

      {/* Sentry-specific metadata */}
      {sentrySpecificItems.length > 0 && (
        <EuiFlexItem>
          <EuiPanel hasBorder paddingSize="m">
            <EuiTitle size="xs">
              <h4>
                {i18n.translate('xpack.observability.sentryAlertView.sentryMetadata', {
                  defaultMessage: 'Sentry Metadata',
                })}
              </h4>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiDescriptionList
              type="column"
              listItems={sentrySpecificItems}
              columnWidths={[1, 3]}
            />
          </EuiPanel>
        </EuiFlexItem>
      )}

      {/* Tags */}
      {tags && Object.keys(tags).length > 0 && (
        <EuiFlexItem>
          <EuiPanel hasBorder paddingSize="m">
            <EuiTitle size="xs">
              <h4>
                {i18n.translate('xpack.observability.sentryAlertView.tags', {
                  defaultMessage: 'Tags',
                })}
              </h4>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiFlexGroup wrap gutterSize="xs">
              {Object.entries(tags).map(([key, value]) => (
                <EuiFlexItem grow={false} key={key}>
                  <EuiBadge color="hollow">
                    {key}: {value}
                  </EuiBadge>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
      )}

      {/* Stacktrace */}
      {stacktrace && (
        <EuiFlexItem>
          <EuiPanel hasBorder paddingSize="m">
            <EuiTitle size="xs">
              <h4>
                {i18n.translate('xpack.observability.sentryAlertView.stacktrace', {
                  defaultMessage: 'Stacktrace',
                })}
              </h4>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiCodeBlock language="text" fontSize="s" paddingSize="s" overflowHeight={300}>
              {stacktrace}
            </EuiCodeBlock>
          </EuiPanel>
        </EuiFlexItem>
      )}

      {/* External link */}
      {externalUrl && (
        <EuiFlexItem>
          <EuiLink href={externalUrl} target="_blank" external>
            {i18n.translate('xpack.observability.sentryAlertView.viewInSentry', {
              defaultMessage: 'View in Sentry',
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
                {i18n.translate('xpack.observability.sentryAlertView.rawPayload', {
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

