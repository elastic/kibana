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
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import { HeaderPage } from '../../../common/components/header_page';
import { useSourcererDataView } from '../../../sourcerer/containers';
import { SourcererScopeName } from '../../../sourcerer/store/model';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { useDataViewSpec } from '../../../data_view_manager/hooks/use_data_view_spec';
import { AlertsPageContent } from './content';
import { PAGE_TITLE } from '../../pages/alerts/translations';

export const DATA_VIEW_LOADING_PROMPT_TEST_ID = 'alert-page-data-view-loading-prompt';
export const DATA_VIEW_ERROR_TEST_ID = 'alert-summary-data-view-error';
export const SKELETON_TEST_ID = 'alert-page-skeleton';

const DATAVIEW_ERROR = i18n.translate('xpack.securitySolution.alertSummary.dataViewError', {
  defaultMessage: 'Unable to create data view',
});

/**
 *
 */
export const Wrapper = memo(() => {
  const { sourcererDataView: oldSourcererDataViewSpec, loading: oldSourcererDataViewIsLoading } =
    useSourcererDataView(SourcererScopeName.detections);

  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');
  const { dataViewSpec: experimentalDataViewSpec, status: experimentalDataViewStatus } =
    useDataViewSpec(SourcererScopeName.detections);

  const isLoading = useMemo(
    () =>
      newDataViewPickerEnabled
        ? experimentalDataViewStatus !== 'ready'
        : oldSourcererDataViewIsLoading,
    [experimentalDataViewStatus, newDataViewPickerEnabled, oldSourcererDataViewIsLoading]
  );

  const dataViewSpec: DataViewSpec = useMemo(
    () => (newDataViewPickerEnabled ? experimentalDataViewSpec : oldSourcererDataViewSpec),
    [experimentalDataViewSpec, newDataViewPickerEnabled, oldSourcererDataViewSpec]
  );

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
      loadedContent={
        <>
          {!dataViewSpec || !dataViewSpec.id ? (
            <EuiEmptyPrompt
              color="danger"
              data-test-subj={DATA_VIEW_ERROR_TEST_ID}
              iconType="error"
              title={<h2>{DATAVIEW_ERROR}</h2>}
            />
          ) : (
            <AlertsPageContent dataViewSpec={dataViewSpec} />
          )}
        </>
      }
    />
  );
});

Wrapper.displayName = 'Wrapper';
