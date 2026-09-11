/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSkeletonLoading,
  EuiSkeletonRectangle,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DataView } from '@kbn/data-views-plugin/public';
import { HeaderPage } from '../../../common/components/header_page';
import { DataViewDegradedCallout } from '../../../data_view_manager/components/data_view_degraded_callout';
import { AlertsPageContent } from './content';
import { PAGE_TITLE } from '../../pages/alerts/translations';

export const DATA_VIEW_LOADING_PROMPT_TEST_ID = 'alerts-page-data-view-loading-prompt';
export const DATA_VIEW_ERROR_TEST_ID = 'alerts-page-data-view-error';
export const DATA_VIEW_DEGRADED_TEST_ID = 'alerts-page-data-view-degraded';
export const SKELETON_TEST_ID = 'alerts-page-skeleton';

const DATAVIEW_ERROR = i18n.translate('xpack.securitySolution.alertsPage.dataViewError', {
  defaultMessage: 'Unable to retrieve the data view',
});

interface WrapperProps {
  /** the alerts data view, retrieved once by the parent via useDataView(PageScope.alerts) */
  dataView: DataView;
  /** the status of the alerts data view retrieval */
  status: 'pristine' | 'loading' | 'ready' | 'error';
}

/**
 * Renders the alerts page when the provided dataView is valid.
 * Shows a loading skeleton while retrieving.
 * Shows an error message if the dataView cannot be loaded at all.
 * Shows a warning callout above the content when the dataView loaded but has no matched indices,
 * e.g. during a CPS brownout or before any alerts have been written.
 */
export const Wrapper = memo(({ dataView, status }: WrapperProps) => {
  const isLoading: boolean = useMemo(() => status === 'loading' || status === 'pristine', [status]);

  const isDataViewInvalid: boolean = useMemo(() => status === 'error', [status]);

  const isDataViewDegraded: boolean = useMemo(
    () => status === 'ready' && !dataView.hasMatchedIndices(),
    [dataView, status]
  );

  const loadedContent = useMemo(() => {
    if (isDataViewInvalid) {
      return (
        <EuiEmptyPrompt
          color="danger"
          data-test-subj={DATA_VIEW_ERROR_TEST_ID}
          iconType="error"
          title={<h2>{DATAVIEW_ERROR}</h2>}
        />
      );
    }

    return (
      <>
        {isDataViewDegraded && (
          <>
            <DataViewDegradedCallout
              dataView={dataView}
              data-test-subj={DATA_VIEW_DEGRADED_TEST_ID}
            >
              <FormattedMessage
                id="xpack.securitySolution.alertsPage.dataViewDegradedDetailsDescription"
                defaultMessage="Alerts are still listed below, but field-dependent features such as search suggestions, the fields browser and grouping options may be limited."
              />
            </DataViewDegradedCallout>
            <EuiSpacer size="m" />
          </>
        )}
        <AlertsPageContent dataView={dataView} />
      </>
    );
  }, [dataView, isDataViewDegraded, isDataViewInvalid]);

  return (
    <EuiSkeletonLoading
      data-test-subj={DATA_VIEW_LOADING_PROMPT_TEST_ID}
      isLoading={isLoading}
      loadingContent={
        <div data-test-subj={SKELETON_TEST_ID}>
          <EuiSkeletonRectangle height={40} width="100%" />
          <EuiSpacer />
          <HeaderPage title={PAGE_TITLE}>
            <EuiFlexGroup gutterSize="m">
              <EuiFlexItem>
                <EuiSkeletonRectangle height={40} width={110} />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiSkeletonRectangle height={40} width={110} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </HeaderPage>
          <EuiHorizontalRule margin="none" />
          <EuiSpacer size="l" />
          <EuiSkeletonRectangle height={32} width="100%" />
          <EuiSpacer />
          <EuiSkeletonRectangle height={375} width="100%" />
          <EuiSpacer />
          <EuiSkeletonRectangle height={600} width="100%" />
        </div>
      }
      loadedContent={loadedContent}
    />
  );
});

Wrapper.displayName = 'Wrapper';
