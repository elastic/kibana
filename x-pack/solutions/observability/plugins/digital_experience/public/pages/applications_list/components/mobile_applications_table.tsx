/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
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
import { LAST_SEEN_LABEL, SESSIONS_LABEL } from '../../../labels';
import { applicationColumnPreset, metricColumnPreset } from '../../../utils/column_presets';

const PLATFORM_ICONS: Record<MobilePlatform, { type: string; label: string }> = {
  android: {
    type: 'logoAndroid',
    label: i18n.translate('xpack.digitalExperience.applications.mobile.platform.android', {
      defaultMessage: 'Android',
    }),
  },
  ios: {
    type: 'logoApple',
    label: i18n.translate('xpack.digitalExperience.applications.mobile.platform.ios', {
      defaultMessage: 'iOS',
    }),
  },
};

const NOT_ENOUGH_DATA = i18n.translate(
  'xpack.digitalExperience.applications.mobile.notEnoughData',
  { defaultMessage: 'Not enough data' }
);

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

const formatPercentValue = (value: number): string => `${(value * 100).toFixed(1)}%`;

const renderCrashFree = ({ value, delta }: ComparedValue) => {
  if (value === null) {
    return <span data-test-subj="digitalExperienceMobileCrashFree">{NOT_ENOUGH_DATA}</span>;
  }
  return (
    <span data-test-subj="digitalExperienceMobileCrashFree">
      {formatPercentValue(value)}
      {delta !== null && ` (${delta >= 0 ? '+' : ''}${(delta * 100).toFixed(1)} pp)`}
    </span>
  );
};

/** The mobile applications, with the columns that suit them; sorted by sessions. */
export function MobileApplicationsTable({
  items,
  searchTerm,
  isLoading,
}: {
  items: MobileApplicationSummary[];
  searchTerm: string;
  isLoading: boolean;
}) {
  const { application } = useKibanaServices();
  const router = useDigitalExperienceRouter();
  const listQuery = useListQuery();
  const { formatNumber, formatDate } = useFormatters();

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
                  type={PLATFORM_ICONS[platform].type}
                  title={PLATFORM_ICONS[platform].label}
                  aria-label={PLATFORM_ICONS[platform].label}
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
        render: renderCrashFree,
      },
      {
        field: 'errorRate',
        name: columnNames.errorRate,
        sortable: true,
        ...metricColumnPreset<MobileApplicationSummary>(),
        render: (rate: number | null) => (rate === null ? <EmptyCellValue /> : rate.toFixed(2)),
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
    [application, router, listQuery, searchTerm, formatNumber, formatDate]
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
    />
  );
}
