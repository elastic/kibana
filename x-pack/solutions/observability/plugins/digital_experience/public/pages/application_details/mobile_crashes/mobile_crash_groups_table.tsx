/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiLink,
  EuiText,
} from '@elastic/eui';
import type { Criteria, EuiBasicTableColumn, PropertySort } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedRelative } from '@kbn/i18n-react';
import { EBT_CLICK_ACTIONS, getEbtProps } from '@kbn/ebt-click';
import { CRASH_NEW_LOOKBACK_DAYS } from '../../../../common/mobile/crash_groups';
import { ERROR_GROUPS_ROWS } from '../../../../common/top_rows';
import type { CrashGroupSeen, MobileCrashGroup } from '../../../../common/types/mobile';
import { DataPanel } from '../../../components/data_panel';
import { MOBILE_CRASHES_EBT_ELEMENTS } from '../../../ebt_constants';
import { useFormatters } from '../../../hooks/use_formatters';
import {
  EVENTS_LABEL,
  LAST_SEEN_LABEL,
  SESSIONS_LABEL,
  UNKNOWN_ERROR_TYPE_LABEL,
  USERS_LABEL,
  newInReleaseLabel,
} from '../../../labels';
import { metricColumnPreset } from '../../../utils/column_presets';

const TITLE = i18n.translate('xpack.digitalExperience.mobile.crashes.table.title', {
  defaultMessage: 'Crash groups',
});

const SUBTITLE = i18n.translate('xpack.digitalExperience.mobile.crashes.table.subtitle', {
  defaultMessage:
    'Crashes grouped by type and stack trace, line numbers and memory addresses aside, ranked by affected users so a device stuck in a crash loop does not lead.',
});

const TRUNCATED_SUBTITLE = i18n.translate(
  'xpack.digitalExperience.mobile.crashes.table.truncatedSubtitle',
  {
    defaultMessage:
      'The {max} groups that affected the most users. Narrow the time range or filters to see the others.',
    values: { max: ERROR_GROUPS_ROWS },
  }
);

const CRASH_LABEL = i18n.translate('xpack.digitalExperience.mobile.crashes.table.crash', {
  defaultMessage: 'Crash',
});

const CRASH_TOOLTIP = i18n.translate('xpack.digitalExperience.mobile.crashes.table.crashTooltip', {
  defaultMessage:
    '"New in" marks a group only the newest release had in the {days, plural, one {# day} other {# days}} before the end of the time range, or in the whole range when it is longer. Groups of iOS crash reports are never marked: their frames are unsymbolicated addresses, which each build changes.',
  values: { days: CRASH_NEW_LOOKBACK_DAYS },
});

const USERS_TOOLTIP = i18n.translate('xpack.digitalExperience.mobile.crashes.table.usersTooltip', {
  defaultMessage: 'Installations of the app that crashed this way (app.installation.id).',
});

const FIRST_SEEN_LABEL = i18n.translate('xpack.digitalExperience.mobile.crashes.table.firstSeen', {
  defaultMessage: 'First seen',
});

const FIRST_SEEN_TOOLTIP = i18n.translate(
  'xpack.digitalExperience.mobile.crashes.table.firstSeenTooltip',
  {
    defaultMessage:
      'The first crash of the group on any release in the {days, plural, one {# day} other {# days}} before the end of the time range, or in the whole range when it is longer.',
    values: { days: CRASH_NEW_LOOKBACK_DAYS },
  }
);

const NEW_IN_RELEASE_TOOLTIP = i18n.translate(
  'xpack.digitalExperience.mobile.crashes.table.newInReleaseTooltip',
  {
    defaultMessage:
      'Only the newest release crashed this way in the {days, plural, one {# day} other {# days}} before the end of the time range, or in the whole range when it is longer: the release likely brought it.',
    values: { days: CRASH_NEW_LOOKBACK_DAYS },
  }
);

const PAGE_SIZE = 10;

/** Wide enough for a release and how long ago, e.g. "4.12.0 · 23 hours ago". */
const SEEN_COLUMN_WIDTH = '13em';

/** Counts and times: a first click puts the most, or the latest, on top. */
const DESCENDING_FIRST: ReadonlySet<string> = new Set([
  'users',
  'events',
  'sessions',
  'firstSeen',
  'lastSeen',
]);

const INITIAL_SORT: PropertySort = { field: 'users', direction: 'desc' };

/** When a group crashed, and on which release: the release, then how long ago. */
function Seen({ seen: { time, release } }: { seen: CrashGroupSeen }) {
  const { formatDate } = useFormatters();
  return (
    <span title={formatDate(time)}>
      {release ? `${release} · ` : ''}
      <FormattedRelative value={new Date(time)} />
    </span>
  );
}

/**
 * A mobile application's crash groups, the most affected users first, each opening its detail.
 * Groups only the newest release crashed on are marked new in it.
 */
