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
import { isHttpFetchError, type HttpStart } from '@kbn/core-http-browser';
import { FormattedDate, FormattedMessage } from '@kbn/i18n-react';
import { useQuery } from '@kbn/react-query';
import { getEbtProps } from '@kbn/ebt-click';
import type { NightshiftInvestigationsPublicStart } from '@kbn/nightshift-investigations-plugin/public';
import { NIGHTSHIFT_EBT_ACTIONS, NIGHTSHIFT_EBT_ELEMENTS } from '../../../common/ebt_constants';
import { slackDeliveriesQueryKey } from '../../../data/query_keys';
import {
  formatChannelLabel,
  useAllRelayAppBindingsWithHttp,
  useAvailableChannelsWithHttp,
} from '../../../data/relay_apps/use_relay_app_bindings';

const endpoint = 'GET /internal/nightshift/investigations/{id}/slack_deliveries';
const isInaccessible = (error: unknown): boolean =>
  isHttpFetchError(error) && [403, 404].includes(error.response?.status ?? 0);

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
  sending: i18n.translate('xpack.nightshift.slackDelivery.sendingStatusLabel', {
    defaultMessage: 'Sending',
  }),
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

const statusColors = {
  sending: 'default',
  sent: 'success',
  failed: 'danger',
  unconfirmed: 'warning',
} as const;

const settingsReasonLabels = {
  channel_not_connected: i18n.translate(
    'xpack.nightshift.slackDelivery.channelDisconnectedMessage',
    {
      defaultMessage: 'Connect this channel in Slack settings to receive future notifications.',
    }
  ),
  app_disconnected: i18n.translate('xpack.nightshift.slackDelivery.appDisconnectedMessage', {
    defaultMessage: 'Reconnect the Elastic Slack app in Slack settings.',
  }),
};

const viewerReasonLabels = {
  channel_not_connected: i18n.translate(
    'xpack.nightshift.slackDelivery.askAdminToConnectChannelDescription',
    {
      defaultMessage: 'Ask a nightshift admin to connect this channel in Slack settings.',
    }
  ),
  app_disconnected: i18n.translate(
    'xpack.nightshift.slackDelivery.askAdminToReconnectAppDescription',
    {
      defaultMessage:
        'Ask a nightshift admin to reconnect the Elastic Slack app in Slack settings.',
    }
  ),
};

const otherReasonLabels = {
  rate_limited: i18n.translate('xpack.nightshift.slackDelivery.rateLimitedMessage', {
    defaultMessage: 'Slack rate-limited this notification.',
  }),
  start_rate_limited: i18n.translate('xpack.nightshift.slackDelivery.startRateLimitedDescription', {
    defaultMessage:
      'Slack rate-limited the start notification. The findings could not be posted without a thread.',
  }),
  thread_missing: i18n.translate('xpack.nightshift.slackDelivery.missingThreadDescription', {
    defaultMessage: 'The findings could not be posted because there was no Slack thread to update.',
  }),
  thread_unconfirmed: i18n.translate('xpack.nightshift.slackDelivery.threadUnconfirmedMessage', {
    defaultMessage:
      'Check the channel for the earlier message. Slack did not confirm its delivery.',
  }),
};

const channelWasDisconnected = i18n.translate(
  'xpack.nightshift.slackDelivery.channelWasDisconnectedDescription',
  {
    defaultMessage: 'This channel was not connected when delivery was attempted.',
  }
);

const failedMessage = i18n.translate('xpack.nightshift.slackDelivery.failedMessage', {
  defaultMessage: 'Check the Slack connector and its access to this channel.',
});

const unconfirmedMessage = i18n.translate('xpack.nightshift.slackDelivery.unconfirmedMessage', {
  defaultMessage: 'Check the channel for the message. Slack delivery could not be confirmed.',
});

export const SlackDeliveryStatus = ({
  http,
  investigationsClient,
  investigationId,
  executionId,
  settingsHref,
}: {
  http: HttpStart;
  investigationsClient: NightshiftInvestigationsPublicStart['investigationsClient'];
  investigationId: string;
  executionId?: string;
  settingsHref?: string;
}) => {
  const { euiTheme } = useEuiTheme();
  const { data, error, isError, isFetching, refetch } = useQuery({
    queryKey: slackDeliveriesQueryKey(investigationId, executionId),
    queryFn: async ({ signal }) => {
      const result = await investigationsClient.fetch(endpoint, {
        params: {
          path: { id: investigationId },
          ...(executionId && { query: { executionId } }),
        },
        signal: signal ?? null,
      });
      if (!Array.isArray(result?.deliveries)) {
        throw new Error('Invalid Slack delivery status response');
      }
      return result;
    },
    retry: false,
    // Dispatch, investigation completion, and the failure sweep can record receipts at different times.
    refetchInterval: (result, query) => {
      if (isInaccessible(query.state.error)) return false;
      return result?.deliveries.some(({ status }) => status === 'sending') ? 5_000 : 30_000;
    },
  });
  const inaccessible = isInaccessible(error);
  const { bindings, isLoading: isLoadingBindings } = useAllRelayAppBindingsWithHttp(
    http,
    !inaccessible && !!data?.deliveries.length
  );
  const canLookUpDisconnectedChannels =
    Boolean(settingsHref) &&
    !inaccessible &&
    !isLoadingBindings &&
    data?.deliveries.some(
      ({ channel, reason, status }) =>
        status === 'failed' &&
        reason === 'channel_not_connected' &&
        !bindings.some((binding) => binding.channel === channel)
    ) === true;
  const { channels } = useAvailableChannelsWithHttp(http, canLookUpDisconnectedChannels);
  if (inaccessible || (!data?.deliveries.length && !isError)) return null;

  const reasonLabels = {
    ...(settingsHref ? settingsReasonLabels : viewerReasonLabels),
    ...otherReasonLabels,
  };

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
        const binding = bindings.find((entry) => entry.channel === channel);
        const available = canLookUpDisconnectedChannels
          ? channels.find((entry) => entry.channel === channel)
          : undefined;
        const channelLabel = binding
          ? formatChannelLabel(binding)
          : available
          ? `#${available.displayName}`
          : channel;
        const channelReconnected = reason === 'channel_not_connected' && binding != null;
        const needsSettings =
          status === 'failed' &&
          !channelReconnected &&
          (reason === 'channel_not_connected' || reason === 'app_disconnected');
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
                    <strong>{channelLabel}</strong>
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
            {(status === 'failed' || status === 'unconfirmed') && (
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  {channelReconnected
                    ? channelWasDisconnected
                    : reason
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
          />{' '}
          <EuiLink
            data-test-subj="nightshiftSlackDeliveryRefreshStatus"
            disabled={isFetching}
            onClick={() => void refetch()}
            {...getEbtProps({
              action: NIGHTSHIFT_EBT_ACTIONS.REFRESH_SLACK_DELIVERY_STATUS,
              element: NIGHTSHIFT_EBT_ELEMENTS.SLACK_DELIVERY_STATUS,
            })}
          >
            <FormattedMessage
              id="xpack.nightshift.slackDelivery.refreshStatusButtonLabel"
              defaultMessage="Refresh status"
            />
          </EuiLink>
        </EuiText>
      )}
    </section>
  );
};
