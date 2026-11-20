/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { ReactNode } from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiHighlight, EuiInMemoryTable, EuiLink } from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EmptyCellValue } from '@kbn/shared-ux-column-presets';
import { EBT_CLICK_ACTIONS, getEbtProps } from '@kbn/ebt-click';
import { APPLICATION_SOURCE, APPLICATION_TYPE } from '../../../../common/application_source';
import type {
  ComparedValue,
  MobileApplicationSummary,
} from '../../../../common/types/applications';
import { PlatformBadges } from '../../../components/platform_badges';
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
  SESSIONS_LABEL,
  percentagePointsLabel,
} from '../../../labels';
import {
  applicationColumnPreset,
  metricColumnPreset,
  timeColumnPreset,
} from '../../../utils/column_presets';
import { renderLastSeen } from './render_last_seen';

const columnNames = {
  application: i18n.translate('xpack.digitalExperience.applications.mobile.applicationColumn', {
    defaultMessage: 'Mobile application',
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

const getRowId = ({ serviceName }: MobileApplicationSummary) => serviceName;

const nameCss = css({ minWidth: 0 });

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
  const { formatNumber } = formatters;

  const columns = useMemo<Array<EuiBasicTableColumn<MobileApplicationSummary>>>(
    () => [
      {
        field: 'serviceName',
        name: columnNames.application,
        ...applicationColumnPreset<MobileApplicationSummary>(),
        sortable: true,
        render: (serviceName: string, { platforms }: MobileApplicationSummary) => (
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false} css={nameCss}>
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
                    // EDOT data of a mobile application, which opens the mobile page.
                    query: {
                      ...listQuery,
                      source: APPLICATION_SOURCE.otel,
                      applicationType: APPLICATION_TYPE.mobile,
                    },
                  }),
                })}
              >
                <EuiHighlight search={searchTerm}>{serviceName}</EuiHighlight>
              </EuiLink>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <PlatformBadges
                data-test-subj="digitalExperienceMobilePlatforms"
                platforms={platforms}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      },
      {
        field: 'latestRelease',
        name: columnNames.latestRelease,
        ...metricColumnPreset<MobileApplicationSummary>(),
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
        sortable: true,
        ...timeColumnPreset<MobileApplicationSummary>(),
        render: renderLastSeen(formatters),
      },
    ],
    [application, router, listQuery, searchTerm, formatters, formatNumber]
  );

  return (
    <EuiInMemoryTable<MobileApplicationSummary>
      data-test-subj="digitalExperienceMobileApplicationsTable"
      tableCaption={columnNames.application}
      items={items}
      itemId={getRowId}
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