export function MobileCrashGroupsTable({
  crashGroups,
  isLoading,
  onSelect,
}: {
  crashGroups: MobileCrashGroup[];
  isLoading: boolean;
  onSelect: (fingerprint: string) => void;
}) {
  const { formatNumber } = useFormatters();
  // Kept here, as the table remounts while a refresh loads, which would reset them.
  const [sort, setSort] = useState<PropertySort>(INITIAL_SORT);
  const [pageIndex, setPageIndex] = useState(0);
  const lastPageIndex = Math.max(0, Math.ceil(crashGroups.length / PAGE_SIZE) - 1);
  const onTableChange = ({ sort: nextSort, page }: Criteria<MobileCrashGroup>) => {
    if (nextSort) {
      const field = String(nextSort.field);
      const isNewField = field !== sort.field;
      setSort({
        field,
        direction: isNewField && DESCENDING_FIRST.has(field) ? 'desc' : nextSort.direction,
      });
    }
    if (page) {
      setPageIndex(page.index);
    }
  };

  const columns: Array<EuiBasicTableColumn<MobileCrashGroup>> = [
    {
      field: 'type',
      name: CRASH_LABEL,
      nameTooltip: { content: CRASH_TOOLTIP },
      render: (type: string | null, { fingerprint, message, newInRelease }: MobileCrashGroup) => (
        <div className="eui-textTruncate">
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            {/* Shrinks below its text, so a long type ends in an ellipsis before the badge. */}
            <EuiFlexItem grow={false} css={{ minWidth: 0 }}>
              <EuiLink
                className="eui-textTruncate"
                title={type ?? UNKNOWN_ERROR_TYPE_LABEL}
                onClick={() => onSelect(fingerprint)}
                data-test-subj="digitalExperienceMobileCrashGroup"
                {...getEbtProps({
                  action: EBT_CLICK_ACTIONS.VIEW_ERROR,
                  element: MOBILE_CRASHES_EBT_ELEMENTS.CRASH_GROUP,
                })}
              >
                {type ?? UNKNOWN_ERROR_TYPE_LABEL}
              </EuiLink>
            </EuiFlexItem>
            {newInRelease && (
              <EuiFlexItem grow={false}>
                <EuiBadge
                  color="warning"
                  title={NEW_IN_RELEASE_TOOLTIP}
                  data-test-subj="digitalExperienceMobileCrashGroupNew"
                >
                  {newInReleaseLabel(newInRelease)}
                </EuiBadge>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
          {message && (
            <EuiText size="xs" color="subdued" className="eui-textTruncate" title={message}>
              {message}
            </EuiText>
          )}
        </div>
      ),
    },
    {
      field: 'users',
      name: USERS_LABEL,
      nameTooltip: { content: USERS_TOOLTIP },
      sortable: true,
      ...metricColumnPreset<MobileCrashGroup>(),
      render: (users: number) => formatNumber(users),
    },
    {
      field: 'events',
      name: EVENTS_LABEL,
      sortable: true,
      ...metricColumnPreset<MobileCrashGroup>(),
      render: (events: number) => formatNumber(events),
    },
    {
      field: 'sessions',
      name: SESSIONS_LABEL,
      sortable: true,
      ...metricColumnPreset<MobileCrashGroup>(),
      render: (sessions: number) => formatNumber(sessions),
    },
    {
      field: 'firstSeen',
      name: FIRST_SEEN_LABEL,
      nameTooltip: { content: FIRST_SEEN_TOOLTIP },
      width: SEEN_COLUMN_WIDTH,
      className: 'eui-textNoWrap',
      sortable: ({ firstSeen }: MobileCrashGroup) => firstSeen.time,
      render: (firstSeen: CrashGroupSeen) => <Seen seen={firstSeen} />,
    },
    {
      field: 'lastSeen',
      name: LAST_SEEN_LABEL,
      width: SEEN_COLUMN_WIDTH,
      className: 'eui-textNoWrap',
      sortable: ({ lastSeen }: MobileCrashGroup) => lastSeen.time,
      render: (lastSeen: CrashGroupSeen) => <Seen seen={lastSeen} />,
    },
  ];

  return (
    <DataPanel
      title={TITLE}
      subtitle={crashGroups.length >= ERROR_GROUPS_ROWS ? TRUNCATED_SUBTITLE : SUBTITLE}
      isLoading={isLoading}
      isEmpty={crashGroups.length === 0}
      data-test-subj="digitalExperienceMobileCrashGroups"
    >
      <EuiInMemoryTable<MobileCrashGroup>
        tableCaption={TITLE}
        items={crashGroups}
        itemId="fingerprint"
        columns={columns}
        sorting={{ sort }}
        // A second click reverses the order rather than dropping it.
        allowNeutralSort={false}
        pagination={{
          pageIndex: Math.min(pageIndex, lastPageIndex),
          pageSize: PAGE_SIZE,
          showPerPageOptions: false,
        }}
        onTableChange={onTableChange}
      />
    </DataPanel>
  );
}
