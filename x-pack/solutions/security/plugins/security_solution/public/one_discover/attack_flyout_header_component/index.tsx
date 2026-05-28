/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import React, { useCallback, useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useStore } from 'react-redux';
import { DOC_VIEWER_FLYOUT_HISTORY_KEY } from '@kbn/unified-doc-viewer';
import { HeaderTitle } from '../../flyout_v2/attack_details/main/components/header_title';
import { useAttackDetails } from '../../flyout_v2/attack_details/main/hooks/use_attack_details';
import { defaultToolsFlyoutProperties } from '../../flyout_v2/shared/hooks/use_default_flyout_properties';
import type { SecurityAppStore } from '../../common/store/types';
import type { StartServices } from '../../types';
import { documentFlyoutHistoryKey } from '../../flyout_v2/shared/constants/flyout_history';
import { NotesDetails } from '../../flyout_v2/shared/tools/notes';
import { flyoutProviders } from '../../flyout_v2/shared/components/flyout_provider';
import { useIsInSecurityApp } from '../../common/hooks/is_in_security_app';
import { useKibana } from '../../common/lib/kibana';

export interface AttackFlyoutHeaderProps {
  /**
   * The document record used to render the attack flyout header.
   */
  hit: DataTableRecord;
  /**
   * A promise that resolves to the services required to render the attack flyout header.
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

export const AttackFlyoutHeader = ({
  hit,
  servicesPromise,
  storePromise,
  onAlertUpdated: _onAlertUpdated,
}: AttackFlyoutHeaderProps) => {
  const [services, setServices] = useState<StartServices | null>(null);
  const [store, setStore] = useState<SecurityAppStore | null>(null);

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
    children: <AttackFlyoutHeaderContent hit={hit} />,
  });
};

interface AttackFlyoutHeaderContentProps {
  hit: DataTableRecord;
}

const AttackFlyoutHeaderContent = ({ hit }: AttackFlyoutHeaderContentProps) => {
  const { services } = useKibana();
  const store = useStore();
  const history = useHistory();
  const isSecurityApp = useIsInSecurityApp();
  const historyKey = isSecurityApp ? documentFlyoutHistoryKey : DOC_VIEWER_FLYOUT_HISTORY_KEY;

  const { browserFields, dataFormattedForFieldBrowser, refetch, loading } = useAttackDetails(hit);

  const openNotesFlyout = useCallback(() => {
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

  if (loading || !dataFormattedForFieldBrowser) {
    return null;
  }

  return (
    <div data-test-subj="discover-attack-flyout-header">
      <HeaderTitle
        hit={hit}
        browserFields={browserFields}
        dataFormattedForFieldBrowser={dataFormattedForFieldBrowser}
        refetch={refetch}
        onShowNotes={openNotesFlyout}
      />
    </div>
  );
};
