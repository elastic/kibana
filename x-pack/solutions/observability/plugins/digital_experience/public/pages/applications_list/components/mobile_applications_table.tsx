/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { ReactNode } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHighlight,
  EuiIcon,
  EuiInMemoryTable,
  EuiLink,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedRelative } from '@kbn/i18n-react';
import { EmptyCellValue } from '@kbn/shared-ux-column-presets';
import { EBT_CLICK_ACTIONS, getEbtProps } from '@kbn/ebt-click';
import { APPLICATION_SOURCE } from '../../../../common/application_source';
import type {
  ComparedValue,
  MobileApplicationSummary,
  MobilePlatform,
} from '../../../../common/types/applications';
import { DIGITAL_EXPERIENCE_FEATURE_ID } from '../../../../common/feature';
import { APPLICATIONS_LIST_EBT_ELEMENTS } from '../../../ebt_constants';
import { useDigitalExperienceRouter } from '../../../hooks/use_digital_experience_router';
import { useKibanaServices } from '../../../hooks/use_kibana_services';
import { useListQuery } from '../../../hooks/use_list_query';
import { useFormatters } from '../../../hooks/use_formatters';
import type { Formatters } from '../../../hooks/use_formatters';
import {
  LAST_SEEN_LABEL,
  NOT_ENOUGH_DATA_LABEL,
  PLATFORM_LABELS,
  SESSIONS_LABEL,
  percentagePointsLabel,
} from '../../../labels';
import { applicationColumnPreset, metricColumnPreset } from '../../../utils/column_presets';

const PLATFORM_ICONS: Record<MobilePlatform, string> = {
  android: 'logoAndroid',
  ios: 'logoApple',
};

const columnNames = {
  application: i18n.translate('xpack.digitalExperience.applications.mobile.applicationColumn', {
    defaultMessage: 'Mobile application',
  }),
  platforms: i18n.translate('xpack.digitalExperience.applications.mobile.platformsColumn', {
    defaultMessage: 'Platforms',
  }),
  latestRelease: i18n.translate('xpack.digitalExperience.applications.mobile.latestReleaseColumn', {
    defaultMessage: 'Latest release',
  }),
  users: i18n.translate('xpack.digitalExperience.applications.mobile.usersColumn', {
    defaultMessage: 'Users',
  }),
  crashFree: i18n.translate('xpack.digitalExperience.applications.mobile.crashFreeColumn', {
    defaultMessage: 'Crash-free sessions',
  }),
  errorRate: i18n.translate('xpack.digitalExperience.applications.mobile.errorRateColumn', {
    defaultMessage: 'Error rate',
  }),
};

const SORT_BY_SESSIONS = { sort: { field: 'sessions.count', direction: 'desc' } } as const;

const renderCrashFree =
  ({ formatPercent, formatNumber }: Formatters) =>
  ({ value, delta }: ComparedValue) => {
    if (value === null) {
      return <span data-test-subj="digitalExperienceMobileCrashFree">{NOT_ENOUGH_DATA_LABEL}</span>;
    }
    const points = delta === null ? null : `${delta >= 0 ? '+' : ''}${formatNumber(delta * 100)}`;
    return (
      <span data-test-subj="digitalExperienceMobileCrashFree">
        {formatPercent(value)}
        {points !== null && ` (${percentagePointsLabel(points)})`}
      </span>
    );
  };

