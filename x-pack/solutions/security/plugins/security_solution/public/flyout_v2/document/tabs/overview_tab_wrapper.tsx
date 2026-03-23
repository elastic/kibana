/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ElasticRequestState } from '@kbn/unified-doc-viewer';
import { useEsDocSearch } from '@kbn/unified-doc-viewer-plugin/public';
import { getFieldValue } from '@kbn/discover-utils';
import { EVENT_KIND } from '@kbn/rule-data-utils';
import type { ResolverCellActionRenderer } from '../../../resolver/types';
import { useDataView } from '../../../data_view_manager/hooks/use_data_view';
import { PageScope } from '../../../data_view_manager/constants';
import { OverviewTab } from './overview_tab';
import { useAlertsPrivileges } from '../../../detections/containers/detection_engine/alerts/use_alerts_privileges';
import { FlyoutLoading } from '../../../flyout/shared/components/flyout_loading';
import { FlyoutMissingAlertsPrivilege } from '../../../flyout/shared/components/flyout_missing_alerts_privilege';
import { EventKind } from '../constants/event_kinds';

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

    const isAlert = useMemo(
      () => hit && (getFieldValue(hit, EVENT_KIND) as string) === EventKind.signal,
      [hit]
    );

    const { hasAlertsRead, loading: isAlertsPrivilegesLoading } = useAlertsPrivileges();
    const missingAlertsPrivilege = isAlert && !isAlertsPrivilegesLoading && !hasAlertsRead;

    if (
      isDataViewLoading ||
      (isAlert && isAlertsPrivilegesLoading) ||
      requestState === ElasticRequestState.Loading
    ) {
      return <FlyoutLoading data-test-subj="document-overview-wrapper-loading" />;
    }

    if (missingAlertsPrivilege) {
      return <FlyoutMissingAlertsPrivilege />;
    }

    if (isDataViewInvalid) {
      return (
        <EuiCallOut
          announceOnMount
          color="danger"
          iconType="warning"
          title={DATA_VIEW_ERROR}
          data-test-subj="document-overview-wrapper-data-view-error"
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
          data-test-subj="document-overview-wrapper-not-found"
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
          data-test-subj="document-overview-fetch-error"
        />
      );
    }

    return (
      <EuiCallOut
        announceOnMount
        color="danger"
        iconType="warning"
        title={SOMETHING_WENT_WRONG}
        data-test-subj="document-overview-something-went-wrong"
      />
    );
  }
);

OverviewTabWrapper.displayName = 'EventOverviewFlyoutContent';
