/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { EuiFlyoutBody, EuiFlyoutFooter, EuiFlyoutHeader } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';
import { useStore } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { defaultToolsFlyoutProperties } from '../../shared/hooks/use_default_flyout_properties';
import { flyoutProviders } from '../../shared/components/flyout_provider';
import { NotesDetails } from '../../shared/tools/notes';
import { useTabs } from '../../shared/hooks/use_tabs';
import { useKibana } from '../../../common/lib/kibana';
import { Header } from './header';
import { getTabsDisplayed, validTabIds } from './tabs';
import type { TabId } from './tabs';
import { FLYOUT_STORAGE_KEYS } from './constants/local_storage';
import { Footer } from './footer';

export interface AttackFlyoutProps {
  /**
   * The attack document to display.
   */
  hit: DataTableRecord;
  /**
   * The attack discovery alert object resolved from the same fetch as `hit`.
   * Owned by `AttackFlyoutWrapper` so the flyout has a single source of truth.
   */
  attack: AttackDiscoveryAlert;
  /**
   * Callback invoked after attack mutations (status change, assignee update, etc.).
   * Provided by `AttackFlyoutWrapper`; it refetches the attack document so the
   * flyout UI reflects the mutation without the user having to close and re-open it,
   * and notifies the surface that opened the flyout to refresh as well.
   */
  onAttackUpdated: () => void;
}

/**
 * Content for the v2 attack flyout. Receives a fully-resolved `hit` and `attack`
 * from `AttackFlyoutWrapper` (which owns the single data fetch) and renders the
 * header, overview tab, and footer.
 */
export const AttackFlyout = memo(({ hit, attack, onAttackUpdated }: AttackFlyoutProps) => {
  const { services } = useKibana();
  const { overlays } = services;
  const store = useStore();
  const history = useHistory();

  const { selectedTabId, setSelectedTabId } = useTabs<TabId>({
    validTabIds,
    storageKey: FLYOUT_STORAGE_KEYS.RIGHT_PANEL_SELECTED_TABS,
  });

  const tabs = useMemo(() => getTabsDisplayed({ hit }), [hit]);

  const onShowNotes = useCallback(() => {
    overlays.openSystemFlyout(
      flyoutProviders({
        services,
        store,
        history,
        children: <NotesDetails hit={hit} />,
      }),
      defaultToolsFlyoutProperties
    );
  }, [history, hit, overlays, services, store]);

  return (
    <>
      <EuiFlyoutHeader data-test-subj="attack-flyout-header">
        <Header
          hit={hit}
          onAttackUpdated={onAttackUpdated}
          onShowNotes={onShowNotes}
          tabs={tabs}
          selectedTabId={selectedTabId}
          setSelectedTabId={setSelectedTabId}
        />
      </EuiFlyoutHeader>
      <EuiFlyoutBody data-test-subj="attack-flyout-body">
        <div css={{ height: '100%' }}>{tabs.find((tab) => tab.id === selectedTabId)?.content}</div>
      </EuiFlyoutBody>
      <EuiFlyoutFooter data-test-subj="attack-flyout-footer">
        <Footer attack={attack} hit={hit} onAttackUpdated={onAttackUpdated} />
      </EuiFlyoutFooter>
    </>
  );
});

AttackFlyout.displayName = 'AttackFlyout';
