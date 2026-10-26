/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import type {
  SlackAppBindChannelResponse,
  SlackAppBindingsResponse,
  SlackAppUnbindChannelResponse,
  SlackChannelBinding,
} from '@kbn/significant-events-plugin/common';
import { buildPath, type HttpStart } from '@kbn/core-http-browser';
import { useKibana } from '../../../hooks/use_kibana';
import { getFormattedError } from '../../../common/errors';

const BINDINGS_ROUTE = '/internal/significant_events/apps/slack/bindings';
const BIND_CHANNEL_ROUTE = `/internal/significant_events/apps/slack/bindings/{channelId}/bind`;
const UNBIND_CHANNEL_ROUTE = `/internal/significant_events/apps/slack/bindings/{channelId}/unbind`;

export const RELAY_APP_BINDINGS_QUERY_KEY = ['relayAppConnectionBindings'] as const;

/** Number of connected channels shown per page in the settings table. */
export const RELAY_APP_BINDINGS_PAGE_SIZE = 10;

/** Stable reference for the loading/empty state so the table `items` prop stays referentially equal. */
const EMPTY_BINDINGS: SlackChannelBinding[] = [];

// Connected channels only change via bind/unbind in this UI (which invalidate these
// queries), so cached results stay fresh and revisiting one avoids a redundant fetch.
const BINDINGS_QUERY_OPTIONS = { retry: false, staleTime: 30_000 } as const;

const fetchBindingsPage = (
  http: HttpStart,
  { perPage, cursor, signal }: { perPage: number; cursor?: string; signal?: AbortSignal }
): Promise<SlackAppBindingsResponse> =>
  http.get<SlackAppBindingsResponse>(BINDINGS_ROUTE, {
    query: { perPage, ...(cursor ? { cursor } : {}) },
    signal,
  });

export interface UseRelayAppBindings {
  bindings: SlackChannelBinding[];
  isLoading: boolean;
  isFetching: boolean;
  /** Opaque cursor for the next page; absent when this is the last page. */
  nextCursor?: string;
}

/**
 * Fetches a single page of the Slack channels connected to this deployment. The query is
 * only active when `enabled` is true (e.g. once the Slack App is connected). Pass the
 * opaque `cursor` from a previous page's `nextCursor` to fetch the next page; omit it for
 * the first page. Each cursor is cached as its own query so paging back and forth is instant.
 */
export function useRelayAppBindings(enabled: boolean, cursor?: string): UseRelayAppBindings {
  const {
    services: { http, notifications },
  } = useKibana();

  const query = useQuery<SlackAppBindingsResponse, Error>({
    queryKey: [...RELAY_APP_BINDINGS_QUERY_KEY, cursor ?? null],
    queryFn: ({ signal }) =>
      fetchBindingsPage(http, { perPage: RELAY_APP_BINDINGS_PAGE_SIZE, cursor, signal }),
    ...BINDINGS_QUERY_OPTIONS,
    enabled,
    keepPreviousData: true,
    onError: (error) => {
      notifications.toasts.addError(getFormattedError(error), {
        title: i18n.translate('xpack.nightshift.settings.apps.listBindingsError', {
          defaultMessage: 'Failed to load connected Slack channels',
        }),
      });
    },
  });

  return {
    bindings: query.data?.bindings ?? EMPTY_BINDINGS,
    isLoading: query.isLoading && enabled,
    isFetching: query.isFetching && enabled,
    nextCursor: query.data?.nextCursor,
  };
}

/** Largest page the bindings route accepts. */
const ALL_BINDINGS_PAGE_SIZE = 200;
// Bounds the walk if the Relay keeps returning a cursor.
const ALL_BINDINGS_MAX_PAGES = 10;

export interface UseAllRelayAppBindings {
  bindings: SlackChannelBinding[];
  isLoading: boolean;
  isError: boolean;
  /** False when the page bound was hit before the Relay ran out of pages. */
  isComplete: boolean;
}

