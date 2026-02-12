/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import { DataView } from '@kbn/data-views-plugin/common';
import { InputsModelId } from '../../../../common/store/inputs/constants';
import { SiemSearchBar } from '../../../../common/components/search_bar';
import { FiltersGlobal } from '../../../../common/components/filters_global';
import { IndicatorsBarChartWrapper } from '../components/barchart/wrapper';
import { IndicatorsTable } from '../components/table/table';
import { useAggregatedIndicators } from '../hooks/use_aggregated_indicators';
import { useIndicators } from '../hooks/use_indicators';
import { useTIDataView } from '../hooks/use_ti_data_view';
import { DefaultPageLayout } from '../../../components/layout';
import { useFilters } from '../../query_bar/hooks/use_filters';
import { FieldTypesProvider } from '../../../containers/field_types_provider';
import { InspectorProvider } from '../../../containers/inspector';
import { useColumnSettings } from '../hooks/use_column_settings';
import { IndicatorsFilters } from '../containers/filters';
import { UpdateStatus } from '../../../components/update_status';
import { ScreenReaderAnnouncementsProvider } from '../containers/screen_reader_a11y';
import { useKibana } from '../../../../common/lib/kibana';

const IndicatorsPageProviders: FC<PropsWithChildren<unknown>> = ({ children }) => (
  <ScreenReaderAnnouncementsProvider>
    <IndicatorsFilters>
      <FieldTypesProvider>
        <InspectorProvider>{children}</InspectorProvider>
      </FieldTypesProvider>
    </IndicatorsFilters>
  </ScreenReaderAnnouncementsProvider>
);

const IndicatorsPageContent: FC = () => {
  const {
    browserFields,
    sourcererDataView: { fields },
  } = useTIDataView();

  const { fieldFormats } = useKibana().services;
  const dataView = new DataView({ spec: fields, fieldFormats });

  const columnSettings = useColumnSettings();

  const { timeRange, filters, filterQuery } = useFilters();

  const {
    indicatorCount,
    indicators,
    onChangeItemsPerPage,
    onChangePage,
    pagination,
    isLoading: isLoadingIndicators,
    isFetching: isFetchingIndicators,
    dataUpdatedAt,
  } = useIndicators({
    filters,
    filterQuery,
    timeRange,
    sorting: columnSettings.sorting.columns,
  });

  const {
    dateRange,
    series,
    selectedField,
    onFieldChange,
    isLoading: isLoadingAggregatedIndicators,
    isFetching: isFetchingAggregatedIndicators,
  } = useAggregatedIndicators({
    timeRange,
    filters,
    filterQuery,
  });

  return (
    <DefaultPageLayout
      pageTitle="Indicators"
      subHeader={<UpdateStatus isUpdating={isFetchingIndicators} updatedAt={dataUpdatedAt} />}
    >
      <FiltersGlobal>
        <SiemSearchBar dataView={dataView} id={InputsModelId.global} />
      </FiltersGlobal>

      <IndicatorsBarChartWrapper
        dateRange={dateRange}
        series={series}
        timeRange={timeRange}
        field={selectedField}
        onFieldChange={onFieldChange}
        isFetching={isFetchingAggregatedIndicators}
        isLoading={isLoadingAggregatedIndicators}
      />

      <IndicatorsTable
        browserFields={browserFields}
        columnSettings={columnSettings}
        pagination={pagination}
        indicatorCount={indicatorCount}
        indicators={indicators}
        isLoading={isLoadingIndicators}
        isFetching={isFetchingIndicators}
        onChangeItemsPerPage={onChangeItemsPerPage}
        onChangePage={onChangePage}
      />
    </DefaultPageLayout>
  );
};

export const IndicatorsPage: FC = () => (
  <IndicatorsPageProviders>
    <IndicatorsPageContent />
  </IndicatorsPageProviders>
);
