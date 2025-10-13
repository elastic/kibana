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
import { PageScope } from '../../../data_view_manager/constants';
import { HeaderPage } from '../../../common/components/header_page';
import { useDataView } from '../../../data_view_manager/hooks/use_data_view';
import { AttacksPageContent } from './content';
import { PAGE_TITLE } from '../../pages/attacks/translations';

export const DATA_VIEW_LOADING_PROMPT_TEST_ID = 'attacks-page-data-view-loading-prompt';
export const DATA_VIEW_ERROR_TEST_ID = 'attacks-page-data-view-error';
export const SKELETON_TEST_ID = 'attacks-page-skeleton';

const DATAVIEW_ERROR = i18n.translate('xpack.securitySolution.attacksPage.dataViewError', {
  defaultMessage: 'Unable to retrieve the data view',
});

export const Wrapper = React.memo(() => {
  const { dataView, status } = useDataView(PageScope.attacks);

  const isLoading: boolean = useMemo(() => status === 'loading' || status === 'pristine', [status]);

  const isDataViewInvalid: boolean = useMemo(
    () => status === 'error' || (status === 'ready' && !dataView.hasMatchedIndices()),
    [dataView, status]
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
            <AttacksPageContent dataView={dataView} />
          )}
        </>
      }
    />
  );
});
Wrapper.displayName = 'Wrapper';
