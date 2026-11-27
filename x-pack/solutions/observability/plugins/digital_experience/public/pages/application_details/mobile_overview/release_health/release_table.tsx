/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { orderBy, sumBy } from 'lodash';
import type { Criteria, EuiBasicTableColumn } from '@elastic/eui';
import { EuiBadge, EuiBasicTable, EuiHealth, EuiLink, EuiPanel, EuiToolTip } from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { EmptyCellValue } from '@kbn/shared-ux-column-presets';
import { MAX_RELEASE_LENGTH } from '../../../../../common/filter_lengths';
import { MIN_RELEASE_SESSIONS } from '../../../../../common/mobile/releases';
import type { MobileReleaseRow } from '../../../../../common/types/mobile';
import {
  DIGITAL_EXPERIENCE_EBT_ACTIONS,
  MOBILE_APPLICATION_EBT_ELEMENTS,
} from '../../../../ebt_constants';
import type { Formatters } from '../../../../hooks/use_formatters';
import { useFormatters } from '../../../../hooks/use_formatters';
import {
  MOBILE_ERROR_RATE_DESCRIPTION,
  MOBILE_USERS_DESCRIPTION,
  NOT_ENOUGH_DATA_LABEL,
  OTHER_RELEASE_LABEL,
  valueWithShareLabel,
} from '../../../../labels';
import { metricColumnPreset } from '../../../../utils/column_presets';
import { formatDurationMs } from '../../../../utils/format_duration';
import {
  APP_START_DESCRIPTIONS,
  APP_START_TITLES,
  NO_STARTS_OF_TYPE,
  appStartCountLabel,
} from '../app_start_labels';

const TABLE_CAPTION = i18n.translate('xpack.digitalExperience.mobile.releases.table.caption', {
  defaultMessage: 'Release health by app version',
});

const NOT_ENOUGH_DATA_TOOLTIP = i18n.translate(
  'xpack.digitalExperience.mobile.releases.table.notEnoughDataTooltip',
  {
    defaultMessage:
      'A release needs at least {minSessions} sessions in the time range to show an error rate.',
    values: { minSessions: MIN_RELEASE_SESSIONS },
  }
);

const COLD_START_NOT_ENOUGH_DATA_TOOLTIP = i18n.translate(
  'xpack.digitalExperience.mobile.releases.table.coldStartNotEnoughDataTooltip',
  {
    defaultMessage:
      'A release needs at least {minSessions} sessions in the time range to show its cold start.',
    values: { minSessions: MIN_RELEASE_SESSIONS },
  }
);

const RELEASE_COLUMN = i18n.translate('xpack.digitalExperience.mobile.releases.table.release', {
  defaultMessage: 'Release',
});

const SESSIONS_COLUMN = i18n.translate('xpack.digitalExperience.mobile.releases.table.sessions', {
  defaultMessage: 'Sessions',
});

const SESSIONS_DESCRIPTION = i18n.translate(
  'xpack.digitalExperience.mobile.releases.table.sessionsDescription',
  {
    defaultMessage:
      "Distinct session.id values in this release in the time range, and their share of all releases' sessions.",
  }
);

const USERS_COLUMN = i18n.translate('xpack.digitalExperience.mobile.releases.table.users', {
  defaultMessage: 'Users',
});

const ERROR_RATE_COLUMN = i18n.translate(
  'xpack.digitalExperience.mobile.releases.table.errorRate',
  { defaultMessage: 'Error rate' }
);

const filterLabel = (release: string, isSelected: boolean): string =>
  isSelected
    ? i18n.translate('xpack.digitalExperience.mobile.releases.table.removeFilter', {
        defaultMessage: 'Stop filtering by release {release}',
        values: { release },
      })
    : i18n.translate('xpack.digitalExperience.mobile.releases.table.filter', {
        defaultMessage: 'Filter by release {release}',
        values: { release },
      });

export type ReleaseSort = NonNullable<Criteria<MobileReleaseRow>['sort']>;

export const DEFAULT_RELEASE_SORT: ReleaseSort = { field: 'sessions', direction: 'desc' };

/** The rows by `sort`, "Other" last, then those without an error rate, then by release. */
export const sortReleases = (
  releases: readonly MobileReleaseRow[],
  { field, direction }: ReleaseSort
): MobileReleaseRow[] =>
  orderBy(
    releases,
    ['isOther', ({ [field]: value }) => value === null, field, 'release'],
    ['asc', 'asc', direction, 'desc']
  );

// Without a total, e.g. filtered to one release, the share would always read 100%
const formatSessions = (
  sessions: number,
  totalSessions: number | undefined,
  { formatNumber, formatKpiPercent }: Formatters
): string =>
  totalSessions !== undefined && totalSessions > 0
    ? valueWithShareLabel(formatNumber(sessions), formatKpiPercent(sessions / totalSessions))
    : formatNumber(sessions);

