/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBasicTable } from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EmptyCellValue } from '@kbn/shared-ux-column-presets';
import { toPagePath } from '../../../../../common/sessions';
import type { TopPage } from '../../../../../common/types/usage';
import { LOAD_TIME_LABEL, PAGE_LOADS_LABEL } from '../../../../labels';
import { formatDurationMs } from '../../../../utils/format_duration';
import { metricColumnPreset } from '../../../../utils/column_presets';
import { useFormatters } from '../../../../hooks/use_formatters';
import { DataPanel } from '../../../../components/data_panel';
import { TruncatedCode } from '../../../../components/truncated_code';

const TITLE = i18n.translate('xpack.digitalExperience.overview.topPages.title', {
  defaultMessage: 'Top pages',
});

const SUBTITLE = i18n.translate('xpack.digitalExperience.overview.topPages.subtitle', {
  defaultMessage: 'The ten pages loaded the most, with their load time.',
});

const PAGE_LABEL = i18n.translate('xpack.digitalExperience.overview.topPages.pageLabel', {
  defaultMessage: 'Page',
});

const EMPTY_MESSAGE = i18n.translate('xpack.digitalExperience.overview.topPages.empty', {
  defaultMessage: 'No page loads in this time range.',
});

/** The pages with the most page loads, with their share and load time. */
export function TopPagesPanel({ pages, isLoading }: { pages: TopPage[]; isLoading: boolean }) {
  const { formatNumber } = useFormatters();

  const columns: Array<EuiBasicTableColumn<TopPage>> = [
    {
      field: 'url',
      name: PAGE_LABEL,
      render: (url: string) => {
        return <TruncatedCode value={toPagePath(url) ?? url} title={url} />;
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
      name: LOAD_TIME_LABEL,
      ...metricColumnPreset<TopPage>(),
      render: (loadTimeP75Ms: number | null) => {
        return loadTimeP75Ms === null ? <EmptyCellValue /> : formatDurationMs(loadTimeP75Ms);
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
      />
    </DataPanel>
  );
}
