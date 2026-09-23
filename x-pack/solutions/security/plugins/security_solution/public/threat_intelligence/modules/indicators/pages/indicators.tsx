/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React, { useMemo } from 'react';
import { EuiPanel, EuiSpacer, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { AppHeader } from '@kbn/app-header';
import type { AppHeaderMenu, AppHeaderMetadataItems } from '@kbn/app-header';
import { i18n as i18nCore } from '@kbn/i18n';
import { DataView } from '@kbn/data-views-plugin/common';
import { useNavigateTo } from '@kbn/security-solution-navigation';
import moment from 'moment';
import { InputsModelId } from '../../../../common/store/inputs/constants';
import { SiemSearchBar } from '../../../../common/components/search_bar';
import { useAddIntegrationsUrl } from '../../../../common/hooks/use_add_integrations_url';
import { useKibana } from '../../../../common/lib/kibana';
import { IndicatorsBarChartWrapper } from '../components/barchart/wrapper';
import { IndicatorsTable } from '../components/table/table';
import { useAggregatedIndicators } from '../hooks/use_aggregated_indicators';
import { useIndicators } from '../hooks/use_indicators';
import { useTIDataView } from '../hooks/use_ti_data_view';
import { useFilters } from '../../query_bar/hooks/use_filters';
import { FieldTypesProvider } from '../../../containers/field_types_provider';
import { InspectorProvider } from '../../../containers/inspector';
import { useColumnSettings } from '../hooks/use_column_settings';
import { IndicatorsFilters } from '../containers/filters';
import { UPDATED, UPDATING } from '../../../components/translations';
import { ScreenReaderAnnouncementsProvider } from '../containers/screen_reader_a11y';
import { useTIDocumentationLink } from '../../../hooks/use_documentation_link';
import { INDICATORS } from '../../../constants/translations';
import { SecuritySolutionPageWrapper } from '../../../../common/components/page_wrapper';

const ADD_INTEGRATIONS_LABEL = i18nCore.translate(
  'xpack.securitySolution.threatIntelligence.indicators.addIntegrationsMenuItem',
  { defaultMessage: 'Add integrations' }
);

const IndicatorsPageProviders: FC<PropsWithChildren<unknown>> = ({ children }) => (
  <ScreenReaderAnnouncementsProvider>
    <IndicatorsFilters>
      <FieldTypesProvider>
        <InspectorProvider>{children}</InspectorProvider>
      </FieldTypesProvider>
    </IndicatorsFilters>
  </ScreenReaderAnnouncementsProvider>
);

interface IndicatorsHeaderProps {
  isUpdating: boolean;
  updatedAt: number;
}

const IndicatorsHeader: FC<IndicatorsHeaderProps> = ({ isUpdating, updatedAt }) => {
  const documentationLink = useTIDocumentationLink();
  const { href: addIntegrationsHref } = useAddIntegrationsUrl();
  const { navigateTo } = useNavigateTo();

  const menu = useMemo<AppHeaderMenu>(
    () => ({
      items: [
        {
          id: 'addIntegrations',
          label: ADD_INTEGRATIONS_LABEL,
          iconType: 'indexOpen',
          href: addIntegrationsHref,
          overflow: true,
          testId: 'threatIntelligenceHeaderAddIntegrations',
          run: () => {
            navigateTo({ url: addIntegrationsHref });
          },
        },
      ],
    }),
    [addIntegrationsHref, navigateTo]
  );

  const metadata = useMemo<AppHeaderMetadataItems>(() => {
    if (isUpdating) {
      return [
        {
          type: 'text',
          label: UPDATING,
          'data-test-subj': 'updateStatus',
        },
      ];
    }
    return [
      {
        type: 'text',
        label: UPDATED,
        value: moment(updatedAt).fromNow(),
        'data-test-subj': 'updateStatus',
      },
    ];
  }, [isUpdating, updatedAt]);

  return (
    // [Chrome Next] Migrated header — parent supplies the Figma 16px page grid via bleed.
    <AppHeader
      title={INDICATORS}
      menu={menu}
      metadata={metadata}
      docLink={documentationLink}
      spacing="bleed"
    />
  );
};

const IndicatorsPageContent: FC = () => {
  const { euiTheme } = useEuiTheme();

  // Security section defaults to paddingSize "l" (24px). Figma uses 16px — same pattern as Rules.
  const chromeNextPage = css`
    margin: -${euiTheme.size.l};
    padding: ${euiTheme.size.base};
  `;

  // Same FiltersGlobal shell (subdued full-bleed), kept in-page under AppHeader instead of the KQL portal.
  const kqlBar = css`
    margin-inline: -${euiTheme.size.base};
  `;

  const kqlBarHeader = css`
    @media (max-width: 767px) {
      overflow-x: auto;
    }
  `;

  const { browserFields, sourcererDataView: sourcererDataViewSpec } = useTIDataView();

  const { fieldFormats } = useKibana().services;
  const dataView = new DataView({ spec: sourcererDataViewSpec, fieldFormats });

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
    <SecuritySolutionPageWrapper>
      <div css={chromeNextPage}>
        <IndicatorsHeader
          isUpdating={isFetchingIndicators}
          updatedAt={dataUpdatedAt}
        />
        {/* Same FiltersGlobal panel styling — only the placement moved below AppHeader. */}
        <div css={kqlBar}>
          <EuiPanel borderRadius="none" color="subdued" paddingSize="none">
            <header data-test-subj="filters-global-container" css={kqlBarHeader}>
              <SiemSearchBar dataView={dataView} id={InputsModelId.global} />
            </header>
          </EuiPanel>
        </div>
        <EuiSpacer size="m" />
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
      </div>
    </SecuritySolutionPageWrapper>
  );
};

export const IndicatorsPage: FC = () => (
  <IndicatorsPageProviders>
    <IndicatorsPageContent />
  </IndicatorsPageProviders>
);
