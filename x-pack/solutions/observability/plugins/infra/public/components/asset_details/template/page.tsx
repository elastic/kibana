/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect } from 'react';
import type { EuiPageHeaderProps } from '@elastic/eui';
import { EuiLoadingSpinner, EuiSpacer } from '@elastic/eui';
import { EmbeddableProfilingSearchBar } from '@kbn/observability-shared-plugin/public';
import { capitalize } from 'lodash';
import { useMetricsBreadcrumbs } from '../../../hooks/use_metrics_breadcrumbs';
import { useParentBreadcrumbResolver } from '../../../hooks/use_parent_breadcrumb_resolver';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import { ASSET_DETAILS_PAGE_COMPONENT_NAME, DATE_PICKER_VISIBLE_TABS } from '../constants';
import { Content } from '../content/content';
import { DatePicker } from '../date_picker/date_picker';
import { useAssetDetailsRenderPropsContext } from '../hooks/use_asset_details_render_props';
import { useDatePickerContext } from '../hooks/use_date_picker';
import { useHostAttachmentConfig } from '../hooks/use_host_attachment_config';
import { useMetadataStateContext } from '../hooks/use_metadata_state';
import { usePageHeader } from '../hooks/use_page_header';
import { useProfilingKuery } from '../hooks/use_profiling_kuery';
import { useTabSwitcherContext } from '../hooks/use_tab_switcher';
import { ContentTabIds, type ContentTemplateProps } from '../types';
import { LogsSearchBarHeader } from '../tabs/logs/logs_search_bar_header';
import { MetadataSearchBarHeader } from '../tabs/metadata/metadata_search_bar_header';
import { ProcessesSearchBarHeader } from '../tabs/processes/processes_search_bar_header';
import { getIntegrationsAvailable } from '../utils';
import { DEFAULT_SCHEMA } from '../../../../common/constants';
import { InfraPageTemplate } from '../../shared/templates/infra_page_template';
import { OnboardingFlow } from '../../shared/templates/no_data_config';
import { HostHeaderTitle } from '../header/host_header_title';

export const Page = ({ tabs = [], links = [] }: ContentTemplateProps) => {
  const { metadata, loading: metadataLoading } = useMetadataStateContext();
  const { rightSideItems, tabEntries, breadcrumbs: headerBreadcrumbs } = usePageHeader(tabs, links);
  const { entity, loading, schema } = useAssetDetailsRenderPropsContext();
  const trackOnlyOnce = React.useRef(false);
  const { activeTabId } = useTabSwitcherContext();
  const isProfilingTab = activeTabId === ContentTabIds.PROFILING;
  const isLogsTab = activeTabId === ContentTabIds.LOGS;
  const isMetadataTab = activeTabId === ContentTabIds.METADATA;
  const isProcessesTab = activeTabId === ContentTabIds.PROCESSES;
  const showDatePicker = DATE_PICKER_VISIBLE_TABS.includes(activeTabId as ContentTabIds);
  const {
    services: { telemetry },
  } = useKibanaContextForPlugin();

  // Configure agent builder global flyout with the host attachment
  useHostAttachmentConfig();

  const parentBreadcrumbResolver = useParentBreadcrumbResolver();
  const breadcrumbOptions = parentBreadcrumbResolver.getBreadcrumbOptions(entity.type);
  useMetricsBreadcrumbs([
    {
      ...breadcrumbOptions.link,
      text: breadcrumbOptions.text,
    },
    {
      text: entity.name,
    },
    {
      text: capitalize(activeTabId),
    },
  ]);

  useEffect(() => {
    if (trackOnlyOnce.current) {
      return;
    }
    if (!metadataLoading && metadata) {
      const integrations = getIntegrationsAvailable(metadata);
      const telemetryParams = {
        componentName: ASSET_DETAILS_PAGE_COMPONENT_NAME,
        assetType: entity.type,
        tabId: activeTabId,
        schema_selected: schema || DEFAULT_SCHEMA,
      };

      telemetry.reportAssetDetailsPageViewed(
        integrations.length > 0
          ? {
              ...telemetryParams,
              integrations,
            }
          : telemetryParams
      );
      trackOnlyOnce.current = true;
    }
  }, [activeTabId, entity.type, metadata, metadataLoading, telemetry, schema]);

  return (
    <InfraPageTemplate
      onboardingFlow={entity.type === 'host' ? OnboardingFlow.Hosts : OnboardingFlow.Infra}
      dataSourceAvailability={entity.type === 'host' ? 'host' : undefined}
      pageHeader={{
        pageTitle: loading ? (
          <EuiLoadingSpinner size="m" />
        ) : entity.type === 'host' ? (
          <HostHeaderTitle title={entity.name} schema={schema} />
        ) : (
          entity.name
        ),
        tabs: tabEntries,
        rightSideItems,
        breadcrumbs: headerBreadcrumbs,
        color: 'subdued' as unknown as EuiPageHeaderProps['color'],
        children: isProfilingTab ? (
          <ProfilingSearchBarHeader />
        ) : isLogsTab ? (
          <SearchBarWithDatePicker searchBar={<LogsSearchBarHeader />} />
        ) : isMetadataTab ? (
          <SearchBarWithDatePicker searchBar={<MetadataSearchBarHeader />} />
        ) : isProcessesTab ? (
          <SearchBarWithDatePicker searchBar={<ProcessesSearchBarHeader />} />
        ) : showDatePicker ? (
          <DatePicker />
        ) : undefined,
      }}
      data-component-name={ASSET_DETAILS_PAGE_COMPONENT_NAME}
      data-asset-type={entity.type}
      data-schema-selected={schema}
    >
      <Content showDatePicker={false} showProfilingSearchBar={false} showTabSearchBar={false} />
    </InfraPageTemplate>
  );
};

const SearchBarWithDatePicker = ({ searchBar }: { searchBar: React.ReactNode }) => (
  <>
    {searchBar}
    <EuiSpacer size="s" />
    <DatePicker />
  </>
);

const ProfilingSearchBarHeader = () => {
  const { dateRange, setDateRange } = useDatePickerContext();
  const { customKuery, setCustomKuery } = useProfilingKuery();

  const onSearchSubmit = useCallback(
    ({ dateRange: range, query }: any) => {
      setDateRange(range);
      setCustomKuery(query);
    },
    [setCustomKuery, setDateRange]
  );

  const onSearchRefresh = useCallback(() => {
    setDateRange(dateRange);
  }, [dateRange, setDateRange]);

  return (
    <EmbeddableProfilingSearchBar
      kuery={customKuery}
      rangeFrom={dateRange.from}
      rangeTo={dateRange.to}
      onQuerySubmit={onSearchSubmit}
      onRefresh={onSearchRefresh}
    />
  );
};
