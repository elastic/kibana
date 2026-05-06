/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiCodeBlock,
  EuiComment,
  EuiCommentList,
  EuiCopy,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutFooter,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
  EuiToolTip,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useQueryClient } from '@kbn/react-query';
import { ALERT_EPISODE_ACTION_TYPE } from '@kbn/alerting-v2-schemas';
import { useFetchEpisodeEventsQuery } from '@kbn/alerting-v2-episodes-ui/hooks/use_fetch_episode_events_query';
import { useFetchEpisodeEventDataQuery } from '@kbn/alerting-v2-episodes-ui/hooks/use_fetch_episode_event_data_query';
import { useFetchEpisodeActions } from '@kbn/alerting-v2-episodes-ui/hooks/use_fetch_episode_actions';
import { useFetchGroupActions } from '@kbn/alerting-v2-episodes-ui/hooks/use_fetch_group_actions';
import {
  useFetchEpisodeChangelog,
  type EpisodeChangelogEntry,
} from '../hooks/use_fetch_episode_changelog';
import { useBulkGetProfiles } from '@kbn/alerting-v2-episodes-ui/hooks/use_bulk_get_profiles';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { UserAvatar } from '@kbn/user-profile-components';
import { AlertEpisodeStatusBadge } from '@kbn/alerting-v2-episodes-ui/components/status/status_badge';
import { AlertEpisodeTags } from '@kbn/alerting-v2-episodes-ui/components/actions/tags';
import { createEpisodeActions } from '@kbn/alerting-v2-episodes-ui/actions';
import {
  getLastEpisodeStatus,
  getRuleIdFromEpisodeRows,
  getGroupHashFromEpisodeRows,
  getTriggeredTimestamp,
  getEpisodeDurationMs,
} from '@kbn/alerting-v2-episodes-ui/utils/episode_series_derived';
import type { EpisodeEventRow } from '@kbn/alerting-v2-episodes-ui/queries/episode_events_query';
import type { AlertEpisodeStatus } from '@kbn/alerting-v2-schemas';
import { FlyoutHeader } from '../../flyout/shared/components/flyout_header';
import { FlyoutBody } from '../../flyout/shared/components/flyout_body';
import { useKibana } from '../../common/lib/kibana';
import { TakeActionDropdown } from '../components/take_action_dropdown';
import * as i18n from '../translations';

export interface AlertsV2DetailsPanelParams {
  episodeId: string;
}

export interface AlertsV2DetailsPanelProps {
  params: AlertsV2DetailsPanelParams;
}

const eventColumns: Array<EuiBasicTableColumn<EpisodeEventRow>> = [
  {
    field: '@timestamp',
    name: '@timestamp',
    sortable: true,
    width: '200px',
    render: (ts: string) =>
      new Date(ts).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
  },
  {
    field: 'status',
    name: 'Event status',
    width: '120px',
  },
  {
    field: 'episode.status',
    name: 'Episode status',
    width: '140px',
    render: (status: AlertEpisodeStatus) => <AlertEpisodeStatusBadge status={status} />,
  },
];

const formatDuration = (ms: number | undefined): string => {
  if (ms == null) return '\u2014';
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
};

const monoWrapCss = css`
  font-family: 'Roboto Mono', 'Courier New', monospace;
  font-size: 0.8125rem;
  word-break: break-all;
`;

const CopyableId: React.FC<{ value: string }> = ({ value }) => (
  <EuiCopy textToCopy={value}>
    {(copy) => (
      <EuiToolTip content="Click to copy">
        <button
          type="button"
          onClick={copy}
          css={css`
            all: unset;
            cursor: pointer;
            &:hover {
              text-decoration: underline;
            }
          `}
        >
          <span css={monoWrapCss}>{value}</span>
        </button>
      </EuiToolTip>
    )}
  </EuiCopy>
);

type FlyoutTab = 'overview' | 'json' | 'changelog';

const ACTION_TYPE_LABELS: Record<string, string> = {
  ack: 'Acknowledged',
  unack: 'Unacknowledged',
  snooze: 'Snoozed',
  unsnooze: 'Unsnoozed',
  deactivate: 'Deactivated',
  activate: 'Activated',
  tag: 'Tags updated',
  assign: 'Assignee changed',
};

const ACTION_TYPE_ICONS: Record<string, string> = {
  ack: 'check',
  unack: 'cross',
  snooze: 'bellSlash',
  unsnooze: 'bell',
  deactivate: 'minusInCircle',
  activate: 'plusInCircle',
  tag: 'tag',
  assign: 'user',
};

const formatChangelogTimestamp = (ts: string): string =>
  new Date(ts).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'medium' });

const resolveUsername = (
  uid: string | null,
  profilesMap: Map<string, UserProfileWithAvatar>
): string => {
  if (!uid) return 'system';
  const profile = profilesMap.get(uid);
  return profile?.user?.full_name ?? profile?.user?.username ?? uid;
};

