/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { ReactNode } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiHighlight,
  EuiInMemoryTable,
  EuiLink,
  EuiTextColor,
  EuiToolTip,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EmptyCellValue } from '@kbn/shared-ux-column-presets';
import { EBT_CLICK_ACTIONS, getEbtProps } from '@kbn/ebt-click';
import type { VitalRatings } from '../../../../common/types/applications';
import type { CoreWebVital, VitalRating } from '../../../../common/core_web_vitals';
import { CORE_WEB_VITAL, getVitalRating } from '../../../../common/core_web_vitals';
import { DIGITAL_EXPERIENCE_FEATURE_ID } from '../../../../common/feature';
import { formatVital, RATING_COLORS, RATING_LABELS } from '../../../utils/web_vitals';
import {
  APPLICATIONS_LIST_EBT_ELEMENTS,
  DIGITAL_EXPERIENCE_EBT_ACTIONS,
} from '../../../ebt_constants';
import { useDigitalExperienceRouter } from '../../../hooks/use_digital_experience_router';
import { useKibanaServices } from '../../../hooks/use_kibana_services';
import { useListQuery } from '../../../hooks/use_list_query';
import type { Formatters } from '../../../hooks/use_formatters';
import { useFormatters } from '../../../hooks/use_formatters';
import { useVisibleColumns } from '../../../hooks/use_visible_columns';
import { APPLICATIONS_LABEL, LAST_SEEN_LABEL, SOURCE_LABELS } from '../../../labels';
import type { ApplicationRow } from '../utils/filter_applications';
import { renderLastSeen } from '../components/render_last_seen';
import {
  applicationColumnPreset,
  metricColumnPreset,
  timeColumnPreset,
} from '../../../utils/column_presets';

// Long names shrink and truncate; the badges keep their size.
const nameCss = css({ minWidth: 0 });

/** In display order. */
const VITAL_RATINGS: VitalRating[] = ['good', 'needsImprovement', 'poor'];

const vitalTooltip = (
  sampleCount: number,
  ratings: VitalRatings | null,
  { formatPercent }: Formatters
) => (
  <>
    <p>
      {i18n.translate('xpack.digitalExperience.applications.vitalSamples', {
        defaultMessage:
          '75th percentile of {sampleCount, plural, one {# sample} other {# samples}}',
        values: { sampleCount },
      })}
    </p>
    {ratings && (
      <EuiFlexGroup
        data-test-subj="digitalExperienceVitalRatings"
        direction="column"
        gutterSize="xs"
        responsive={false}
      >
        {VITAL_RATINGS.map((rating) => (
          <EuiFlexGroup
            key={rating}
            justifyContent="spaceBetween"
            gutterSize="l"
            responsive={false}
          >
            <EuiHealth color={RATING_COLORS[rating]}>{RATING_LABELS[rating]}</EuiHealth>
            <span>{formatPercent(ratings[rating])}</span>
          </EuiFlexGroup>
        ))}
      </EuiFlexGroup>
    )}
  </>
);

const renderVital =
  (vital: CoreWebVital, formatters: Formatters) =>
  (value: number | null, { webVitals }: ApplicationRow) => {
    if (value === null) {
      return <EmptyCellValue />;
    }
    const { sampleCount, ratings } = webVitals[vital];
    const rating = getVitalRating(vital, value);
    return (
      <EuiToolTip content={vitalTooltip(sampleCount, ratings, formatters)}>
        <EuiTextColor
          tabIndex={0}
          data-test-subj={`digitalExperienceVital-${vital}`}
          data-rating={rating}
          data-sample-count={sampleCount}
          color={RATING_COLORS[rating]}
        >
          {formatVital(vital, value)}
        </EuiTextColor>
      </EuiToolTip>
    );
  };