/** The mobile applications, with the columns that suit them; sorted by sessions. */
export function MobileApplicationsTable({
  items,
  searchTerm,
  isLoading,
  noItemsMessage,
}: {
  items: MobileApplicationSummary[];
  searchTerm: string;
  isLoading: boolean;
  /** Shown instead of rows: loading, an error, no match or no mobile data. */
  noItemsMessage: ReactNode;
}) {
  const { application } = useKibanaServices();
  const router = useDigitalExperienceRouter();
  const listQuery = useListQuery();
  const formatters = useFormatters();
  const { formatNumber, formatDate } = formatters;

  const columns = useMemo<Array<EuiBasicTableColumn<MobileApplicationSummary>>>(
    () => [
      {
        field: 'serviceName',
        name: columnNames.application,
        ...applicationColumnPreset<MobileApplicationSummary>(),
        sortable: true,
        render: (serviceName: string) => (
          <EuiLink
            data-test-subj="digitalExperienceMobileApplicationLink"
            {...getEbtProps({
              action: EBT_CLICK_ACTIONS.VIEW_SERVICE,
              element: APPLICATIONS_LIST_EBT_ELEMENTS.APPLICATION_LINK,
            })}
            className="eui-textTruncate"
            href={application.getUrlForApp(DIGITAL_EXPERIENCE_FEATURE_ID, {
              path: router.link('/{serviceName}', {
                path: { serviceName },
                query: { ...listQuery, source: APPLICATION_SOURCE.mobile },
              }),
            })}
          >
            <EuiHighlight search={searchTerm}>{serviceName}</EuiHighlight>
          </EuiLink>
        ),
      },
      {
        field: 'platforms',
        name: columnNames.platforms,
        render: (platforms: MobilePlatform[]) => (
          <EuiFlexGroup
            data-test-subj="digitalExperienceMobilePlatforms"
            gutterSize="s"
            responsive={false}
          >
            {platforms.map((platform) => (
              <EuiFlexItem grow={false} key={platform}>
                <EuiIcon
                  type={PLATFORM_ICONS[platform]}
                  title={PLATFORM_LABELS[platform]}
                  aria-label={PLATFORM_LABELS[platform]}
                />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        ),
      },
      {
        field: 'latestRelease',
        name: columnNames.latestRelease,
        render: (release: string | null) =>
          release === null ? (
            <EmptyCellValue />
          ) : (
            <span data-test-subj="digitalExperienceMobileLatestRelease">{release}</span>
          ),
      },
      {
        field: 'sessions.count',
        name: SESSIONS_LABEL,
        dataType: 'number',
        sortable: true,
        ...metricColumnPreset<MobileApplicationSummary>(),
        render: (count: number) => (
          <span data-test-subj="digitalExperienceMobileSessions">{formatNumber(count)}</span>
        ),
      },
      {
        field: 'users.count',
        name: columnNames.users,
        dataType: 'number',
        sortable: true,
        ...metricColumnPreset<MobileApplicationSummary>(),
        render: (count: number) => formatNumber(count),
      },
      {
        field: 'crashFreeSessions',
        name: columnNames.crashFree,
        ...metricColumnPreset<MobileApplicationSummary>(),
        render: renderCrashFree(formatters),
      },
      {
        field: 'errorRate',
        name: columnNames.errorRate,
        sortable: true,
        ...metricColumnPreset<MobileApplicationSummary>(),
        render: (rate: number | null) => (rate === null ? <EmptyCellValue /> : formatNumber(rate)),
      },
      {
        field: 'lastSeen',
        name: LAST_SEEN_LABEL,
        render: (lastSeen: string | null) =>
          lastSeen === null ? (
            <EmptyCellValue />
          ) : (
            <span title={formatDate(lastSeen)}>
              <FormattedRelative value={new Date(lastSeen)} />
            </span>
          ),
      },
    ],
    [application, router, listQuery, searchTerm, formatters, formatNumber, formatDate]
  );

  return (
    <EuiInMemoryTable<MobileApplicationSummary>
      data-test-subj="digitalExperienceMobileApplicationsTable"
      tableCaption={columnNames.application}
      items={items}
      itemId="serviceName"
      columns={columns}
      tableLayout="auto"
      scrollableInline
      pagination={true}
      sorting={SORT_BY_SESSIONS}
      loading={isLoading}
      noItemsMessage={noItemsMessage}
    />
  );
}
