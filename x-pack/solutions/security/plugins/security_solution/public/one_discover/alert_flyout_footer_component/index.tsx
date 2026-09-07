/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import React, { useCallback, useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { DOC_VIEWER_FLYOUT_HISTORY_KEY } from '@kbn/unified-doc-viewer';
import { useDefaultToolsFlyoutProperties } from '../../flyout_v2/shared/hooks/use_default_flyout_properties';
import { Footer } from '../../flyout_v2/document/main/footer';
import { documentFlyoutHistoryKey } from '../../flyout_v2/shared/constants/flyout_history';
import type { SecurityAppStore } from '../../common/store/types';
import type { StartServices } from '../../types';
import { NotesDetails } from '../../flyout_v2/shared/tools/notes';
import { flyoutProviders } from '../../flyout_v2/shared/components/flyout_provider';
import { useIsInSecurityApp } from '../../common/hooks/is_in_security_app';
import { formatFlyoutTitle, NOTES_TITLE } from '../../flyout_v2/shared/constants/flyout_titles';
import { getDocumentTitle } from '../../flyout_v2/document/main/utils/get_header_title';
import {
  FLYOUT_ORIGIN,
  FLYOUT_SESSION_KIND,
  FLYOUT_SURFACE,
  FLYOUT_TOOL,
  FLYOUT_TYPE,
} from '../../common/lib/telemetry';
import { trackFlyoutOpen } from '../../flyout_v2/shared/hooks/use_flyout_telemetry';

export interface AlertFlyoutFooterProps {
  /**
   * The document record used to render the flyout footer.
   */
  hit: DataTableRecord;
  /**
   * A promise that resolves to the services required to render the flyout footer.
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

export const AlertFlyoutFooter = ({
  hit,
  servicesPromise,
  storePromise,
  onAlertUpdated,
}: AlertFlyoutFooterProps) => {
  const history = useHistory();
  const [services, setServices] = useState<StartServices | null>(null);
  const [store, setStore] = useState<SecurityAppStore | null>(null);
  const isSecurityApp = useIsInSecurityApp();
  const historyKey = isSecurityApp ? documentFlyoutHistoryKey : DOC_VIEWER_FLYOUT_HISTORY_KEY;
  const defaultToolsFlyoutProperties = useDefaultToolsFlyoutProperties();

  const openNotesFlyout = useCallback(() => {
    if (!services || !store) {
      return;
    }

    const ref = services.overlays?.openSystemFlyout(
      flyoutProviders({
        services,
        store,
        history,
        children: <NotesDetails hit={hit} />,
      }),
      {
        ...defaultToolsFlyoutProperties,
        historyKey,
        session: FLYOUT_SESSION_KIND.START,
        title: formatFlyoutTitle(NOTES_TITLE, getDocumentTitle(hit)),
      }
    );
    if (ref) {
      trackFlyoutOpen(services.telemetry, ref, {
        surface: FLYOUT_SURFACE.TOOL,
        flyoutType: FLYOUT_TYPE.DOCUMENT,
        tool: FLYOUT_TOOL.NOTES,
        session: FLYOUT_SESSION_KIND.START,
        origin: FLYOUT_ORIGIN.FOOTER_TAKE_ACTION,
      });
    }
  }, [defaultToolsFlyoutProperties, history, historyKey, hit, services, store]);

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
    children: <Footer hit={hit} onAlertUpdated={onAlertUpdated} onShowNotes={openNotesFlyout} />,
  });
};