const renderFailedHttp =
  ({ formatPercent }: Formatters) =>
  (ratio: number | null, { httpRequests }: ApplicationRow) => {
    if (ratio === null) {
      return <EmptyCellValue />;
    }
    const { failedCount, count } = httpRequests;
    return (
      <EuiToolTip
        content={i18n.translate('xpack.digitalExperience.applications.failedHttpRequests', {
          defaultMessage: '{failedCount} of {count, plural, one {# request} other {# requests}}',
          values: { failedCount, count },
        })}
      >
        <span tabIndex={0} data-test-subj="digitalExperienceFailedHttp">
          {formatPercent(ratio)}
        </span>
      </EuiToolTip>
    );
  };

const renderCount =
  ({ formatNumber }: Formatters) =>
  (count: number) =>
    formatNumber(count);

const renderErrorRate = (perPageLoad: number | null) =>
  perPageLoad === null ? <EmptyCellValue /> : perPageLoad.toFixed(2);

const CLASSIC_DATA_BADGE = i18n.translate('xpack.digitalExperience.applications.classicDataBadge', {
  defaultMessage: '+ Classic RUM',
});

const CLASSIC_DATA_HINT = i18n.translate('xpack.digitalExperience.applications.classicDataHint', {
  defaultMessage: 'Classic RUM data also exists for this application. Select to show it.',
});

const getRowId = ({ serviceName, source }: ApplicationRow) => `${source}:${serviceName}`;

const APPLICATION_COLUMN = i18n.translate(
  'xpack.digitalExperience.applications.applicationColumn',
  { defaultMessage: 'Application' }
);

const PAGE_LOADS_COLUMN = i18n.translate('xpack.digitalExperience.applications.pageLoadsColumn', {
  defaultMessage: 'Page loads',
});

const LCP_COLUMN = i18n.translate('xpack.digitalExperience.applications.lcpColumn', {
  defaultMessage: 'LCP (p75)',
});

const INP_COLUMN = i18n.translate('xpack.digitalExperience.applications.inpColumn', {
  defaultMessage: 'INP (p75)',
});

const CLS_COLUMN = i18n.translate('xpack.digitalExperience.applications.clsColumn', {
  defaultMessage: 'CLS (p75)',
});

const FCP_COLUMN = i18n.translate('xpack.digitalExperience.applications.fcpColumn', {
  defaultMessage: 'FCP (p75)',
});

const TTFB_COLUMN = i18n.translate('xpack.digitalExperience.applications.ttfbColumn', {
  defaultMessage: 'TTFB (p75)',
});

const ERROR_RATE_COLUMN = i18n.translate('xpack.digitalExperience.applications.errorRateColumn', {
  defaultMessage: 'Error rate',
});

const ERROR_RATE_DESCRIPTION = i18n.translate(
  'xpack.digitalExperience.applications.errorRateDescription',
  { defaultMessage: 'JS errors per page load' }
);

const JS_ERRORS_COLUMN = i18n.translate('xpack.digitalExperience.applications.jsErrorsColumn', {
  defaultMessage: 'JS errors',
});

const FAILED_HTTP_COLUMN = i18n.translate('xpack.digitalExperience.applications.failedHttpColumn', {
  defaultMessage: 'Failed HTTP',
});

const SORT_BY_PAGE_LOADS = { sort: { field: 'pageLoads.count', direction: 'desc' } } as const;

type OptionalColumnId =
  | 'errorRate'
  | 'lcp'
  | 'inp'
  | 'cls'
  | 'fcp'
  | 'ttfb'
  | 'jsErrors'
  | 'failedHttp'
  | 'lastSeen';

/**
 * The columns the user can hide, in display order; the application and its page loads, which the
 * table is sorted by, are always shown.
 */
