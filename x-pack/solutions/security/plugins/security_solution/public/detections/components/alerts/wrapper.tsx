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
import type { RunTimeMappings } from '@kbn/timelines-plugin/common/search_strategy';
import { HeaderPage } from '../../../common/components/header_page';
import { useSourcererDataView } from '../../../sourcerer/containers';
import { PageScope } from '../../../sourcerer/store/model';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { useDataView } from '../../../data_view_manager/hooks/use_data_view';
import { AlertsPageContent } from './content';
import { PAGE_TITLE } from '../../pages/alerts/translations';

export const DATA_VIEW_LOADING_PROMPT_TEST_ID = 'alerts-page-data-view-loading-prompt';
export const DATA_VIEW_ERROR_TEST_ID = 'alerts-page-data-view-error';
export const SKELETON_TEST_ID = 'alerts-page-skeleton';

const DATAVIEW_ERROR = i18n.translate('xpack.securitySolution.alertsPage.dataViewError', {
  defaultMessage: 'Unable to retrieve the data view',
});

/**
 * Retrieves the dataView for the alerts page then renders the alerts page when the dataView is valid.
 * Shows a loading skeleton while retrieving.
 * Shows an error message if the dataView is invalid.
 */
export const Wrapper = memo(() => {
  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');

  const { sourcererDataView: oldSourcererDataViewSpec, loading: oldSourcererDataViewIsLoading } =
    useSourcererDataView(PageScope.detections);
  // TODO rename to just dataView and status once we remove the newDataViewPickerEnabled feature flag
  const { dataView: experimentalDataView, status: experimentalDataViewStatus } = useDataView(
    PageScope.detections
  );

  const isLoading: boolean = useMemo(
    () =>
      newDataViewPickerEnabled
        ? experimentalDataViewStatus === 'loading' || experimentalDataViewStatus === 'pristine'
        : oldSourcererDataViewIsLoading,
    [experimentalDataViewStatus, newDataViewPickerEnabled, oldSourcererDataViewIsLoading]
  );

  // TODO this will not be needed anymore once we remove the newDataViewPickerEnabled feature flag.
  //  We currently only need the runtimeMappings in the KPIsSection, so we can just pass down the dataView
  //  and extract the runtimeMappings from it there using experimentalDataView.getRuntimeMappings()
  const runtimeMappings: RunTimeMappings = useMemo(
    () =>
      newDataViewPickerEnabled
        ? (experimentalDataView?.getRuntimeMappings() as RunTimeMappings) ?? {} // TODO remove the ? as the dataView should never be undefined
        : (oldSourcererDataViewSpec?.runtimeFieldMap as RunTimeMappings) ?? {},
    [newDataViewPickerEnabled, experimentalDataView, oldSourcererDataViewSpec?.runtimeFieldMap]
  );

  const isDataViewInvalid: boolean = useMemo(
    () =>
      newDataViewPickerEnabled
        ? experimentalDataViewStatus === 'error' ||
          (experimentalDataViewStatus === 'ready' && !experimentalDataView.hasMatchedIndices())
        : !oldSourcererDataViewSpec ||
          !oldSourcererDataViewSpec.id ||
          !oldSourcererDataViewSpec.title,
    [
      experimentalDataView,
      experimentalDataViewStatus,
      newDataViewPickerEnabled,
      oldSourcererDataViewSpec,
    ]
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
          {isDataViewInvalid ? (
            <EuiEmptyPrompt
              color="danger"
              data-test-subj={DATA_VIEW_ERROR_TEST_ID}
              iconType="error"
              title={<h2>{DATAVIEW_ERROR}</h2>}
            />
          ) : (
            <AlertsPageContent
              dataView={experimentalDataView}
              oldSourcererDataViewSpec={oldSourcererDataViewSpec}
              runtimeMappings={runtimeMappings}
            />
          )}
        </>
      }
    />
  );
});

Wrapper.displayName = 'Wrapper';
