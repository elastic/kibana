/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiEmptyPrompt, EuiSkeletonLoading, EuiSkeletonRectangle, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { AppHeaderLoading } from '@kbn/app-header';
import { PageScope } from '../../../data_view_manager/constants';
import { useIsCpsLinkedSearchSpace } from '../../../common/hooks/use_is_cps_linked_search_space';
import { DataViewDegradedCallout } from '../../../data_view_manager/components/data_view_degraded_callout';
import { useDataView } from '../../../data_view_manager/hooks/use_data_view';
import { AttacksPageContent } from './content';
import { UninitializedDataViewEmptyState } from './uninitialized_empty_state/uninitialized_data_view_empty_state';

export const DATA_VIEW_LOADING_PROMPT_TEST_ID = 'attacks-page-data-view-loading-prompt';
export const DATA_VIEW_ERROR_TEST_ID = 'attacks-page-data-view-error';
export const DATA_VIEW_DEGRADED_TEST_ID = 'attacks-page-data-view-degraded';
export const SKELETON_TEST_ID = 'attacks-page-skeleton';

const DATAVIEW_ERROR = i18n.translate('xpack.securitySolution.attacksPage.dataViewError', {
  defaultMessage: 'Unable to retrieve the data view',
});

/**
 * Renders the attacks page when the provided dataView is valid.
 * Shows a loading skeleton while retrieving.
 * Shows an error message if the dataView cannot be loaded at all.
 * When the dataView loaded but has no matched indices:
 * - in a CPS space that searches linked projects, shows a warning and still renders content
 *   (field-caps can time out during a linked-cluster brownout while origin attacks remain queryable)
 * - otherwise shows the uninitialized empty state
 */
export const Wrapper = React.memo(() => {
  const { dataView, status } = useDataView(PageScope.attacks);
  const { isReady: isCpsReady, isLinkedSearchSpace } = useIsCpsLinkedSearchSpace();

  const isDataViewLoading: boolean = useMemo(
    () => status === 'loading' || status === 'pristine',
    [status]
  );

  const isDataViewInvalid: boolean = useMemo(() => status === 'error', [status]);

  const isDataViewDegraded: boolean = useMemo(
    () => status === 'ready' && !dataView.hasMatchedIndices(),
    [dataView, status]
  );

  const isLoading: boolean = useMemo(
    () => isDataViewLoading || (isDataViewDegraded && !isCpsReady),
    [isCpsReady, isDataViewDegraded, isDataViewLoading]
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

    if (isDataViewDegraded && !isLinkedSearchSpace) {
      return <UninitializedDataViewEmptyState dataView={dataView} />;
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
                id="xpack.securitySolution.attacksPage.dataViewDegradedDetailsDescription"
                defaultMessage="Attacks are still listed below, but field-dependent features such as search suggestions, the fields browser and grouping options may be limited."
              />
            </DataViewDegradedCallout>
            <EuiSpacer size="m" />
          </>
        )}
        <AttacksPageContent dataView={dataView} />
      </>
    );
  }, [dataView, isDataViewDegraded, isDataViewInvalid, isLinkedSearchSpace]);

  return (
    <EuiSkeletonLoading
      data-test-subj={DATA_VIEW_LOADING_PROMPT_TEST_ID}
      isLoading={isLoading}
      loadingContent={
        <div data-test-subj={SKELETON_TEST_ID}>
          <AppHeaderLoading spacing="largeBleed" />
          <EuiSpacer size="s" />
          <EuiSkeletonRectangle height={32} width="100%" />
          <EuiSpacer size="s" />
          <EuiSkeletonRectangle height={32} width="100%" />
          <EuiSpacer size="l" />
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
