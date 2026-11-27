/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBasicTable, EuiLink } from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { EmptyCellValue } from '@kbn/shared-ux-column-presets';
import type { CoreWebVital } from '../../../../../common/core_web_vitals';
import { CORE_WEB_VITAL } from '../../../../../common/core_web_vitals';
import { toPagePath } from '../../../../../common/sessions';
import type { TopPage } from '../../../../../common/types/usage';
import {
  APPLICATION_OVERVIEW_EBT_ELEMENTS,
  DIGITAL_EXPERIENCE_EBT_ACTIONS,
} from '../../../../ebt_constants';
import { loadTimeLabel, PAGE_LOADS_LABEL } from '../../../../labels';
import { formatDurationMs } from '../../../../utils/format_duration';
import { metricColumnPreset } from '../../../../utils/column_presets';
import { useFormatters } from '../../../../hooks/use_formatters';
import { DataPanel } from '../../../../components/data_panel';
import { VITAL_LABELS } from '../../../../utils/web_vitals';
import { WebVitalValue } from '../../../../components/web_vital_badges';
import { TruncatedCode } from '../../../../components/truncated_code';

const TITLE = i18n.translate('xpack.digitalExperience.overview.topPages.title', {
  defaultMessage: 'Top pages',
});

const SUBTITLE = i18n.translate('xpack.digitalExperience.overview.topPages.subtitle', {
  defaultMessage:
    'The ten pages loaded the most, with their load time, web vitals (p75) and JS errors, grouped by route where the app reports one. Select a page to filter the Overview by it.',
});

const PAGE_LABEL = i18n.translate('xpack.digitalExperience.overview.topPages.pageLabel', {
  defaultMessage: 'Page',
});

const JS_ERRORS_LABEL = i18n.translate('xpack.digitalExperience.overview.topPages.jsErrorsLabel', {
  defaultMessage: 'JS errors',
});

const EMPTY_MESSAGE = i18n.translate('xpack.digitalExperience.overview.topPages.empty', {
  defaultMessage: 'No page loads in this time range.',
});

/** The pages' load time is the 75th percentile, whatever the Overview's percentile. */
const TOP_PAGES_PERCENTILE = 75;

/**
 * The pages with the most page loads, with their share and load time. A click on a page filters
 * the Overview by it, or takes the filter off when it is selected already.
 */
export function TopPagesPanel({
  pages,
  isLoading,
  selectedUrls,
  onSelectPage,
}: {
  pages: TopPage[];
  isLoading: boolean;
  /** The pages the Overview is filtered by, included. */
  selectedUrls: readonly string[];
  /** Includes the page in the filter, or removes it when it is included already. */
  onSelectPage: (url: string) => void;
}) {
  const { formatNumber } = useFormatters();

  const vitalColumn = (
    field: 'lcpP75Ms' | 'inpP75Ms' | 'clsP75',
    vital: CoreWebVital
  ): EuiBasicTableColumn<TopPage> => ({
    field,
    name: VITAL_LABELS[vital],
    ...metricColumnPreset<TopPage>(),
    render: (value: number | null) => {
      return value === null ? (
        <EmptyCellValue />
      ) : (
        <WebVitalValue
          vital={vital}
          value={value}
          data-test-subj={`digitalExperienceTopPageVital-${vital}`}
        />
      );
    },
  });

  const columns: Array<EuiBasicTableColumn<TopPage>> = [
    {
      field: 'url',
      name: PAGE_LABEL,
      render: (url: string) => {
        const isSelected = selectedUrls.includes(url);
        return (
          <EuiLink
            color={isSelected ? 'primary' : 'text'}
            css={{ display: 'block', maxInlineSize: '100%' }}
            aria-pressed={isSelected}
            aria-label={
              isSelected
                ? i18n.translate('xpack.digitalExperience.overview.topPages.removeFilter', {
                    defaultMessage: 'Stop filtering by {url}',
                    values: { url },
                  })
                : i18n.translate('xpack.digitalExperience.overview.topPages.filter', {
                    defaultMessage: 'Filter by {url}',
                    values: { url },
                  })
            }
            onClick={() => onSelectPage(url)}
            data-test-subj="digitalExperienceOverviewTopPageFilter"
            {...getEbtProps({
              action: DIGITAL_EXPERIENCE_EBT_ACTIONS.SET_FILTER,
              element: APPLICATION_OVERVIEW_EBT_ELEMENTS.PAGE_FILTER,
            })}
          >
            <TruncatedCode value={toPagePath(url) ?? url} title={url} />
          </EuiLink>
        );
      },
    },
    {
      field: 'pageLoads',
      name: PAGE_LOADS_LABEL,
      ...metricColumnPreset<TopPage>(),
      render: (pageLoads: number) => {
        return formatNumber(pageLoads);
      },
    },
    {
      field: 'loadTimeP75Ms',
      name: loadTimeLabel(TOP_PAGES_PERCENTILE),
      ...metricColumnPreset<TopPage>(),
      render: (loadTimeP75Ms: number | null) => {
        return loadTimeP75Ms === null ? <EmptyCellValue /> : formatDurationMs(loadTimeP75Ms);
      },
    },
    vitalColumn('lcpP75Ms', CORE_WEB_VITAL.lcp),
    vitalColumn('inpP75Ms', CORE_WEB_VITAL.inp),
    vitalColumn('clsP75', CORE_WEB_VITAL.cls),
    {
      field: 'jsErrors',
      name: JS_ERRORS_LABEL,
      ...metricColumnPreset<TopPage>(),
      render: (jsErrors: number | null) => {
        return jsErrors === null ? <EmptyCellValue /> : formatNumber(jsErrors);
      },
    },
  ];

  return (
    <DataPanel
      title={TITLE}
      subtitle={SUBTITLE}
      isLoading={isLoading}
      isEmpty={pages.length === 0}
      emptyMessage={EMPTY_MESSAGE}
      showInstrumentationDocs
      data-test-subj="digitalExperienceOverviewTopPages"
    >
      <EuiBasicTable<TopPage>
        tableCaption={TITLE}
        items={pages}
        columns={columns}
        rowHeader="url"
        tableLayout="auto"
        // Its metric columns don't shrink: a narrow panel scrolls them instead of cutting them off.
        scrollableInline
      />
    </DataPanel>
  );
}
