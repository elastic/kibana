/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import React, { useEffect, useState } from 'react';
import type { SecurityAppStore } from '../../common/store/types';
import type { StartServices } from '../../types';
import { Header } from '../../flyout_v2/attack/main/header';
import { flyoutProviders } from '../../flyout_v2/shared/components/flyout_provider';
import { FLYOUT_ORIGIN } from '../../common/lib/telemetry';
import { useOpenNotesFlyout } from '../use_open_notes_flyout';

export interface AttackFlyoutHeaderProps {
  hit: DataTableRecord;
  servicesPromise: Promise<StartServices>;
  storePromise: Promise<SecurityAppStore>;
  onAttackUpdated: () => void;
}

export const AttackFlyoutHeader = ({
  hit,
  servicesPromise,
  storePromise,
  onAttackUpdated,
}: AttackFlyoutHeaderProps) => {
  const [services, setServices] = useState<StartServices | null>(null);
  const [store, setStore] = useState<SecurityAppStore | null>(null);

  const openNotesFlyout = useOpenNotesFlyout({
    hit,
    services,
    store,
    origin: FLYOUT_ORIGIN.FLYOUT_HEADER,
  });

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
    children: <Header hit={hit} onAttackUpdated={onAttackUpdated} onShowNotes={openNotesFlyout} />,
  });
};
