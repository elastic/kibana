/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiCallOut, EuiLoadingSpinner, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ElasticRequestState } from '@kbn/unified-doc-viewer';
import { useEsDocSearch } from '@kbn/unified-doc-viewer-plugin/public';
import type { ResolverCellActionRenderer } from '../../../resolver/types';
import { useDataView } from '../../../data_view_manager/hooks/use_data_view';
import { PageScope } from '../../../data_view_manager/constants';
import { OverviewTab } from './overview_tab';

const DATA_VIEW_ERROR = i18n.translate(
  'xpack.securitySolution.analyzer.eventOverviewFlyout.dataViewError',
  {
    defaultMessage: 'Unable to retrieve the data view for analyzer.',
  }
);

const DOCUMENT_NOT_FOUND = i18n.translate(
  'xpack.securitySolution.analyzer.eventOverviewFlyout.documentNotFound',
  {
    defaultMessage: 'Cannot find document. No documents match that ID.',
  }
);

const FETCH_ERROR = i18n.translate(
  'xpack.securitySolution.analyzer.eventOverviewFlyout.fetchError',
  {
    defaultMessage: 'Unable to fetch document details.',
  }
);

export interface OverviewTabWrapperProps {
  /**
   * The ID of the document to display in the overview tab. This is required to fetch the document details and render the content of the overview tab.
   */
  documentId: string | undefined;
  /**
   * The name of the index that contains the document to display in the overview tab. This is required to fetch the document details and render the content of the overview tab.
   */
  indexName: string | undefined;
  /**
   * A function that renders cell actions for the overview tab. This is required to provide interactive actions for fields displayed in the overview tab, such as adding filters or viewing field details.
   */
  renderCellActions: ResolverCellActionRenderer;
}

/**
 * OverviewTabWrapper is a React component that serves as a wrapper for the OverviewTab component.
 * It fetches the document details based on the provided document ID and index name, and manages the loading and error states during the data fetching process.
 * It is currently used in Analyzer when opening a document from the detail panel.
 */
export const OverviewTabWrapper = memo(
  ({ documentId, indexName, renderCellActions }: OverviewTabWrapperProps) => {
    const { dataView, status } = useDataView(PageScope.default);

    const isDataViewLoading = status === 'loading' || status === 'pristine';
    const isDataViewInvalid =
      status === 'error' || (status === 'ready' && !dataView.hasMatchedIndices());
    const shouldSkipSearch =
      isDataViewLoading || isDataViewInvalid || !documentId || !indexName || !dataView;

    const [requestState, hit] = useEsDocSearch({
      id: documentId ?? '',
      index: indexName,
      dataView,
      skip: shouldSkipSearch,
    });

    if (isDataViewLoading) {
      return (
        <EuiPanel hasBorder={false} hasShadow={false}>
          <EuiCallOut announceOnMount data-test-subj="analyzer-event-overview-loading">
            <EuiLoadingSpinner size="m" />{' '}
            {i18n.translate('xpack.securitySolution.analyzer.eventOverviewFlyout.loading', {
              defaultMessage: 'Loading…',
            })}
          </EuiCallOut>
        </EuiPanel>
      );
    }

    if (isDataViewInvalid) {
      return (
        <EuiCallOut
          announceOnMount
          color="danger"
          iconType="warning"
          title={DATA_VIEW_ERROR}
          data-test-subj="analyzer-event-overview-data-view-error"
        />
      );
    }

    if (requestState === ElasticRequestState.Found && hit) {
      return <OverviewTab hit={hit} renderCellActions={renderCellActions} />;
    }

    if (requestState === ElasticRequestState.NotFound) {
      return (
        <EuiCallOut
          announceOnMount
          color="danger"
          iconType="warning"
          title={DOCUMENT_NOT_FOUND}
          data-test-subj="analyzer-event-overview-not-found"
        />
      );
    }

    if (requestState === ElasticRequestState.Error) {
      return (
        <EuiCallOut
          announceOnMount
          color="danger"
          iconType="warning"
          title={FETCH_ERROR}
          data-test-subj="analyzer-event-overview-fetch-error"
        />
      );
    }

    return (
      <EuiPanel hasBorder={false} hasShadow={false}>
        <EuiCallOut data-test-subj="analyzer-event-overview-loading">
          <EuiLoadingSpinner size="m" />{' '}
          {i18n.translate('xpack.securitySolution.analyzer.eventOverviewFlyout.loadingFallback', {
            defaultMessage: 'Loading…',
          })}
        </EuiCallOut>
      </EuiPanel>
    );
  }
);

OverviewTabWrapper.displayName = 'EventOverviewFlyoutContent';
