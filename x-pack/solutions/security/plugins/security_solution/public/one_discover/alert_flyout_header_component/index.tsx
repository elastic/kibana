/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import React, { useCallback, useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { DOC_VIEWER_FLYOUT_HISTORY_KEY } from '@kbn/unified-doc-viewer';
import { defaultToolsFlyoutProperties } from '../../flyout_v2/shared/hooks/use_default_flyout_properties';
import { RemoteDocumentCallout } from '../../flyout_v2/document/components/remote_document_callout';
import type { SecurityAppStore } from '../../common/store/types';
import type { StartServices } from '../../types';
import { Header } from '../../flyout_v2/document/header';
import { alertFlyoutHistoryKey } from '../../flyout_v2/document/constants/flyout_history';
import { NotesDetails } from '../../flyout_v2/notes';
import { noopCellActionRenderer } from '../../flyout_v2/shared/components/cell_actions';
import { flyoutProviders } from '../../flyout_v2/shared/components/flyout_provider';
import { useIsInSecurityApp } from '../../common/hooks/is_in_security_app';

export const MISSING_METADATA_CALLOUT = i18n.translate(
  'xpack.securitySolution.flyout.document.header.missingMetadataCallout',
  {
    defaultMessage:
      'Some of the content below might not be loading correctly. To ensure the best experience, please add `METADATA _id,_index` to your query.',
  }
);

export interface AlertFlyoutHeaderProps {
  /**
   * The document record used to render the flyout header.
   */
  hit: DataTableRecord;
  /**
   * The document record used to render the flyout header.
   */
  servicesPromise: Promise<StartServices>;
  /**
   * A promise that resolves to a Security Solution redux store for flyout rendering.
   */
  storePromise: Promise<SecurityAppStore>;
  /**
   * Callback invoked after alert mutations to refresh the Discover table.
   */
  onAlertUpdated: () => void;
}

export const AlertFlyoutHeader = ({
  hit,
  servicesPromise,
  storePromise,
  onAlertUpdated,
}: AlertFlyoutHeaderProps) => {
  const history = useHistory();
  const [services, setServices] = useState<StartServices | null>(null);
  const [store, setStore] = useState<SecurityAppStore | null>(null);
  const isSecurityApp = useIsInSecurityApp();
  const historyKey = isSecurityApp ? alertFlyoutHistoryKey : DOC_VIEWER_FLYOUT_HISTORY_KEY;

  const openNotesFlyout = useCallback(() => {
    if (!services || !store) {
      return;
    }

    services.overlays?.openSystemFlyout(
      flyoutProviders({
        services,
        store,
        history,
        children: <NotesDetails hit={hit} />,
      }),
      {
        ...defaultToolsFlyoutProperties,
        historyKey,
      }
    );
  }, [history, historyKey, hit, services, store]);

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

  const isMissingMetadata = !hit.raw._id || !hit.raw._index;

  const metadataCallout = isMissingMetadata ? (
    <>
      <EuiCallOut announceOnMount size="s" title={MISSING_METADATA_CALLOUT} />
      <EuiSpacer size="s" />
    </>
  ) : null;
  const remoteDocumentCallout = (
    <RemoteDocumentCallout hit={hit}>
      <EuiSpacer size="s" />
    </RemoteDocumentCallout>
  );

  if (!services || !store) {
    return (
      <>
        {metadataCallout}
        {remoteDocumentCallout}
      </>
    );
  }

  return (
    <>
      {metadataCallout}
      {remoteDocumentCallout}
      {flyoutProviders({
        services,
        store,
        children: (
          <Header
            hit={hit}
            renderCellActions={noopCellActionRenderer}
            onAlertUpdated={onAlertUpdated}
            onShowNotes={openNotesFlyout}
          />
        ),
      })}
    </>
  );
};
