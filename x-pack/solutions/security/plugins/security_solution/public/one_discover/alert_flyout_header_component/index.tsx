/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import { ElasticRequestState } from '@kbn/unified-doc-viewer';
import { useEsDocSearch } from '@kbn/unified-doc-viewer-plugin/public';
import type { SecurityAppStore } from '../../common/store/types';
import type { StartServices } from '../../types';
import { Header } from '../../flyout_v2/document/header';
import { noopCellActionRenderer } from '../../flyout_v2/shared/components/cell_actions';
import { flyoutProviders } from '../../flyout_v2/shared/components/flyout_provider';
import { ONE_DISCOVER_SCOPE_ID } from '../constants';

export interface AlertFlyoutHeaderProps extends Pick<DocViewRenderProps, 'hit' | 'dataView'> {
  /**
   * The document record used to render the flyout header.
   */
  servicesPromise: Promise<StartServices>;
  /**
   * A promise that resolves to a Security Solution redux store for flyout rendering.
   */
  storePromise: Promise<SecurityAppStore>;
  /**
   * Optional callback invoked after alert mutations to refresh the Discover table.
   */
  onAlertUpdated?: () => void;
}

export const AlertFlyoutHeader = ({
  hit,
  dataView,
  servicesPromise,
  storePromise,
  onAlertUpdated,
}: AlertFlyoutHeaderProps) => {
  const [services, setServices] = useState<StartServices | null>(null);
  const [store, setStore] = useState<SecurityAppStore | null>(null);
  const [shouldFetchUpdatedHit, setShouldFetchUpdatedHit] = useState(false);

  const documentId = useMemo(() => hit.raw._id ?? hit.id, [hit]);
  const indexName = useMemo(() => hit.raw._index, [hit]);
  const skipRefetch = !documentId || !indexName || !dataView;

  const [requestState, refreshedHit, refetchDocument] = useEsDocSearch({
    id: documentId ?? '',
    index: indexName,
    dataView,
    skip: skipRefetch || !shouldFetchUpdatedHit,
  });

  const headerHit = useMemo(
    () => (requestState === ElasticRequestState.Found && refreshedHit ? refreshedHit : hit),
    [hit, refreshedHit, requestState]
  );
  const refetchRef = useRef(refetchDocument);
  refetchRef.current = refetchDocument;
  const activatedRef = useRef(false);

  const handleAlertUpdated = useCallback(() => {
    onAlertUpdated?.();

    if (skipRefetch) {
      return;
    }

    // useEsDocSearch starts with skip=true so the first mutation activates it
    // by flipping shouldFetchUpdatedHit. Subsequent mutations call refetch directly.
    if (activatedRef.current) {
      refetchRef.current();
    } else {
      activatedRef.current = true;
      setShouldFetchUpdatedHit(true);
    }
  }, [onAlertUpdated, skipRefetch]);

  useEffect(() => {
    let isCanceled = false;

    Promise.all([servicesPromise, storePromise])
      .then(([resolvedServices, resolvedStore]) => {
        if (isCanceled) {
          return;
        }

        setServices(resolvedServices);
        setStore(resolvedStore);
      })
      .catch(() => {
        if (!isCanceled) {
          setServices(null);
          setStore(null);
        }
      });

    return () => {
      isCanceled = true;
    };
  }, [servicesPromise, storePromise]);

  if (!services || !store) {
    return null;
  }

  return flyoutProviders({
    services,
    store,
    children: (
      <Header
        hit={headerHit}
        scopeId={ONE_DISCOVER_SCOPE_ID}
        renderCellActions={noopCellActionRenderer}
        onAlertUpdated={handleAlertUpdated}
      />
    ),
  });
};
