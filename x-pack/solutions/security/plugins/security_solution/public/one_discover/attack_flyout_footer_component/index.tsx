/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import React, { useEffect, useState } from 'react';
import { Footer } from '../../flyout_v2/attack_details/main/footer';
import { useAttackDetails } from '../../flyout_v2/attack_details/main/hooks/use_attack_details';
import type { SecurityAppStore } from '../../common/store/types';
import type { StartServices } from '../../types';
import { flyoutProviders } from '../../flyout_v2/shared/components/flyout_provider';

export interface AttackFlyoutFooterProps {
  /**
   * The document record used to render the attack flyout footer.
   */
  hit: DataTableRecord;
  /**
   * A promise that resolves to the services required to render the attack flyout footer.
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

export const AttackFlyoutFooter = ({
  hit,
  servicesPromise,
  storePromise,
  onAlertUpdated,
}: AttackFlyoutFooterProps) => {
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
    children: <AttackFlyoutFooterContent hit={hit} onAlertUpdated={onAlertUpdated} />,
  });
};

interface AttackFlyoutFooterContentProps {
  hit: DataTableRecord;
  onAlertUpdated: () => void;
}

const AttackFlyoutFooterContent = ({ hit, onAlertUpdated }: AttackFlyoutFooterContentProps) => {
  const { attack, refetch, loading } = useAttackDetails(hit, { refresh: onAlertUpdated });

  if (loading || !attack) {
    return null;
  }

  return (
    <div data-test-subj="discover-attack-flyout-footer">
      <Footer hit={hit} attack={attack} refetch={refetch} />
    </div>
  );
};
