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
import type {
  NightshiftInvestigationsAPIReturnType,
  NightshiftInvestigationsPublicStart,
} from '@kbn/nightshift-investigations-plugin/public';
import type { SlackChannelBinding } from '@kbn/significant-events-plugin/common';
import { NIGHTSHIFT_EBT_ACTIONS, NIGHTSHIFT_EBT_ELEMENTS } from '../../../common/ebt_constants';
import { parseSlackChannelInput } from '../../../common/parse_slack_channel_input';
import { slackDeliveriesQueryKey } from '../../../data/query_keys';
import {
  formatChannelLabel,
  useAllRelayAppBindingsWithHttp,
  useAvailableChannelsWithHttp,
} from '../../../data/relay_apps/use_relay_app_bindings';

const endpoint = 'GET /internal/nightshift/investigations/{id}/slack_deliveries';
type SlackDelivery = NightshiftInvestigationsAPIReturnType<typeof endpoint>['deliveries'][number];
const getHttpStatus = (error: unknown): number | undefined =>
  isHttpFetchError(error) ? error.response?.status : undefined;
const isInaccessible = (error: unknown): boolean => [403, 404].includes(getHttpStatus(error) ?? 0);

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

const getDeliveryPresentation = (
  { channel, reason, status }: SlackDelivery,
  binding: SlackChannelBinding | undefined,
  availableChannelName: string | undefined,
  settingsHref?: string
): { label: string; message?: string; settingsHref?: string } => {
  const label = binding
    ? formatChannelLabel(binding)
    : availableChannelName !== undefined
    ? `#${availableChannelName}`
    : channel;
  if (status !== 'failed' && status !== 'unconfirmed') return { label };
  if (reason === 'channel_not_connected' && binding) {
    return { label, message: channelWasDisconnected };
  }
  if (reason === 'channel_not_connected' || reason === 'app_disconnected') {
    return {
      label,
      message: (settingsHref ? settingsReasonLabels : viewerReasonLabels)[reason],
      settingsHref: status === 'failed' ? settingsHref : undefined,
    };
  }
  return {
    label,
    message: reason
      ? otherReasonLabels[reason]
      : status === 'failed'
      ? failedMessage
      : unconfirmedMessage,
  };
};

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
      ({ channel }) =>
        parseSlackChannelInput(channel) === channel &&
        !bindings.some((binding) => binding.channel === channel)
    ) === true;
  const { channels } = useAvailableChannelsWithHttp(http, canLookUpDisconnectedChannels);
  if (inaccessible || (!data?.deliveries.length && !isError)) return null;

  const httpStatus = getHttpStatus(error);
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
      {data?.deliveries.map((delivery) => {
        const { id, channel, phase, status, attemptedAt } = delivery;
        const binding = bindings.find((entry) => entry.channel === channel);
        const available = canLookUpDisconnectedChannels
          ? channels.find((entry) => entry.channel === channel)
          : undefined;
        const row = getDeliveryPresentation(
          delivery,
          binding,
          available?.displayName,
          settingsHref
        );
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
                    <strong>{row.label}</strong>
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
            {row.message && (
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  {row.message}
                  {row.settingsHref && (
                    <>
                      {' '}
                      <EuiLink
                        href={row.settingsHref}
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
        <>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            {httpStatus === undefined ? (
              <FormattedMessage
                id="xpack.nightshift.slackDelivery.unavailableMessage"
                defaultMessage="Slack delivery status is unavailable."
              />
            ) : (
              <FormattedMessage
                id="xpack.nightshift.slackDelivery.unavailableHttpErrorMessage"
                defaultMessage="Slack delivery status is unavailable (HTTP {status})."
                values={{ status: String(httpStatus) }}
              />
            )}{' '}
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
        </>
      )}
    </section>
  );
};
