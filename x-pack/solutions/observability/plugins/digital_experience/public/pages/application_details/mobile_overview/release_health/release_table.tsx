/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { orderBy, sumBy } from 'lodash';
import type { Criteria, EuiBasicTableColumn } from '@elastic/eui';
import { EuiBadge, EuiBasicTable, EuiHealth, EuiLink, EuiPanel, EuiToolTip } from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { MIN_RELEASE_SESSIONS, OTHER_RELEASE_LABEL } from '../../../../../common/mobile/releases';
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
} from '../../../../labels';
import { metricColumnPreset } from '../../../../utils/column_presets';
import { formatErrorRate } from '../../../../utils/format_error_rate';

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

type Sort = NonNullable<Criteria<MobileReleaseRow>['sort']>;

/** Most sessions first, as the route returns them. */
const DEFAULT_SORT: Sort = { field: 'sessions', direction: 'desc' };

/**
 * The rows by `sort`, "Other" always last; a release without an error rate comes after those with
 * one, as it can't be compared.
 */
export const sortReleases = (
  releases: readonly MobileReleaseRow[],
  { field, direction }: Sort
): MobileReleaseRow[] =>
  orderBy(
    releases,
    ['isOther', ({ [field]: value }) => value === null, field],
    ['asc', 'asc', direction]
  );

/**
 * The sessions with their share of every release's sessions, e.g. `1,200 (60%)`; without a total,
 * e.g. when filtered to one release, whose share would always read 100%.
 */
const formatSessions = (
  sessions: number,
  totalSessions: number | undefined,
  { formatNumber, formatShare }: Formatters
): string =>
  totalSessions !== undefined && totalSessions > 0
    ? `${formatNumber(sessions)} (${formatShare(sessions / totalSessions)})`
    : formatNumber(sessions);

/**
 * The table's columns, in order. The crash rate (#64) and the cold start (#68) join them here.
 */
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
      // The selected release as a removable filter pill, so it's clear a click takes it off.
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
        formatErrorRate(errorRate)
      ),
  },
];

/**
 * The releases of the time range with their sessions, users and error rate, sortable, "Other"
 * always last. A release filters the page by it, or takes the filter off when it's selected.
 */
export function ReleaseTable({
  releases,
  colors,
  selectedRelease,
  onSelectRelease,
}: {
  releases: MobileReleaseRow[];
  colors: ReadonlyMap<string, string>;
  /** The release the page is filtered by, if any. */
  selectedRelease: string | undefined;
  onSelectRelease: (release: string | undefined) => void;
}) {
  const formatters = useFormatters();
  const [sort, setSort] = useState<Sort>(DEFAULT_SORT);
  const totalSessions = selectedRelease === undefined ? sumBy(releases, 'sessions') : undefined;
  const items = useMemo(() => sortReleases(releases, sort), [releases, sort]);

  const onChange = ({ sort: nextSort }: Criteria<MobileReleaseRow>) => {
    if (nextSort) {
      setSort(nextSort);
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
