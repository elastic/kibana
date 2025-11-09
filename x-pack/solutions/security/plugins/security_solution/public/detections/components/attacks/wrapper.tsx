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
import { HeaderPage } from '../../../common/components/header_page';
import { useSourcererDataView } from '../../../sourcerer/containers';
import { SourcererScopeName } from '../../../sourcerer/store/model';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { useDataView } from '../../../data_view_manager/hooks/use_data_view';
import { AttacksPageContent } from './content';
import { PAGE_TITLE } from '../../pages/attacks/translations';

export const DATA_VIEW_LOADING_PROMPT_TEST_ID = 'attacks-page-data-view-loading-prompt';
export const DATA_VIEW_ERROR_TEST_ID = 'attacks-page-data-view-error';
export const SKELETON_TEST_ID = 'attacks-page-skeleton';

const DATAVIEW_ERROR = i18n.translate('xpack.securitySolution.attacksPage.dataViewError', {
  defaultMessage: 'Unable to retrieve the data view',
});

/**
 * Retrieves the dataView for the attacks page then renders the attacks page when the dataView is valid.
 * Shows a loading skeleton while retrieving.
 * Shows an error message if the dataView is invalid.
 */
export const Wrapper = memo(() => {
  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');

  const { sourcererDataView: oldSourcererDataViewSpec, loading: oldSourcererDataViewIsLoading } =
    useSourcererDataView(SourcererScopeName.detections);
  // TODO rename to just dataView and status once we remove the newDataViewPickerEnabled feature flag
  const { dataView: experimentalDataView, status: experimentalDataViewStatus } = useDataView(
    SourcererScopeName.detections
  );

  const isLoading: boolean = useMemo(
    () =>
      newDataViewPickerEnabled
        ? experimentalDataViewStatus === 'loading' || experimentalDataViewStatus === 'pristine'
        : oldSourcererDataViewIsLoading,
    [experimentalDataViewStatus, newDataViewPickerEnabled, oldSourcererDataViewIsLoading]
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
            <AttacksPageContent
              dataView={experimentalDataView}
              oldSourcererDataViewSpec={oldSourcererDataViewSpec}
            />
          )}
        </>
      }
    />
  );
});

Wrapper.displayName = 'Wrapper';
