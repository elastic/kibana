/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { EuiCallOut } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/public';
import { i18n } from '@kbn/i18n';
import { ElasticRequestState } from '@kbn/unified-doc-viewer';
import { useEsDocSearch } from '@kbn/unified-doc-viewer-plugin/public';
import { getFieldValue } from '@kbn/discover-utils';
import { EVENT_KIND } from '@kbn/rule-data-utils';
import type { CellActionRenderer } from '../shared/components/cell_actions';
import { useAlertsPrivileges } from '../../detections/containers/detection_engine/alerts/use_alerts_privileges';
import { FlyoutLoading } from '../../flyout/shared/components/flyout_loading';
import { FlyoutMissingAlertsPrivilege } from './components/flyout_missing_alerts_privilege';
import { useDataView } from '../../data_view_manager/hooks/use_data_view';
import { PageScope } from '../../data_view_manager/constants';
import { EventKind } from './constants/event_kinds';
import { DocumentFlyout } from '.';

const DATA_VIEW_ERROR = i18n.translate(
  'xpack.securitySolution.flyout.document.overviewWrapper.dataViewError',
  {
    defaultMessage: 'Unable to retrieve the data view for analyzer.',
  }
);

const DOCUMENT_NOT_FOUND = i18n.translate(
  'xpack.securitySolution.flyout.document.overviewWrapper.documentNotFound',
  {
    defaultMessage: 'Cannot find document. No documents match that ID.',
  }
);

const SOMETHING_WENT_WRONG = i18n.translate(
  'xpack.securitySolution.flyout.document.overviewWrapper.somethingWentWrong',
  {
    defaultMessage: 'Something went wrong.',
  }
);

const FETCH_ERROR = i18n.translate(
  'xpack.securitySolution.flyout.document.overviewWrapper.fetchError',
  {
    defaultMessage: 'Unable to fetch document details.',
  }
);

const DocumentFlyoutErrorState = ({
  title,
  testSubject,
}: {
  title: string;
  testSubject: string;
}) => (
  <EuiCallOut
    announceOnMount
    color="danger"
    iconType="warning"
    title={title}
    data-test-subj={testSubject}
  />
);

const getErrorStateProps = (requestState: ElasticRequestState) => {
  if (requestState === ElasticRequestState.NotFound) {
    return {
      title: DOCUMENT_NOT_FOUND,
      testSubject: 'document-overview-wrapper-not-found',
    };
  }

  if (requestState === ElasticRequestState.Error) {
    return {
      title: FETCH_ERROR,
      testSubject: 'document-overview-fetch-error',
    };
  }

  return {
    title: SOMETHING_WENT_WRONG,
    testSubject: 'document-overview-something-went-wrong',
  };
};

export interface DocumentFlyoutWrapperProps {
  /**
   * The ID of the document to display. This is required to fetch the document details.
   */
  documentId: string | undefined;
  /**
   * The name of the index that contains the document. This is required to fetch the document details.
   */
  indexName: string | undefined;
  /**
   * Security scope used for alert actions.
   */
  scopeId: string;
  /**
   * Optional data view to use when the caller already knows which one produced the row.
   */
  dataView?: DataView;
  /**
   * A function that renders cell actions for the overview tab.
   */
  renderCellActions: CellActionRenderer;
  /**
   * Optional callback invoked after alert mutations to refresh the hosting table.
   */
  onAlertUpdated?: () => void;
}

/**
 * Wrapper for the DocumentFlyout component that handles fetching the document
 * based on the provided document ID and index name, and manages loading and error states.
 * It is currently used in Analyzer when opening a document from the detail panel.
 */
export const DocumentFlyoutWrapper = memo(
  ({
    documentId,
    indexName,
    scopeId,
    dataView,
    renderCellActions,
    onAlertUpdated,
  }: DocumentFlyoutWrapperProps) => {
    const { dataView: fallbackDataView, status: fallbackStatus } = useDataView(PageScope.default);
    const activeDataView = dataView ?? fallbackDataView;
    const dataViewStatus = dataView ? 'ready' : fallbackStatus;

    const isDataViewLoading = dataViewStatus === 'loading' || dataViewStatus === 'pristine';
    const isDataViewInvalid =
      dataViewStatus === 'error' ||
      (dataViewStatus === 'ready' && !activeDataView.hasMatchedIndices());

    const shouldSkipSearch =
      isDataViewLoading || isDataViewInvalid || !documentId || !indexName || !activeDataView;

    const [requestState, hit, refetchDocument] = useEsDocSearch({
      id: documentId ?? '',
      index: indexName,
      dataView: activeDataView,
      skip: shouldSkipSearch,
    });
    const handleAlertUpdated = useCallback(() => {
      onAlertUpdated?.();
      refetchDocument();
    }, [onAlertUpdated, refetchDocument]);

    const isAlert = hit && (getFieldValue(hit, EVENT_KIND) as string) === EventKind.signal;

    const { hasAlertsRead, loading: isAlertsPrivilegesLoading } = useAlertsPrivileges();
    const missingAlertsPrivilege = isAlert && !isAlertsPrivilegesLoading && !hasAlertsRead;
    const isFlyoutLoading =
      isDataViewLoading || (!shouldSkipSearch && requestState === ElasticRequestState.Loading);

    if (isFlyoutLoading || (isAlert && isAlertsPrivilegesLoading)) {
      return <FlyoutLoading data-test-subj="document-overview-wrapper-loading" />;
    }

    if (missingAlertsPrivilege) {
      return <FlyoutMissingAlertsPrivilege />;
    }

    if (isDataViewInvalid) {
      return (
        <DocumentFlyoutErrorState
          title={DATA_VIEW_ERROR}
          testSubject="document-overview-wrapper-data-view-error"
        />
      );
    }

    if (requestState === ElasticRequestState.Found && hit) {
      return (
        <DocumentFlyout
          hit={hit}
          scopeId={scopeId}
          renderCellActions={renderCellActions}
          onAlertUpdated={handleAlertUpdated}
        />
      );
    }

    return <DocumentFlyoutErrorState {...getErrorStateProps(requestState)} />;
  }
);

DocumentFlyoutWrapper.displayName = 'DocumentFlyoutWrapper';
