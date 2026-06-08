/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import { getFieldValue } from '@kbn/discover-utils';
import { EuiSpacer } from '@elastic/eui';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { SecurityAppStore } from '../../common/store/types';
import type { StartServices } from '../../types';
import { flyoutProviders } from '../../flyout_v2/shared/components/flyout_provider';
import { useAttackDetails } from '../../flyout/attack_details/hooks/use_attack_details';
import { FlyoutLoading } from '../../flyout_v2/shared/components/flyout_loading';
import { OverviewTab } from '../../flyout_v2/attack/main/tabs/overview_tab';

export interface AttackFlyoutOverviewTabProps {
  hit: DataTableRecord;
  servicesPromise: Promise<StartServices>;
  storePromise: Promise<SecurityAppStore>;
  onAttackUpdated: () => void;
}

export const AttackFlyoutOverviewTab = ({
  hit,
  servicesPromise,
  storePromise,
  onAttackUpdated,
}: AttackFlyoutOverviewTabProps) => {
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
    children: <AttackFlyoutOverviewTabContent hit={hit} onAttackUpdated={onAttackUpdated} />,
  });
};

interface AttackFlyoutOverviewTabContentProps {
  hit: DataTableRecord;
  onAttackUpdated: () => void;
}

/**
 * Rendered inside flyoutProviders so it has access to the Redux store and services
 * needed by useAttackDetails. Fetches the attack independently (Discover double-fetch
 * tradeoff — accepted per spec).
 *
 * Also refetches when Discover hands us a new `hit` so that a mutation triggered
 * from another section (e.g. status change in the header) reaches the overview tab
 * on the very next Discover refresh, instead of leaving InsightsSection rendering
 * the pre-mutation attack.
 */
const AttackFlyoutOverviewTabContent = ({
  hit,
  onAttackUpdated,
}: AttackFlyoutOverviewTabContentProps) => {
  const attackId = getFieldValue(hit, '_id') as string | undefined;
  const indexName = getFieldValue(hit, '_index') as string | undefined;
  const { attack, loading, refetch } = useAttackDetails({ attackId, indexName });

  // Discover refreshes the row after every mutation; refetch the attack whenever
  // a new hit reference comes in so any section's mutation propagates to the
  // overview tab. The first-render guard avoids a redundant duplicate fetch on
  // mount, since `useAttackDetails` already fetches on its own initial render.
  const isFirstRenderRef = useRef(true);
  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }
    refetch();
  }, [hit, refetch]);

  const handleAttackUpdated = useCallback(() => {
    onAttackUpdated();
    refetch();
  }, [onAttackUpdated, refetch]);

  if (loading) {
    return <FlyoutLoading data-test-subj="attack-flyout-overview-tab-loading" />;
  }

  if (!attack) {
    return null;
  }

  return (
    <>
      <EuiSpacer size="m" />
      <OverviewTab hit={hit} attack={attack} onAttackUpdated={handleAttackUpdated} />
    </>
  );
};
