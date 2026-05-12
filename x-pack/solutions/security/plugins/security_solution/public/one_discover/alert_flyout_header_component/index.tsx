/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import React, { useCallback, useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { DOC_VIEWER_FLYOUT_HISTORY_KEY } from '@kbn/unified-doc-viewer';
import type { CellActionRenderer } from '../../flyout_v2/shared/components/cell_actions';
import { defaultToolsFlyoutProperties } from '../../flyout_v2/shared/hooks/use_default_flyout_properties';
import { RemoteDocumentCallout } from '../../flyout_v2/document/components/remote_document_callout';
import type { SecurityAppStore } from '../../common/store/types';
import type { StartServices } from '../../types';
import { Header } from '../../flyout_v2/document/header';
import { documentFlyoutHistoryKey } from '../../flyout_v2/shared/constants/flyout_history';
import { NotesDetails } from '../../flyout_v2/notes';
import { flyoutProviders } from '../../flyout_v2/shared/components/flyout_provider';
import { useIsInSecurityApp } from '../../common/hooks/is_in_security_app';
import { DiscoverCellActions } from '../cell_actions';

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
  /**
   * Current Discover columns shown in the doc viewer.
   */
  columns?: DocViewRenderProps['columns'];
  /**
   * Discover filter callback used by flyout cell actions.
   */
  filter?: DocViewRenderProps['filter'];
  /**
   * Callback used to add a column to the Discover table.
   */
  onAddColumn?: DocViewRenderProps['onAddColumn'];
  /**
   * Callback used to remove a column from the Discover table.
   */
  onRemoveColumn?: DocViewRenderProps['onRemoveColumn'];
}

export const AlertFlyoutHeader = ({
  hit,
  servicesPromise,
  storePromise,
  onAlertUpdated,
  columns,
  filter,
  onAddColumn,
  onRemoveColumn,
}: AlertFlyoutHeaderProps) => {
  const history = useHistory();
  const [services, setServices] = useState<StartServices | null>(null);
  const [store, setStore] = useState<SecurityAppStore | null>(null);
  const isSecurityApp = useIsInSecurityApp();
  const historyKey = isSecurityApp ? documentFlyoutHistoryKey : DOC_VIEWER_FLYOUT_HISTORY_KEY;
  const renderCellActions = useCallback<CellActionRenderer>(
    (props) => (
      <DiscoverCellActions
        {...props}
        columns={columns}
        filter={filter}
        onAddColumn={onAddColumn}
        onRemoveColumn={onRemoveColumn}
      />
    ),
    [columns, filter, onAddColumn, onRemoveColumn]
  );

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

  if (!services || !store) {
    return null;
  }

  const isMissingMetadata = !hit.raw._id || !hit.raw._index;

  return (
    <>
      {isMissingMetadata ? (
        <>
          <EuiCallOut announceOnMount size="s" title={MISSING_METADATA_CALLOUT} />
          <EuiSpacer size="s" />
        </>
      ) : null}
      {flyoutProviders({
        services,
        store,
        children: (
          <>
            <RemoteDocumentCallout hit={hit}>
              <EuiSpacer size="s" />
            </RemoteDocumentCallout>
            <Header
              hit={hit}
              renderCellActions={renderCellActions}
              onAlertUpdated={onAlertUpdated}
              onShowNotes={openNotesFlyout}
            />
          </>
        ),
      })}
    </>
  );
};
