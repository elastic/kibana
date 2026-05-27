/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { useStore } from 'react-redux';

import { useAttackHit } from '../../../flyout/attack_details/hooks/use_attack_hit';
import { useKibana } from '../../../common/lib/kibana';
import { FlyoutError } from '../../shared/components/flyout_error';
import { FlyoutLoading } from '../../shared/components/flyout_loading';
import { cellActionRenderer } from '../../shared/components/cell_actions';
import { flyoutProviders } from '../../shared/components/flyout_provider';
import { NotesDetails } from '../../shared/tools/notes';
import { documentFlyoutHistoryKey } from '../../shared/constants/flyout_history';
import { defaultToolsFlyoutProperties } from '../../shared/hooks/use_default_flyout_properties';
import { AttackDetails } from '.';

export interface AttackDetailsFlyoutProps {
  /**
   * Attack-discovery alert `_id` to load. Forwarded to {@link useAttackHit}.
   */
  attackId: string;
  /**
   * Index pattern that contains the attack-discovery alert. Forwarded to
   * {@link useAttackHit}.
   */
  indexName: string;
  /**
   * Optional override for the alert-mutation callback. When omitted, the
   * component refetches the attack-discovery document itself so the next
   * render reflects the new state. Pass a custom callback when the parent
   * surface (e.g. the Attacks page table) needs to refresh other views
   * after a mutation.
   */
  onAlertUpdated?: () => void;
}

/**
 * Thin wrapper that fetches an attack-discovery document via
 * {@link useAttackHit} and renders the v2 {@link AttackDetails} surface
 * inside a system flyout. Used by the V2 Attacks-page openers
 * (page deep-link, KPI panel, table grouping) when
 * `newFlyoutSystemEnabled` is on.
 *
 * Mirrors the legacy `flyout/attack_details/index.tsx` wrapper but for the
 * v2 surface.
 */
export const AttackDetailsFlyout: FC<AttackDetailsFlyoutProps> = memo(
  ({ attackId, indexName, onAlertUpdated }) => {
    const { services } = useKibana();
    const { overlays } = services;
    const store = useStore();
    const history = useHistory();
    const { hit, loading, refetch } = useAttackHit(attackId, indexName);

    const onShowNotes = useCallback(() => {
      if (!hit) return;
      overlays.openSystemFlyout(
        flyoutProviders({
          services,
          store,
          history,
          children: <NotesDetails hit={hit} />,
        }),
        {
          ...defaultToolsFlyoutProperties,
          historyKey: documentFlyoutHistoryKey,
        }
      );
    }, [hit, history, overlays, services, store]);

    if (loading) return <FlyoutLoading />;
    if (!hit) return <FlyoutError />;

    return (
      <AttackDetails
        hit={hit}
        onShowNotes={onShowNotes}
        renderCellActions={cellActionRenderer}
        onAlertUpdated={onAlertUpdated ?? refetch}
      />
    );
  }
);
AttackDetailsFlyout.displayName = 'AttackDetailsFlyout';
