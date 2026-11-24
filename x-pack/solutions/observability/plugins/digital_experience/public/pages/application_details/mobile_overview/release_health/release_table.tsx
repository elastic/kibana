/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiBasicTable, EuiHealth, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { MIN_RELEASE_SESSIONS, OTHER_RELEASE_LABEL } from '../../../../../common/mobile/releases';
import type { MobileReleaseRow } from '../../../../../common/types/mobile';
import { useFormatters } from '../../../../hooks/use_formatters';
import {
  MOBILE_ERROR_RATE_DESCRIPTION,
  MOBILE_USERS_DESCRIPTION,
  NOT_ENOUGH_DATA_LABEL,
} from '../../../../labels';

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

const USERS_COLUMN = i18n.translate('xpack.digitalExperience.mobile.releases.table.users', {
  defaultMessage: 'Users',
});

const ERROR_RATE_COLUMN = i18n.translate(
  'xpack.digitalExperience.mobile.releases.table.errorRate',
  { defaultMessage: 'Error rate' }
);

/**
 * The table's columns, in order. The crash rate (#64) and the cold start (#68) join them here.
 */
const releaseColumns = ({
  colors,
  formatNumber,
}: {
  colors: ReadonlyMap<string, string>;
  formatNumber: (value: number) => string;
}): Array<EuiBasicTableColumn<MobileReleaseRow>> => [
  {
    field: 'release',
    name: RELEASE_COLUMN,
    'data-test-subj': 'digitalExperienceMobileReleaseName',
    render: (release: string, { isOther }) => (
      <EuiHealth color={colors.get(release)}>{isOther ? OTHER_RELEASE_LABEL : release}</EuiHealth>
    ),
  },
  {
    field: 'sessions',
    name: SESSIONS_COLUMN,
    align: 'right',
    dataType: 'number',
    render: (sessions: number) => formatNumber(sessions),
  },
  {
    field: 'users',
    name: USERS_COLUMN,
    nameTooltip: { content: MOBILE_USERS_DESCRIPTION },
    align: 'right',
    dataType: 'number',
    render: (users: number) => formatNumber(users),
  },
  {
    field: 'errorRate',
    name: ERROR_RATE_COLUMN,
    nameTooltip: { content: MOBILE_ERROR_RATE_DESCRIPTION },
    align: 'right',
    dataType: 'number',
    'data-test-subj': 'digitalExperienceMobileReleaseErrorRate',
    render: (errorRate: number | null) =>
      errorRate === null ? (
        <EuiToolTip content={NOT_ENOUGH_DATA_TOOLTIP}>
          <span tabIndex={0}>{NOT_ENOUGH_DATA_LABEL}</span>
        </EuiToolTip>
      ) : (
        formatNumber(errorRate)
      ),
  },
];

/** The releases of the time range with their sessions, users and error rate; "Other" comes last. */
export function ReleaseTable({
  releases,
  colors,
}: {
  releases: MobileReleaseRow[];
  colors: ReadonlyMap<string, string>;
}) {
  const { formatNumber } = useFormatters();
  return (
    <EuiBasicTable<MobileReleaseRow>
      data-test-subj="digitalExperienceMobileReleaseTable"
      tableCaption={TABLE_CAPTION}
      items={releases}
      itemId="release"
      columns={releaseColumns({ colors, formatNumber })}
      rowProps={({ release }) => ({
        'data-test-subj': `digitalExperienceMobileReleaseRow-${release}`,
      })}
    />
  );
}
