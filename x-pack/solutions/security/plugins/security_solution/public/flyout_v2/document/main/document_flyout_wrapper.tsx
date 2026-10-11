/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { EuiFlyoutBody } from '@elastic/eui';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { getFieldValue } from '@kbn/discover-utils';
import { EVENT_KIND } from '@kbn/rule-data-utils';
import type { CellActionRenderer } from '../../shared/components/cell_actions';
import { useAlertsPrivileges } from '../../../detections/containers/detection_engine/alerts/use_alerts_privileges';
import { useResolvedDocument } from './hooks/use_resolved_document';
import { FlyoutMissingAlertsPrivilege } from './components/flyout_missing_alerts_privilege';
import {
  DocumentPaginationHeader,
  DocumentPaginationLoading,
} from './components/document_pagination';
import { DataViewDegradedCallout } from '../../../data_view_manager/components/data_view_degraded_callout';
import { PageScope } from '../../../data_view_manager/constants';
import { useDataView } from '../../../data_view_manager/hooks/use_data_view';
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

const FETCH_ERROR = i18n.translate(
  'xpack.securitySolution.flyout.document.overviewWrapper.fetchError',
  {
    defaultMessage: 'Unable to fetch document details.',
  }
);

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
   * A function that renders cell actions for the overview tab.
   */
  renderCellActions: CellActionRenderer;
  /**
   * Callback invoked after alert mutations to refresh parent and current flyouts.
   */
  onAlertUpdated: () => void;
  /**
   * Optional test subject forwarded to the document flyout header without adding a layout wrapper.
   */
  dataTestSubj?: string;
}

/**
 * Wrapper for the DocumentFlyout component that handles fetching the document
 * based on the provided document ID and index name, and manages loading and error states.
 * It is currently used in Analyzer when opening a document from the detail panel.
 */
export const DocumentFlyoutWrapper = memo((props: DocumentFlyoutWrapperProps) => (
  // Remounted per document so the document search never serves the previous document's hit.
  <DocumentFlyoutWrapperContent
    key={`${props.documentId ?? ''}\0${props.indexName ?? ''}`}
    {...props}
  />
));

DocumentFlyoutWrapper.displayName = 'DocumentFlyoutWrapper';

const DocumentFlyoutWrapperContent = memo(
  ({
    documentId,
    indexName,
    renderCellActions,
    onAlertUpdated,
    dataTestSubj,
  }: DocumentFlyoutWrapperProps) => {
    const { dataView, status: dataViewStatus } = useDataView(PageScope.default);

    const isDataViewLoading = dataViewStatus === 'loading' || dataViewStatus === 'pristine';
    const isDataViewInvalid = dataViewStatus === 'error';
    const isDataViewDegraded = dataViewStatus === 'ready' && !dataView.hasMatchedIndices();
    const shouldSkipSearch = useMemo(
      () => isDataViewLoading || isDataViewInvalid || !documentId || !indexName || !dataView,
      [dataView, documentId, indexName, isDataViewInvalid, isDataViewLoading]
    );

    const { status, hit, refetch } = useResolvedDocument({
      documentId,
      indexName,
      dataView,
      skip: shouldSkipSearch,
    });

    const handleAlertUpdated = useCallback(() => {
      onAlertUpdated();
      refetch();
    }, [onAlertUpdated, refetch]);

    const isAlert = useMemo(
      () => status === 'found' && (getFieldValue(hit, EVENT_KIND) as string) === EventKind.signal,
      [hit, status]
    );

    const { hasAlertsRead, loading: isAlertsPrivilegesLoading } = useAlertsPrivileges();
    const missingAlertsPrivilege = isAlert && !isAlertsPrivilegesLoading && !hasAlertsRead;

    if (
      isDataViewLoading ||
      (isAlert && isAlertsPrivilegesLoading) ||
      (!shouldSkipSearch && status === 'loading')
    ) {
      return <DocumentPaginationLoading data-test-subj="document-overview-wrapper-loading" />;
    }

    if (missingAlertsPrivilege) {
      return <FlyoutMissingAlertsPrivilege />;
    }

    if (isDataViewInvalid) {
      return (
        <KbnDangerCallout
          announceOnMount
          title={DATA_VIEW_ERROR}
          data-test-subj="document-overview-wrapper-data-view-error"
        />
      );
    }

    if (status === 'found') {
      return (
        <>
          {isDataViewDegraded && (
            <DataViewDegradedCallout
              compact
              dataView={dataView}
              data-test-subj="document-overview-wrapper-data-view-degraded"
            >
              <FormattedMessage
                id="xpack.securitySolution.flyout.document.overviewWrapper.dataViewDegradedDetailsDescription"
                defaultMessage="The document is still shown below, but field-dependent features may be limited."
              />
            </DataViewDegradedCallout>
          )}
          <DocumentFlyout
            hit={hit}
            renderCellActions={renderCellActions}
            onAlertUpdated={handleAlertUpdated}
            dataTestSubj={dataTestSubj}
          />
        </>
      );
    }

    if (status === 'notFound' || status === 'error') {
      const isNotFound = status === 'notFound';
      return (
        <>
          <DocumentPaginationHeader />
          <EuiFlyoutBody>
            <KbnDangerCallout
              announceOnMount
              title={isNotFound ? DOCUMENT_NOT_FOUND : FETCH_ERROR}
              data-test-subj={
                isNotFound ? 'document-overview-wrapper-not-found' : 'document-overview-fetch-error'
              }
            />
          </EuiFlyoutBody>
        </>
      );
    }

    return null;
  }
);

DocumentFlyoutWrapperContent.displayName = 'DocumentFlyoutWrapperContent';
