/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedDate, FormattedMessage } from '@kbn/i18n-react';
import { useQuery } from '@kbn/react-query';
import { getEbtProps } from '@kbn/ebt-click';
import type { NightshiftInvestigationsPublicStart } from '@kbn/nightshift-investigations-plugin/public';
import { NIGHTSHIFT_EBT_ACTIONS, NIGHTSHIFT_EBT_ELEMENTS } from '../../../common/ebt_constants';
import { slackDeliveriesQueryKey } from '../../../data/query_keys';

const endpoint = 'GET /internal/nightshift/investigations/{id}/slack_deliveries';

const phaseLabels = {
  started: i18n.translate('xpack.nightshift.slackDelivery.startedLabel', {
    defaultMessage: 'Start notification',
  }),
  completed: i18n.translate('xpack.nightshift.slackDelivery.completedLabel', {
    defaultMessage: 'Findings',
  }),
  failed: i18n.translate('xpack.nightshift.slackDelivery.failedLabel', {
    defaultMessage: 'Failure notification',
  }),
  timed_out: i18n.translate('xpack.nightshift.slackDelivery.timedOutLabel', {
    defaultMessage: 'Timeout notification',
  }),
};

const statusLabels = {
  sent: i18n.translate('xpack.nightshift.slackDelivery.sentStatusLabel', {
    defaultMessage: 'Delivered',
  }),
  failed: i18n.translate('xpack.nightshift.slackDelivery.failedStatusLabel', {
    defaultMessage: 'Failed',
  }),
  unconfirmed: i18n.translate('xpack.nightshift.slackDelivery.unconfirmedStatusLabel', {
    defaultMessage: 'Unconfirmed',
  }),
};

const statusColors = { sent: 'success', failed: 'danger', unconfirmed: 'warning' } as const;

const reasonLabels = {
  channel_not_connected: i18n.translate(
    'xpack.nightshift.slackDelivery.channelDisconnectedMessage',
    {
      defaultMessage: 'Connect this channel in Slack settings to receive future notifications.',
    }
  ),
  app_disconnected: i18n.translate('xpack.nightshift.slackDelivery.appDisconnectedMessage', {
    defaultMessage: 'Reconnect the Elastic Slack app in Slack settings.',
  }),
  rate_limited: i18n.translate('xpack.nightshift.slackDelivery.rateLimitedMessage', {
    defaultMessage: 'Slack rate-limited this notification.',
  }),
  thread_unconfirmed: i18n.translate('xpack.nightshift.slackDelivery.threadUnconfirmedMessage', {
    defaultMessage:
      'Check the channel for the earlier message. Slack did not confirm its delivery.',
  }),
};

const failedMessage = i18n.translate('xpack.nightshift.slackDelivery.failedMessage', {
  defaultMessage: 'Check the Slack app and channel connection in Slack settings.',
});

const unconfirmedMessage = i18n.translate('xpack.nightshift.slackDelivery.unconfirmedMessage', {
  defaultMessage: 'Check the channel for the message. Slack delivery could not be confirmed.',
});

export const SlackDeliveryStatus = ({
  investigationsClient,
  investigationId,
  executionId,
  settingsHref,
  isRunning,
}: {
  investigationsClient: NightshiftInvestigationsPublicStart['investigationsClient'];
  investigationId: string;
  executionId?: string;
  settingsHref?: string;
  isRunning?: boolean;
}) => {
  const { euiTheme } = useEuiTheme();
  const { data, isError } = useQuery({
    queryKey: slackDeliveriesQueryKey(investigationId, executionId),
    queryFn: ({ signal }) =>
      investigationsClient.fetch(endpoint, {
        params: {
          path: { id: investigationId },
          ...(executionId && { query: { executionId } }),
        },
        signal: signal ?? null,
      }),
    retry: false,
    refetchInterval: isRunning ? 10_000 : false,
  });
  if (!data?.deliveries.length && !isError) return null;

  return (
    <section data-test-subj="nightshiftSlackDeliveryStatus">
      <EuiSpacer size="m" />
      <EuiTitle size="xs">
        <h3>
          {executionId ? (
            <FormattedMessage
              id="xpack.nightshift.slackDelivery.title"
              defaultMessage="Slack delivery status"
            />
          ) : (
            <FormattedMessage
              id="xpack.nightshift.slackDelivery.latestTitle"
              defaultMessage="Last recorded Slack deliveries"
            />
          )}
        </h3>
      </EuiTitle>
      {data?.deliveries.map(({ id, channel, phase, status, reason, attemptedAt }) => {
        const needsSettings =
          status === 'failed' &&
          (!reason || reason === 'channel_not_connected' || reason === 'app_disconnected');
        return (
          <EuiFlexGroup
            key={id}
            direction="column"
            gutterSize="xs"
            css={{ marginBlockStart: euiTheme.size.s }}
          >
            <EuiFlexItem grow={false}>
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
                <EuiFlexItem grow={false}>
                  <EuiText size="s">
                    <strong>{channel}</strong>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge color={statusColors[status]}>{statusLabels[status]}</EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText color="subdued" size="xs">
                {phase && <>{phaseLabels[phase]} · </>}
                <FormattedDate
                  value={attemptedAt}
                  month="short"
                  day="numeric"
                  hour="numeric"
                  minute="numeric"
                />
              </EuiText>
            </EuiFlexItem>
            {status !== 'sent' && (
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  {reason
                    ? reasonLabels[reason]
                    : status === 'failed'
                    ? failedMessage
                    : unconfirmedMessage}
                  {needsSettings && settingsHref && (
                    <>
                      {' '}
                      <EuiLink
                        href={settingsHref}
                        data-test-subj="nightshiftSlackDeliverySettingsLink"
                        {...getEbtProps({
                          action: NIGHTSHIFT_EBT_ACTIONS.VIEW_SETTINGS,
                          element: NIGHTSHIFT_EBT_ELEMENTS.SLACK_DELIVERY_STATUS,
                        })}
                      >
                        <FormattedMessage
                          id="xpack.nightshift.slackDelivery.settingsLink"
                          defaultMessage="Open Slack settings"
                        />
                      </EuiLink>
                    </>
                  )}
                </EuiText>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        );
      })}
      {isError && !data && (
        <EuiText size="s" color="subdued">
          <FormattedMessage
            id="xpack.nightshift.slackDelivery.unavailableMessage"
            defaultMessage="Slack delivery status is unavailable."
          />
        </EuiText>
      )}
    </section>
  );
};
