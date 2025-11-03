/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import {
  EuiEmptyPrompt,
  EuiHorizontalRule,
  EuiSkeletonLoading,
  EuiSkeletonRectangle,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { PackageListItem } from '@kbn/fleet-plugin/common';
import { useCreateEaseAlertsDataView } from '../../hooks/alert_summary/use_create_data_view';
import { KPIsSection } from './kpis/kpis_section';
import { IntegrationSection } from './integrations/integration_section';
import { SearchBarSection } from './search_bar/search_bar_section';
import { TableSection } from './table/table_section';

const DATAVIEW_ERROR = i18n.translate('xpack.securitySolution.alertSummary.dataViewError', {
  defaultMessage: 'Unable to create data view',
});

export const DATA_VIEW_LOADING_PROMPT_TEST_ID = 'alert-summary-data-view-loading-prompt';
export const DATA_VIEW_ERROR_TEST_ID = 'alert-summary-data-view-error';
export const SKELETON_TEST_ID = 'alert-summary-skeleton';
export const CONTENT_TEST_ID = 'alert-summary-content';

export interface WrapperProps {
  /**
   * List of installed EASE integrations
   */
  packages: PackageListItem[];
}

/**
 * Creates a new adhoc dataView for the alert summary page. The dataView is created just with the alert indices.
 * During the creating, we display a loading skeleton, mimicking the future alert summary page content.
 * Once the dataView is correctly created, we render the content.
 * If the creation fails, we show an error message.
 */
export const Wrapper = memo(({ packages }: WrapperProps) => {
  const { dataView, loading } = useCreateEaseAlertsDataView();
  const signalIndexName = useMemo(() => (dataView ? dataView.getIndexPattern() : ''), [dataView]);

  return (
    <EuiSkeletonLoading
      data-test-subj={DATA_VIEW_LOADING_PROMPT_TEST_ID}
      isLoading={loading}
      loadingContent={
        <div data-test-subj={SKELETON_TEST_ID}>
          <EuiSkeletonRectangle height={50} width="100%" />
          <EuiHorizontalRule />
          <EuiSkeletonRectangle height={50} width="100%" />
          <EuiSpacer />
          <EuiSkeletonRectangle height={275} width="100%" />
          <EuiSpacer />
          <EuiSkeletonRectangle height={600} width="100%" />
        </div>
      }
      loadedContent={
        <>
          {!dataView ? (
            <EuiEmptyPrompt
              color="danger"
              data-test-subj={DATA_VIEW_ERROR_TEST_ID}
              iconType="error"
              title={<h2>{DATAVIEW_ERROR}</h2>}
            />
          ) : (
            <div data-test-subj={CONTENT_TEST_ID}>
              <IntegrationSection packages={packages} />
              <EuiHorizontalRule />
              <SearchBarSection dataView={dataView} packages={packages} />
              <EuiSpacer />
              <KPIsSection signalIndexName={signalIndexName} />
              <EuiSpacer />
              <TableSection dataView={dataView} packages={packages} />
            </div>
          )}
        </>
      }
    />
  );
});

Wrapper.displayName = 'Wrapper';