const OPTIONAL_COLUMNS: Array<{ id: OptionalColumnId; label: string }> = [
  { id: 'errorRate', label: ERROR_RATE_COLUMN },
  { id: 'lcp', label: LCP_COLUMN },
  { id: 'inp', label: INP_COLUMN },
  { id: 'cls', label: CLS_COLUMN },
  { id: 'fcp', label: FCP_COLUMN },
  { id: 'ttfb', label: TTFB_COLUMN },
  { id: 'jsErrors', label: JS_ERRORS_COLUMN },
  { id: 'failedHttp', label: FAILED_HTTP_COLUMN },
  { id: 'lastSeen', label: LAST_SEEN_LABEL },
];

const OPTIONAL_COLUMN_IDS = OPTIONAL_COLUMNS.map(({ id }) => id);

const HIDDEN_BY_DEFAULT: OptionalColumnId[] = ['fcp', 'ttfb', 'jsErrors'];

const HIDDEN_COLUMNS_STORAGE_KEY = 'xpack.digitalExperience.applications.hiddenColumns';

/** The web table's optional columns and which the user shows, kept in local storage. */
export const useWebVisibleColumns = () => ({
  optionalColumns: OPTIONAL_COLUMNS,
  ...useVisibleColumns({
    storageKey: HIDDEN_COLUMNS_STORAGE_KEY,
    columnIds: OPTIONAL_COLUMN_IDS,
    hiddenByDefault: HIDDEN_BY_DEFAULT,
  }),
});

