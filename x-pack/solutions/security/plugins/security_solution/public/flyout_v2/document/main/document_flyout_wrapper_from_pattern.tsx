/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { buildDataTableRecord, getFieldValue } from '@kbn/discover-utils';
import type { EsHitRecord } from '@kbn/discover-utils/types';
import { EVENT_KIND } from '@kbn/rule-data-utils';
import type { RunTimeMappings } from '../../../../common/api/search_strategy';
import { useAlertsPrivileges } from '../../../detections/containers/detection_engine/alerts/use_alerts_privileges';
import { useTimelineEventsDetails } from '../../../timelines/containers/details';
import { useDataView } from '../../../data_view_manager/hooks/use_data_view';
import { PageScope } from '../../../data_view_manager/constants';
import { FlyoutLoading } from '../../shared/components/flyout_loading';
import { FlyoutMissingAlertsPrivilege } from './components/flyout_missing_alerts_privilege';
import { EventKind } from './constants/event_kinds';
import { DocumentFlyout } from '.';
import type { DocumentFlyoutWrapperProps } from './document_flyout_wrapper';

const DATA_VIEW_ERROR = i18n.translate(
  'xpack.securitySolution.flyout.document.fromPatternWrapper.dataViewError',
  {
    defaultMessage: 'Unable to retrieve the data view for analyzer.',
  }
);

const DOCUMENT_NOT_FOUND = i18n.translate(
  'xpack.securitySolution.flyout.document.fromPatternWrapper.documentNotFound',
  {
    defaultMessage: 'Cannot find document. No documents match that ID.',
  }
);

/**
 * Same purpose as {@link DocumentFlyoutWrapper}, but for callers that only know the document id and
 * a broad index *pattern* (e.g. notes, where the document's concrete `_index` is not stored on the
 * note). Rather than the single-document ES search (which pins `_index` and therefore needs the
 * concrete index), it resolves the document from its id across the pattern using the timeline
 * events-details search strategy, then renders the same presentational `DocumentFlyout`.
 *
 * Public props are identical to `DocumentFlyoutWrapper`, so call sites can swap one for the other;
 * only the internal fetch strategy differs.
 */
export const DocumentFlyoutWrapperFromPattern = memo(
  ({ documentId, indexName, renderCellActions, onAlertUpdated }: DocumentFlyoutWrapperProps) => {
    const { dataView, status } = useDataView(PageScope.default);

    const isDataViewLoading = status === 'loading' || status === 'pristine';
    const isDataViewInvalid =
      status === 'error' || (status === 'ready' && !dataView.hasMatchedIndices());

    const shouldSkipSearch = useMemo(
      () => isDataViewLoading || isDataViewInvalid || !documentId || !indexName || !dataView,
      [dataView, documentId, indexName, isDataViewInvalid, isDataViewLoading]
    );

    const runtimeMappings = dataView?.getRuntimeMappings() as RunTimeMappings;

    const [loading, , searchHit, , refetchDocument] = useTimelineEventsDetails({
      indexName: indexName ?? '',
      eventId: documentId ?? '',
      runtimeMappings,
      skip: shouldSkipSearch,
    });

    const hit = useMemo(
      () => (searchHit ? buildDataTableRecord(searchHit as EsHitRecord) : undefined),
      [searchHit]
    );

    const handleAlertUpdated = useCallback(() => {
      onAlertUpdated();
      refetchDocument();
    }, [onAlertUpdated, refetchDocument]);

    const isAlert = useMemo(
      () => hit && (getFieldValue(hit, EVENT_KIND) as string) === EventKind.signal,
      [hit]
    );

    const { hasAlertsRead, loading: isAlertsPrivilegesLoading } = useAlertsPrivileges();
    const missingAlertsPrivilege = isAlert && !isAlertsPrivilegesLoading && !hasAlertsRead;

    if (isDataViewLoading || (isAlert && isAlertsPrivilegesLoading) || loading) {
      return <FlyoutLoading data-test-subj="document-from-pattern-wrapper-loading" />;
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
          data-test-subj="document-from-pattern-wrapper-data-view-error"
        />
      );
    }

    if (hit) {
      return (
        <DocumentFlyout
          hit={hit}
          renderCellActions={renderCellActions}
          onAlertUpdated={handleAlertUpdated}
        />
      );
    }

    return (
      <EuiCallOut
        announceOnMount
        color="danger"
        iconType="warning"
        title={DOCUMENT_NOT_FOUND}
        data-test-subj="document-from-pattern-wrapper-not-found"
      />
    );
  }
);
DocumentFlyoutWrapperFromPattern.displayName = 'DocumentFlyoutWrapperFromPattern';
