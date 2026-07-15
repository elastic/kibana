/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import {
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiTab,
  EuiTabs,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';
import { UnifiedDocViewer } from '@kbn/unified-doc-viewer-plugin/public';
import type { CellActionRenderer } from '../../shared/components/cell_actions';
import { cellActionRenderer } from '../../shared/components/cell_actions';
import { JsonTab as SharedJsonTab } from '../../shared/components/json_tab';
import { useSharedToolsFlyoutApi } from '../../shared/tools/use_shared_tools_flyout_api';
import { useTabs } from '../../shared/hooks/use_tabs';
import { useIsInSecurityApp } from '../../../common/hooks/is_in_security_app';
import { Header } from './header';
import { OverviewTab } from './tabs/overview_tab';
import { TableTab } from './tabs/table_tab';
import { FLYOUT_STORAGE_KEYS } from './constants/local_storage';
import { Footer } from './footer';

type AttackFlyoutTabId = 'overview' | 'table' | 'json';

const VALID_TAB_IDS: AttackFlyoutTabId[] = ['overview', 'table', 'json'];

export const OVERVIEW_TAB_TEST_ID = 'attack-flyout-overview-tab-button';
export const TABLE_TAB_TEST_ID = 'attack-flyout-table-tab-button';
export const JSON_TAB_TEST_ID = 'attack-flyout-json-tab-button';
export const JSON_TAB_CONTENT_TEST_ID = 'attack-flyout-json-tab';

const OVERVIEW_TAB_LABEL = i18n.translate('xpack.securitySolution.flyout.attack.overviewTabLabel', {
  defaultMessage: 'Overview',
});
const TABLE_TAB_LABEL = i18n.translate('xpack.securitySolution.flyout.attack.tableTabLabel', {
  defaultMessage: 'Table',
});
const JSON_TAB_LABEL = i18n.translate('xpack.securitySolution.flyout.attack.jsonTabLabel', {
  defaultMessage: 'JSON',
});

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
  /**
   * Renderer for cell actions in this flyout and nested alert flyouts.
   */
  renderCellActions?: CellActionRenderer;
  /**
   * Data view used by the underlying document viewer.
   */
  dataView: DataView;
}

/**
 * Content for the v2 attack flyout. Receives a fully-resolved `hit` and `attack`
 * from `AttackFlyoutWrapper` (which owns the single data fetch) and renders the
 * header, overview tab, and footer.
 */
export const AttackFlyout = memo(
  ({
    hit,
    attack,
    onAttackUpdated,
    renderCellActions = cellActionRenderer,
    dataView,
  }: AttackFlyoutProps) => {
    const { openNotes } = useSharedToolsFlyoutApi();
    const isSecurityApp = useIsInSecurityApp();

    // The selected tab is persisted to localStorage, sharing the key with the legacy
    // attack flyout so the user's preference carries across both implementations.
    const { selectedTabId, setSelectedTabId } = useTabs<AttackFlyoutTabId>({
      validTabIds: VALID_TAB_IDS,
      storageKey: FLYOUT_STORAGE_KEYS.SELECTED_TAB,
    });

    const onShowNotes = useCallback(() => {
      openNotes({ hit });
    }, [openNotes, hit]);

    // Overview, Table and JSON tabs rendered when the flyout is displayed in Security Solution
    const securityTabs = useMemo(
      () => (
        <>
          <EuiTabs>
            <EuiTab
              isSelected={selectedTabId === 'overview'}
              onClick={() => setSelectedTabId('overview')}
              data-test-subj={OVERVIEW_TAB_TEST_ID}
            >
              {OVERVIEW_TAB_LABEL}
            </EuiTab>
            <EuiTab
              isSelected={selectedTabId === 'table'}
              onClick={() => setSelectedTabId('table')}
              data-test-subj={TABLE_TAB_TEST_ID}
            >
              {TABLE_TAB_LABEL}
            </EuiTab>
            <EuiTab
              isSelected={selectedTabId === 'json'}
              onClick={() => setSelectedTabId('json')}
              data-test-subj={JSON_TAB_TEST_ID}
            >
              {JSON_TAB_LABEL}
            </EuiTab>
          </EuiTabs>
          <EuiSpacer size="m" />
        </>
      ),
      [selectedTabId, setSelectedTabId]
    );

    // Overview, Table and JSON tab contents rendered when the flyout is displayed in Security Solution
    // We're using our custom Security Solution document Table and JSON tabs
    const securityTabContents = useMemo(
      () => (
        <>
          {selectedTabId === 'table' ? (
            <TableTab hit={hit} renderCellActions={renderCellActions} />
          ) : selectedTabId === 'json' ? (
            <SharedJsonTab
              value={hit.raw as unknown as Record<string, unknown>}
              showFooterOffset={false}
              data-test-subj={JSON_TAB_CONTENT_TEST_ID}
            />
          ) : (
            <OverviewTab
              hit={hit}
              onAttackUpdated={onAttackUpdated}
              renderCellActions={renderCellActions}
            />
          )}
        </>
      ),
      [hit, onAttackUpdated, renderCellActions, selectedTabId]
    );

    // Overview, Table and JSON tabs rendered when the flyout is displayed in Discover
    // We're then using the Discover Table and JSON tabs
    const discoverContent = useMemo(
      () => (
        <UnifiedDocViewer
          key={hit.id}
          hit={hit}
          dataView={dataView}
          columns={Object.keys(hit.flattened)}
          onAddColumn={() => {}}
          onRemoveColumn={() => {}}
          docViewsRegistry={(registry) => {
            registry.add({
              id: 'doc_view_attack_overview',
              title: OVERVIEW_TAB_LABEL,
              order: 0,
              render: () => (
                <>
                  <EuiSpacer size="m" />
                  <OverviewTab
                    hit={hit}
                    onAttackUpdated={onAttackUpdated}
                    renderCellActions={renderCellActions}
                  />
                </>
              ),
            });
            return registry;
          }}
        />
      ),
      [dataView, hit, onAttackUpdated, renderCellActions]
    );

    return (
      <>
        <EuiFlyoutHeader data-test-subj="attack-flyout-header">
          <Header hit={hit} onAttackUpdated={onAttackUpdated} onShowNotes={onShowNotes} />
        </EuiFlyoutHeader>
        <EuiFlyoutBody data-test-subj="attack-flyout-body">
          {isSecurityApp ? (
            <>
              {securityTabs}
              {securityTabContents}
            </>
          ) : (
            <>{discoverContent}</>
          )}
        </EuiFlyoutBody>
        <EuiFlyoutFooter data-test-subj="attack-flyout-footer">
          <Footer attack={attack} hit={hit} onAttackUpdated={onAttackUpdated} />
        </EuiFlyoutFooter>
      </>
    );
  }
);

AttackFlyout.displayName = 'AttackFlyout';