const getChangelogDescription = (
  entry: EpisodeChangelogEntry,
  profilesMap: Map<string, UserProfileWithAvatar>
): string => {
  const parts: string[] = [];
  if (entry.reason) {
    parts.push(entry.reason);
  }
  if (entry.action_type === 'snooze' && entry.expiry) {
    parts.push(
      `Until ${new Date(entry.expiry).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}`
    );
  }
  if (entry.action_type === 'tag' && entry.tags) {
    const tagList = Array.isArray(entry.tags) ? entry.tags : [entry.tags];
    parts.push(`Tags: ${tagList.join(', ')}`);
  }
  if (entry.action_type === 'assign') {
    const assigneeName = resolveUsername(entry.assignee_uid, profilesMap);
    parts.push(entry.assignee_uid ? `Assigned to ${assigneeName}` : 'Assignee removed');
  }
  if (entry.episode_id) {
    parts.push('(episode-level)');
  } else {
    parts.push('(series-level)');
  }
  return parts.join(' \u2022 ');
};

export const AlertsV2DetailsPanel: React.FC<AlertsV2DetailsPanelProps> = ({ params }) => {
  const { episodeId } = params;
  const services = useKibana().services;
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState<FlyoutTab>('overview');

  const onTabClick = useCallback((tab: FlyoutTab) => setSelectedTab(tab), []);

  const {
    data: eventRows = [],
    isLoading: isLoadingEvents,
    refetch: refetchEvents,
  } = useFetchEpisodeEventsQuery({ episodeId, data: services.data });

  const { data: episodeEventData } = useFetchEpisodeEventDataQuery({
    episodeId,
    data: services.data,
  });

  const ruleId = useMemo(() => getRuleIdFromEpisodeRows(eventRows), [eventRows]);
  const groupHash = useMemo(() => getGroupHashFromEpisodeRows(eventRows), [eventRows]);
  const lastStatus = useMemo(() => getLastEpisodeStatus(eventRows), [eventRows]);
  const triggeredAt = useMemo(() => getTriggeredTimestamp(eventRows), [eventRows]);
  const durationMs = useMemo(() => getEpisodeDurationMs(eventRows), [eventRows]);

  const { data: episodeActionsMap, refetch: refetchEpisodeActions } = useFetchEpisodeActions({
    episodeIds: episodeId ? [episodeId] : [],
    expressions: services.expressions,
  });

  const { data: groupActionsMap, refetch: refetchGroupActions } = useFetchGroupActions({
    groupHashes: groupHash ? [groupHash] : [],
    expressions: services.expressions,
  });

  const { data: changelogEntries = [], isLoading: isLoadingChangelog } =
    useFetchEpisodeChangelog({
      episodeId,
      groupHash,
      data: services.data,
    });

  const changelogUids = useMemo(() => {
    const uids = new Set<string>();
    for (const entry of changelogEntries) {
      if (entry.actor) uids.add(entry.actor);
      if (entry.assignee_uid) uids.add(entry.assignee_uid);
    }
    return [...uids];
  }, [changelogEntries]);

  const { data: changelogProfiles } = useBulkGetProfiles({
    userProfile: services.userProfile,
    uids: changelogUids,
    toasts: services.notifications.toasts,
    errorTitle: 'Failed to load user profiles',
  });

  const changelogProfilesMap = useMemo(() => {
    const map = new Map<string, UserProfileWithAvatar>();
    if (changelogProfiles) {
      for (const profile of changelogProfiles) {
        map.set(profile.uid, profile as UserProfileWithAvatar);
      }
    }
    return map;
  }, [changelogProfiles]);

  const episodeAction = episodeId ? episodeActionsMap?.get(episodeId) : undefined;
  const groupAction = groupHash ? groupActionsMap?.get(groupHash) : undefined;
  const rawTags = groupAction?.tags;
  const tags = Array.isArray(rawTags) ? rawTags : rawTags ? [rawTags] : [];

  const hasNoActors = useMemo(
    () =>
      episodeAction?.lastAckAction !== ALERT_EPISODE_ACTION_TYPE.ACK &&
      groupAction?.lastSnoozeAction !== ALERT_EPISODE_ACTION_TYPE.SNOOZE &&
      groupAction?.lastDeactivateAction !== ALERT_EPISODE_ACTION_TYPE.DEACTIVATE,
    [episodeAction, groupAction]
  );

  const episodeActions = useMemo(
    () =>
      createEpisodeActions({
        http: services.http,
        overlays: services.overlays,
        notifications: services.notifications,
        rendering: services.rendering,
        application: services.application,
        userProfile: services.userProfile,
        docLinks: services.docLinks,
        expressions: services.expressions,
        queryClient,
        getEpisodeDetailsHref: () => '',
        getDiscoverHref: () => undefined,
      }),
    [services, queryClient]
  );

  const handleActionSuccess = useMemo(
    () => () => {
      refetchEvents();
      refetchEpisodeActions();
      refetchGroupActions();
    },
    [refetchEvents, refetchEpisodeActions, refetchGroupActions]
  );

  const syntheticEpisode = useMemo(() => {
    if (!episodeId || !lastStatus) return undefined;
    return {
      '@timestamp': eventRows[eventRows.length - 1]?.['@timestamp'] ?? '',
      'episode.id': episodeId,
      'episode.status': lastStatus,
      'rule.id': ruleId ?? '',
      group_hash: groupHash ?? '',
      first_timestamp: eventRows[0]?.['@timestamp'] ?? '',
      last_timestamp: eventRows[eventRows.length - 1]?.['@timestamp'] ?? '',
      duration: durationMs ?? 0,
      last_ack_action: (episodeAction?.lastAckAction as 'ack' | 'unack' | undefined) ?? undefined,
      last_assignee_uid: episodeAction?.lastAssigneeUid ?? undefined,
      last_snooze_action:
        (groupAction?.lastSnoozeAction as 'snooze' | 'unsnooze' | undefined) ?? undefined,
      last_deactivate_action:
        (groupAction?.lastDeactivateAction as 'activate' | 'deactivate' | undefined) ?? undefined,
      last_tags: groupAction?.tags,
    };
  }, [episodeId, lastStatus, ruleId, groupHash, eventRows, durationMs, episodeAction, groupAction]);

  const fullJson = useMemo(
    () =>
      JSON.stringify(
        {
          episode: syntheticEpisode ?? null,
          alert_data: episodeEventData
            ? {
                data: episodeEventData.data,
                data_timestamp: episodeEventData.dataTimestamp,
                is_stale: episodeEventData.isStale,
              }
            : null,
          actions: {
            episode: episodeAction ?? null,
            group: groupAction ?? null,
          },
          events: eventRows,
        },
        null,
        2
      ),
    [syntheticEpisode, episodeEventData, episodeAction, groupAction, eventRows]
  );

  const detailItems = useMemo(
    () => [
      {
        title: i18n.FLYOUT_EPISODE_ID_LABEL,
        description: <CopyableId value={episodeId} />,
      },
      {
        title: i18n.FLYOUT_RULE_LABEL,
        description: ruleId ? <CopyableId value={ruleId} /> : '\u2014',
      },
      {
        title: i18n.FLYOUT_TRIGGERED_LABEL,
        description: triggeredAt
          ? new Date(triggeredAt).toLocaleString(undefined, {
              dateStyle: 'medium',
              timeStyle: 'short',
            })
          : '\u2014',
      },
      {
        title: i18n.FLYOUT_DURATION_LABEL,
        description: formatDuration(durationMs),
      },
      {
        title: i18n.FLYOUT_GROUP_HASH_LABEL,
        description: groupHash ? <CopyableId value={groupHash} /> : '\u2014',
      },
    ],
    [episodeId, ruleId, triggeredAt, durationMs, groupHash]
  );

  const actionsOverviewItems = useMemo(() => {
    const items: Array<{ title: string; description: NonNullable<React.ReactNode> }> = [];

    if (episodeAction?.lastAckAction === ALERT_EPISODE_ACTION_TYPE.ACK) {
      items.push({
        title: i18n.FLYOUT_ACKNOWLEDGED_BY_LABEL,
        description: episodeAction.lastAckActor ?? '\u2014',
      });
    }

    if (groupAction?.lastDeactivateAction === ALERT_EPISODE_ACTION_TYPE.DEACTIVATE) {
      items.push({
        title: i18n.FLYOUT_RESOLVED_BY_LABEL,
        description: groupAction.lastDeactivateActor ?? '\u2014',
      });
    }

    if (groupAction?.lastSnoozeAction === ALERT_EPISODE_ACTION_TYPE.SNOOZE) {
      items.push({
        title: i18n.FLYOUT_SNOOZED_BY_LABEL,
        description: groupAction.lastSnoozeActor ?? '\u2014',
      });
      if (groupAction.snoozeExpiry) {
        items.push({
          title: i18n.FLYOUT_SNOOZED_UNTIL_LABEL,
          description: new Date(groupAction.snoozeExpiry).toLocaleString(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
          }),
        });
      }
    }

    return items;
  }, [episodeAction, groupAction]);

  if (isLoadingEvents) {
    return (
      <EuiFlexGroup justifyContent="center" alignItems="center" style={{ height: '100%' }}>
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="xl" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  const renderOverviewTab = () => (
    <>
      <EuiTitle size="xs">
        <h3>{i18n.FLYOUT_STATUS_LABEL}</h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiDescriptionList compressed type="responsiveColumn" listItems={detailItems} />

      <EuiHorizontalRule margin="l" />

      <EuiTitle size="xs">
        <h3>{i18n.FLYOUT_ACTIONS_OVERVIEW_TITLE}</h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      {hasNoActors ? (
        <EuiText size="s" color="subdued">
          {i18n.FLYOUT_ACTIONS_OVERVIEW_EMPTY}
        </EuiText>
      ) : (
        <EuiDescriptionList compressed type="responsiveColumn" listItems={actionsOverviewItems} />
      )}

      <EuiHorizontalRule margin="l" />

      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>{i18n.FLYOUT_EVENTS_TITLE}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">{i18n.FLYOUT_EVENT_COUNT(eventRows.length)}</EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />

      {eventRows.length === 0 ? (
        <EuiText size="s" color="subdued">
          {i18n.FLYOUT_NO_EVENTS}
        </EuiText>
      ) : (
        <EuiBasicTable
          items={eventRows}
          columns={eventColumns}
          tableCaption={i18n.FLYOUT_EVENTS_TITLE}
          tableLayout="auto"
          compressed
        />
      )}
    </>
  );

  const renderJsonTab = () => (
    <EuiCodeBlock language="json" isCopyable overflowHeight={600} paddingSize="m" fontSize="s">
      {fullJson}
    </EuiCodeBlock>
  );

  const renderChangelogTab = () => {
    if (isLoadingChangelog) {
      return (
        <EuiFlexGroup justifyContent="center" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="l" />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    if (changelogEntries.length === 0) {
      return (
        <EuiText size="s" color="subdued">
          {i18n.FLYOUT_CHANGELOG_EMPTY}
        </EuiText>
      );
    }

    return (
      <EuiCommentList aria-label={i18n.FLYOUT_TAB_CHANGELOG}>
        {changelogEntries.map((entry, idx) => {
          const actorProfile = entry.actor
            ? changelogProfilesMap.get(entry.actor)
            : undefined;
          const username = resolveUsername(entry.actor, changelogProfilesMap);
          const avatar = actorProfile ? (
            <UserAvatar
              user={actorProfile.user}
              avatar={actorProfile.data?.avatar}
              size="s"
            />
          ) : undefined;

          return (
            <EuiComment
              key={`${entry['@timestamp']}-${entry.action_type}-${idx}`}
              username={username}
              timestamp={formatChangelogTimestamp(entry['@timestamp'])}
              event={ACTION_TYPE_LABELS[entry.action_type] ?? entry.action_type}
              timelineAvatar={avatar ?? ACTION_TYPE_ICONS[entry.action_type] ?? 'dot'}
            >
              <EuiText size="s">
                {getChangelogDescription(entry, changelogProfilesMap)}
              </EuiText>
            </EuiComment>
          );
        })}
      </EuiCommentList>
    );
  };

  return (
    <>
      <FlyoutHeader>
        <EuiTitle size="s">
          <h2>{i18n.FLYOUT_TITLE}</h2>
        </EuiTitle>
        {tags.length > 0 && (
          <>
            <EuiSpacer size="s" />
            <AlertEpisodeTags tags={tags} />
          </>
        )}
        <EuiSpacer size="m" />
        <EuiTabs size="s" bottomBorder={false}>
          <EuiTab
            isSelected={selectedTab === 'overview'}
            onClick={() => onTabClick('overview')}
          >
            {i18n.FLYOUT_TAB_OVERVIEW}
          </EuiTab>
          <EuiTab isSelected={selectedTab === 'json'} onClick={() => onTabClick('json')}>
            {i18n.FLYOUT_TAB_JSON}
          </EuiTab>
          <EuiTab
            isSelected={selectedTab === 'changelog'}
            onClick={() => onTabClick('changelog')}
          >
            {i18n.FLYOUT_TAB_CHANGELOG}
            {changelogEntries.length > 0 && (
              <>
                {' '}
                <EuiBadge color="hollow">{changelogEntries.length}</EuiBadge>
              </>
            )}
          </EuiTab>
        </EuiTabs>
      </FlyoutHeader>

      <FlyoutBody>
        {selectedTab === 'overview' && renderOverviewTab()}
        {selectedTab === 'json' && renderJsonTab()}
        {selectedTab === 'changelog' && renderChangelogTab()}
      </FlyoutBody>

      {syntheticEpisode && (
        <EuiFlyoutFooter>
          <EuiPanel color="transparent">
            <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
              <EuiFlexItem grow={false}>
                <TakeActionDropdown
                  episodeActions={episodeActions}
                  episode={syntheticEpisode}
                  onActionSuccess={handleActionSuccess}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlyoutFooter>
      )}
    </>
  );
};