/** The web applications, Classic RUM and EDOT Browser, with their page loads and web vitals. */
export function WebApplicationsTable({
  items,
  searchTerm,
  isLoading,
  noItemsMessage,
  visibleColumns,
  onShowClassicData,
}: {
  items: ApplicationRow[];
  searchTerm: string;
  isLoading: boolean;
  /** Shown instead of rows: loading, an error, no match or no web data. */
  noItemsMessage: ReactNode;
  visibleColumns: ReadonlySet<OptionalColumnId>;
  /** Shows the Classic RUM rows, from the badge of an application that has them too. */
  onShowClassicData: () => void;
}) {
  const { application } = useKibanaServices();
  const router = useDigitalExperienceRouter();
  const listQuery = useListQuery();
  const formatters = useFormatters();

  const columns = useMemo<Array<EuiBasicTableColumn<ApplicationRow>>>(() => {
    const applicationColumn: EuiBasicTableColumn<ApplicationRow> = {
      field: 'serviceName',
      name: APPLICATION_COLUMN,
      ...applicationColumnPreset<ApplicationRow>(),
      sortable: true,
      render: (serviceName: string, { source, hasClassicData }: ApplicationRow) => (
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false} css={nameCss}>
            <EuiLink
              data-test-subj="digitalExperienceApplicationLink"
              {...getEbtProps({
                action: EBT_CLICK_ACTIONS.VIEW_SERVICE,
                element: APPLICATIONS_LIST_EBT_ELEMENTS.APPLICATION_LINK,
              })}
              className="eui-textTruncate"
              href={application.getUrlForApp(DIGITAL_EXPERIENCE_FEATURE_ID, {
                path: router.link('/{serviceName}', {
                  path: { serviceName },
                  // The list's filters too, so its breadcrumb leads back to the same list.
                  query: { ...listQuery, source },
                }),
              })}
            >
              <EuiHighlight search={searchTerm}>{serviceName}</EuiHighlight>
            </EuiLink>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge data-test-subj="digitalExperienceApplicationSource" color="hollow">
              {SOURCE_LABELS[source]}
            </EuiBadge>
          </EuiFlexItem>
          {hasClassicData && (
            <EuiFlexItem grow={false}>
              <EuiToolTip content={CLASSIC_DATA_HINT}>
                <EuiBadge
                  data-test-subj="digitalExperienceClassicDataHint"
                  // Shows the Classic RUM row: it filters the list, it doesn't open the application.
                  {...getEbtProps({
                    action: DIGITAL_EXPERIENCE_EBT_ACTIONS.SET_FILTER,
                    element: APPLICATIONS_LIST_EBT_ELEMENTS.CLASSIC_DATA_HINT,
                  })}
                  color="hollow"
                  onClick={onShowClassicData}
                  onClickAriaLabel={CLASSIC_DATA_HINT}
                >
                  {CLASSIC_DATA_BADGE}
                </EuiBadge>
              </EuiToolTip>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      ),
    };

    const pageLoadsColumn: EuiBasicTableColumn<ApplicationRow> = {
      field: 'pageLoads.count',
      name: PAGE_LOADS_COLUMN,
      dataType: 'number',
      sortable: true,
      ...metricColumnPreset<ApplicationRow>(),
      render: renderCount(formatters),
    };

    const optionalColumns: Record<OptionalColumnId, EuiBasicTableColumn<ApplicationRow>> = {
      errorRate: {
        field: 'jsErrors.perPageLoad',
        name: ERROR_RATE_COLUMN,
        nameTooltip: { content: ERROR_RATE_DESCRIPTION },
        sortable: true,
        ...metricColumnPreset<ApplicationRow>(),
        render: renderErrorRate,
      },
      lcp: {
        field: 'webVitals.lcp.p75Ms',
        name: LCP_COLUMN,
        sortable: true,
        ...metricColumnPreset<ApplicationRow>(),
        render: renderVital(CORE_WEB_VITAL.lcp, formatters),
      },
      inp: {
        field: 'webVitals.inp.p75Ms',
        name: INP_COLUMN,
        sortable: true,
        ...metricColumnPreset<ApplicationRow>(),
        render: renderVital(CORE_WEB_VITAL.inp, formatters),
      },
      cls: {
        field: 'webVitals.cls.p75',
        name: CLS_COLUMN,
        sortable: true,
        ...metricColumnPreset<ApplicationRow>(),
        render: renderVital(CORE_WEB_VITAL.cls, formatters),
      },
      fcp: {
        field: 'webVitals.fcp.p75Ms',
        name: FCP_COLUMN,
        sortable: true,
        ...metricColumnPreset<ApplicationRow>(),
        render: renderVital(CORE_WEB_VITAL.fcp, formatters),
      },
      ttfb: {
        field: 'webVitals.ttfb.p75Ms',
        name: TTFB_COLUMN,
        sortable: true,
        ...metricColumnPreset<ApplicationRow>(),
        render: renderVital(CORE_WEB_VITAL.ttfb, formatters),
      },
      jsErrors: {
        field: 'jsErrors.count',
        name: JS_ERRORS_COLUMN,
        dataType: 'number',
        sortable: true,
        ...metricColumnPreset<ApplicationRow>(),
        render: renderCount(formatters),
      },
      failedHttp: {
        field: 'httpRequests.failedRatio',
        name: FAILED_HTTP_COLUMN,
        sortable: true,
        ...metricColumnPreset<ApplicationRow>(),
        render: renderFailedHttp(formatters),
      },
      lastSeen: {
        field: 'lastSeen',
        name: LAST_SEEN_LABEL,
        ...timeColumnPreset<ApplicationRow>(),
        sortable: true,
        render: renderLastSeen(formatters),
      },
    };

    return [
      applicationColumn,
      pageLoadsColumn,
      ...OPTIONAL_COLUMN_IDS.filter((id) => visibleColumns.has(id)).map(
        (id) => optionalColumns[id]
      ),
    ];
  }, [application, router, listQuery, onShowClassicData, visibleColumns, searchTerm, formatters]);

  return (
    <EuiInMemoryTable<ApplicationRow>
      data-test-subj="digitalExperienceApplicationsTable"
      tableCaption={APPLICATIONS_LABEL}
      items={items}
      itemId={getRowId}
      columns={columns}
      // Many columns: they keep their width and the table scrolls sideways instead of squeezing.
      tableLayout="auto"
      scrollableInline
      stickyScrollbar
      pagination={true}
      sorting={SORT_BY_PAGE_LOADS}
      loading={isLoading}
      noItemsMessage={noItemsMessage}
    />
  );
}