/** Every Slack channel connected to this deployment, for pickers that need the full list. */
export function useAllRelayAppBindings(): UseAllRelayAppBindings {
  const {
    services: { http },
  } = useKibana();

  const query = useQuery({
    queryKey: [...RELAY_APP_BINDINGS_QUERY_KEY, 'all'],
    queryFn: async ({ signal }) => {
      const bindings: SlackChannelBinding[] = [];
      let cursor: string | undefined;
      for (let page = 0; page < ALL_BINDINGS_MAX_PAGES; page++) {
        const response = await fetchBindingsPage(http, {
          perPage: ALL_BINDINGS_PAGE_SIZE,
          cursor,
          signal,
        });
        bindings.push(...response.bindings.filter(({ channel }) => channel != null));
        cursor = response.nextCursor;
        if (!cursor) break;
      }
      bindings.sort((left, right) =>
        formatChannelLabel(left).localeCompare(formatChannelLabel(right))
      );
      return { bindings, isComplete: !cursor };
    },
    ...BINDINGS_QUERY_OPTIONS,
  });

  return {
    bindings: query.data?.bindings ?? EMPTY_BINDINGS,
    isLoading: query.isLoading,
    isError: query.isError,
    isComplete: query.data?.isComplete ?? true,
  };
}

/** Plain-text label; the Relay withholds a private channel's name. */
export const formatChannelLabel = ({
  displayName,
  visibility,
  channel,
}: SlackChannelBinding): string => {
  if (displayName != null) return `#${displayName}`;
  if (visibility === 'private') {
    return i18n.translate('xpack.nightshift.settings.apps.privateChannelLabel', {
      defaultMessage: 'Private · {channelId}',
      values: { channelId: channel ?? '' },
    });
  }
  return channel ?? '';
};

/** Label for a stored channel value; a value that is not a connected channel id is kept as is. */
export const formatChannelValue = (value: string, bindings: SlackChannelBinding[]): string => {
  const binding = bindings.find(({ channel }) => channel === value);
  return binding ? formatChannelLabel(binding) : value;
};

export type BindFailureReason =
  | 'not_a_member'
  | 'private_channel_access_required'
  | 'channel_taken'
  | 'other';

export interface BindFailure {
  reason: BindFailureReason;
  message: string;
}

const KNOWN_BIND_REASONS: readonly string[] = [
  'not_a_member',
  'private_channel_access_required',
  'channel_taken',
];

export const toBindFailure = (error: unknown): BindFailure => {
  const { body } = error as {
    body?: { message?: unknown; attributes?: { data?: { reason?: unknown } } };
  };
  const reason = body?.attributes?.data?.reason;
  return {
    reason:
      typeof reason === 'string' && KNOWN_BIND_REASONS.includes(reason)
        ? (reason as BindFailureReason)
        : 'other',
    message: getFormattedError(error).message,
  };
};

export interface UseBindChannel {
  bind: (channelId: string) => Promise<void>;
  isLoading: boolean;
  failure?: BindFailure;
  clearFailure: () => void;
}

/** Mutation hook for binding a channel to this deployment. */
export function useBindChannel(): UseBindChannel {
  const {
    services: { http },
  } = useKibana();
  const queryClient = useQueryClient();

  const mutation = useMutation<SlackAppBindChannelResponse, Error, string>({
    mutationFn: (channelId: string) =>
      http.post<SlackAppBindChannelResponse>(buildPath(BIND_CHANNEL_ROUTE, { channelId })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: RELAY_APP_BINDINGS_QUERY_KEY }),
  });

  return {
    bind: (channelId: string) => mutation.mutateAsync(channelId).then(() => undefined),
    isLoading: mutation.isLoading,
    failure: mutation.error ? toBindFailure(mutation.error) : undefined,
    clearFailure: mutation.reset,
  };
}

export interface UseUnbindChannel {
  unbind: (channelId: string) => Promise<void>;
  isLoading: boolean;
}

/** Per-row mutation hook for releasing a channel binding from this deployment. */
export function useUnbindChannel(): UseUnbindChannel {
  const {
    services: { http, notifications },
  } = useKibana();
  const queryClient = useQueryClient();

  const mutation = useMutation<SlackAppUnbindChannelResponse, Error, string>({
    mutationFn: (channelId: string) =>
      http.post<SlackAppUnbindChannelResponse>(buildPath(UNBIND_CHANNEL_ROUTE, { channelId })),
    onError: (error) => {
      notifications.toasts.addError(getFormattedError(error), {
        title: i18n.translate('xpack.nightshift.settings.apps.unbindChannelError', {
          defaultMessage: 'Failed to unbind the Slack channel',
        }),
      });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: RELAY_APP_BINDINGS_QUERY_KEY }),
  });

  return {
    unbind: (channelId: string) => mutation.mutateAsync(channelId).then(() => undefined),
    isLoading: mutation.isLoading,
  };
}
