/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
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
import type { DataView, DataViewSpec } from '@kbn/data-views-plugin/common';
import type { RunTimeMappings } from '@kbn/timelines-plugin/common/search_strategy';

import type { SourcererScopeName } from '../../../../sourcerer/store/model';
import { HeaderPage } from '../../../../common/components/header_page';
import { useDetectionsDataView } from '../../../hooks/use_detections_data_view';

export const DATA_VIEW_LOADING_PROMPT_TEST_ID = 'detections-page-data-view-loading-prompt';
export const DATA_VIEW_ERROR_TEST_ID = 'detections-page-data-view-error';
export const SKELETON_TEST_ID = 'detections-page-skeleton';

const DATAVIEW_ERROR = i18n.translate('xpack.securitySolution.detectionsPage.dataViewError', {
  defaultMessage: 'Unable to retrieve the data view',
});

export interface DetectionsWrapperChildrenProps {
  /**
   * DataView for the detection page
   */
  dataView: DataView;
  // TODO remove when we remove the newDataViewPickerEnabled feature flag
  /**
   * DataViewSpec used to fetch the detections data when the newDataViewPickerEnabled feature flag is false
   */
  oldSourcererDataViewSpec: DataViewSpec;
  // TODO remove when we remove the newDataViewPickerEnabled feature flag
  /**
   * runTimeMappings used in the KPIsSection, when the newDataViewPickerEnabled feature flag is false
   */
  runtimeMappings: RunTimeMappings;
}

interface DetectionsWrapperProps {
  /**
   * The data view scope
   */
  scope: SourcererScopeName;
  /**
   * The page title
   */
  title: string;
  /**
   * The page content that is rendered when the valid data view has been retrieved
   */
  children: (props: DetectionsWrapperChildrenProps) => React.ReactNode;
}

/**
 * Retrieves the dataView for the detections page then renders the detections page when the dataView is valid.
 * Shows a loading skeleton while retrieving.
 * Shows an error message if the dataView is invalid.
 */
export const DetectionsWrapper = React.memo<DetectionsWrapperProps>(
  ({ scope, title, children }) => {
    const { isLoading, isDataViewInvalid, dataView, oldSourcererDataViewSpec, runtimeMappings } =
      useDetectionsDataView(scope);

    const childrenProps = useMemo(() => {
      return { dataView, oldSourcererDataViewSpec, runtimeMappings };
    }, [dataView, oldSourcererDataViewSpec, runtimeMappings]);

    return (
      <EuiSkeletonLoading
        data-test-subj={DATA_VIEW_LOADING_PROMPT_TEST_ID}
        isLoading={isLoading}
        loadingContent={
          <div data-test-subj={SKELETON_TEST_ID}>
            <EuiSkeletonRectangle height={40} width="100%" />
            <EuiSpacer />
            <HeaderPage title={title}>
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
              children(childrenProps)
            )}
          </>
        }
      />
    );
  }
);
DetectionsWrapper.displayName = 'DetectionsWrapper';