const releaseColumns = ({
  colors,
  formatters,
  totalSessions,
  selectedRelease,
  onSelectRelease,
}: {
  colors: ReadonlyMap<string, string>;
  formatters: Formatters;
  totalSessions: number | undefined;
  selectedRelease: string | undefined;
  onSelectRelease: (release: string | undefined) => void;
}): Array<EuiBasicTableColumn<MobileReleaseRow>> => [
  {
    field: 'release',
    name: RELEASE_COLUMN,
    'data-test-subj': 'digitalExperienceMobileReleaseName',
    render: (release: string, { isOther }) => {
      if (isOther) {
        return <EuiHealth color={colors.get(release)}>{OTHER_RELEASE_LABEL}</EuiHealth>;
      }
      // Longer than the URL and the routes accept, as the release picker leaves it out
      if (release.length > MAX_RELEASE_LENGTH) {
        return <EuiHealth color={colors.get(release)}>{release}</EuiHealth>;
      }
      // A removable pill, so it's clear a click takes the filter off
      if (release === selectedRelease) {
        return (
          <EuiHealth color={colors.get(release)}>
            <EuiBadge
              color="hollow"
              iconType="cross"
              iconSide="right"
              onClick={() => onSelectRelease(undefined)}
              onClickAriaLabel={filterLabel(release, true)}
              data-test-subj="digitalExperienceMobileReleaseFilterLink"
              {...getEbtProps({
                action: DIGITAL_EXPERIENCE_EBT_ACTIONS.SET_FILTER,
                element: MOBILE_APPLICATION_EBT_ELEMENTS.RELEASE_FILTER,
              })}
            >
              {release}
            </EuiBadge>
          </EuiHealth>
        );
      }
      return (
        <EuiHealth color={colors.get(release)}>
          <EuiLink
            color="text"
            aria-label={filterLabel(release, false)}
            onClick={() => onSelectRelease(release)}
            data-test-subj="digitalExperienceMobileReleaseFilterLink"
            {...getEbtProps({
              action: DIGITAL_EXPERIENCE_EBT_ACTIONS.SET_FILTER,
              element: MOBILE_APPLICATION_EBT_ELEMENTS.RELEASE_FILTER,
            })}
          >
            {release}
          </EuiLink>
        </EuiHealth>
      );
    },
  },
  {
    field: 'sessions',
    name: SESSIONS_COLUMN,
    nameTooltip: { content: SESSIONS_DESCRIPTION },
    ...metricColumnPreset<MobileReleaseRow>(),
    sortable: true,
    render: (sessions: number) => formatSessions(sessions, totalSessions, formatters),
  },
  {
    field: 'users',
    name: USERS_COLUMN,
    nameTooltip: { content: MOBILE_USERS_DESCRIPTION },
    ...metricColumnPreset<MobileReleaseRow>(),
    sortable: true,
    render: (users: number) => formatters.formatNumber(users),
  },
  {
    field: 'errorRate',
    name: ERROR_RATE_COLUMN,
    nameTooltip: { content: MOBILE_ERROR_RATE_DESCRIPTION },
    ...metricColumnPreset<MobileReleaseRow>(),
    sortable: true,
    'data-test-subj': 'digitalExperienceMobileReleaseErrorRate',
    render: (errorRate: number | null) =>
      errorRate === null ? (
        <EuiToolTip content={NOT_ENOUGH_DATA_TOOLTIP}>
          <span tabIndex={0}>{NOT_ENOUGH_DATA_LABEL}</span>
        </EuiToolTip>
      ) : (
        formatters.formatErrorRate(errorRate)
      ),
  },
  {
    field: 'coldStart',
    name: APP_START_TITLES.cold,
    nameTooltip: { content: APP_START_DESCRIPTIONS.cold },
    ...metricColumnPreset<MobileReleaseRow>(),
    sortable: true,
    'data-test-subj': 'digitalExperienceMobileReleaseColdStart',
    render: (coldStart: number | null, { sessions, coldStarts }: MobileReleaseRow) => {
      if (sessions < MIN_RELEASE_SESSIONS) {
        return (
          <EuiToolTip content={COLD_START_NOT_ENOUGH_DATA_TOOLTIP}>
            <span tabIndex={0}>{NOT_ENOUGH_DATA_LABEL}</span>
          </EuiToolTip>
        );
      }
      if (coldStart === null || coldStarts === 0) {
        return (
          <EuiToolTip content={NO_STARTS_OF_TYPE.cold}>
            <span tabIndex={0}>
              <EmptyCellValue />
            </span>
          </EuiToolTip>
        );
      }
      return (
        <EuiToolTip content={appStartCountLabel('cold', coldStarts)}>
          <span tabIndex={0}>{formatDurationMs(coldStart)}</span>
        </EuiToolTip>
      );
    },
  },
];

/** The releases with their sessions, users, error rate and cold start; a release filters the page by it. */
export function ReleaseTable({
  releases,
  colors,
  selectedRelease,
  onSelectRelease,
  sort,
  onSort,
}: {
  releases: MobileReleaseRow[];
  colors: ReadonlyMap<string, string>;
  selectedRelease: string | undefined;
  onSelectRelease: (release: string | undefined) => void;
  sort: ReleaseSort;
  onSort: (sort: ReleaseSort) => void;
}) {
  const formatters = useFormatters();
  const totalSessions = selectedRelease === undefined ? sumBy(releases, 'sessions') : undefined;
  const items = useMemo(() => sortReleases(releases, sort), [releases, sort]);

  const onChange = ({ sort: nextSort }: Criteria<MobileReleaseRow>) => {
    if (nextSort) {
      onSort(nextSort);
    }
  };

  return (
    <EuiPanel hasBorder paddingSize="m">
      <EuiBasicTable<MobileReleaseRow>
        data-test-subj="digitalExperienceMobileReleaseTable"
        tableCaption={TABLE_CAPTION}
        tableLayout="auto"
        items={items}
        itemId="release"
        rowHeader="release"
        columns={releaseColumns({
          colors,
          formatters,
          totalSessions,
          selectedRelease,
          onSelectRelease,
        })}
        sorting={{ sort }}
        onChange={onChange}
        rowProps={({ release }) => ({
          'data-test-subj': `digitalExperienceMobileReleaseRow-${release}`,
        })}
      />
    </EuiPanel>
  );
}
