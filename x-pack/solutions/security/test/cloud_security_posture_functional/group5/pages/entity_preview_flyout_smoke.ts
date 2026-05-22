/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * FTR (L4): one end-to-end smoke for the network-events graph entity preview
 * flyout.
 *
 * Sibling coverage:
 * - State machine (engine_type → panel-key + per-type name params): the L1
 *   colocated unit at
 *   `x-pack/solutions/security/packages/kbn-cloud-security-posture/graph/src/components/graph_grouped_node_preview_panel/hooks/use_open_entity_preview_panel.test.tsx`
 *   covers every host/user/service/generic/undefined branch with mocked
 *   `openPreviewPanel`.
 * - Popover wiring (single-entity click → onOpenEventPreview callback): the L1
 *   unit at `.../components/popovers/node_expand/use_entity_node_expand_popover.test.tsx`.
 * - Grouped-item link click → openPreviewPanel: the L1 unit at
 *   `.../graph_grouped_node_preview_panel/components/grouped_item/parts/header_row.test.tsx`.
 *
 * Rationale: multiple end-to-end smokes for the same feature is an
 * anti-pattern. Keep this file at exactly one `it(...)`. The L4-unique
 * signal here is the cross-package panel-key contract (the graph package
 * emits `'generic-entity-panel'` and the security_solution flyout registry
 * must register the same key) plus the entity store v2 LOOKUP JOIN data
 * path that feeds the graph in the network events page — neither is
 * mockable at L1.
 *
 * Replaces the previous `describe.skip`-ed `entity_preview_flyout.ts` (4
 * cases, failing under https://github.com/elastic/kibana/issues/261460).
 * Three of those four assertions reduced to engine_type dispatch — moved
 * to L1. The remaining cross-system signal is preserved here as one
 * canonical happy path. Single-generic path
 * (`mv-expand-target-storage` → `'generic-entity-panel'` with header
 * containing `MvExpandTargetStorage`) is the simplest reliable path
 * through the cross-package contract.
 *
 * #261460 root cause (diagnosed during this split, fixed below): the v2
 * entity-store archive (`entity_store_v2`) ships only the
 * `entities-generic-latest` alias on `.entities.v2.latest.security_default-00001`,
 * but the `GenericEntityPanel` resolves entities by querying
 * `ASSET_INVENTORY_INDEX_PATTERN === 'entities-latest-*'`. Without a
 * matching alias the panel's data fetch returns an empty hit set, the
 * panel renders the "Unable to load entity" error prompt
 * (`generic-right-flyout-error-prompt`) instead of `generic-panel-header`,
 * and every assertion that checks for the panel header fails. The v1
 * `initEntityEnginesWithRetry` call in the original setup would create
 * the `entities-latest-default` alias on its own, but `esArchiver.load`
 * deletes-and-recreates the index on load and drops engine-managed
 * aliases. Restoring `entities-latest-default` on the archive's index
 * after load resolves the data path. (The orthogonal name-rendering
 * mismatch in the host preview — `HostInstance1` vs `host-instance-1` —
 * remains a real product bug for the host case; out of scope here, the
 * smoke deliberately stays on the generic path.)
 */

import { getEntitiesLatestIndexName } from '@kbn/cloud-security-posture-common/utils/helpers';
import {
  waitForPluginInitialized,
  cleanupEntityStore,
  waitForEntityDataIndexed,
  dataViewRouteHelpersFactory,
  initEntityEnginesWithRetry,
} from '../../../cloud_security_posture_api/utils';
import type { SecurityTelemetryFtrProviderContext } from '../../config.base';

// eslint-disable-next-line import/no-default-export
export default function ({ getPageObjects, getService }: SecurityTelemetryFtrProviderContext) {
  const es = getService('es');
  const retry = getService('retry');
  const logger = getService('log');
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const ebtUIHelper = getService('kibana_ebt_ui');
  const kibanaServer = getService('kibanaServer');
  const pageObjects = getPageObjects([
    'common',
    'header',
    'networkEvents',
    'expandedFlyoutGraph',
    'entityFlyout',
  ]);
  const networkEventsPage = pageObjects.networkEvents;
  const expandedFlyoutGraph = pageObjects.expandedFlyoutGraph;
  const entityFlyout = pageObjects.entityFlyout;

  describe('Security Network Page - Entity Preview flyout (smoke)', function () {
    this.tags(['cloud_security_posture_graph_viz']);

    before(async () => {
      await cleanupEntityStore({ supertest, logger });

      try {
        await es.indices.delete({
          index: getEntitiesLatestIndexName(),
          ignore_unavailable: true,
        });
      } catch (e) {
        // Ignore if index doesn't exist
      }

      // Enable asset inventory setting
      await kibanaServer.uiSettings.update({ 'securitySolution:enableAssetInventory': true });

      // Initialize security-solution-default data-view (required by entity store)
      const dataView = dataViewRouteHelpersFactory(supertest);
      await dataView.create('security-solution');

      // Initialize entity engine for 'generic' type
      await initEntityEnginesWithRetry({
        supertest,
        retry,
        logger,
        entityTypes: ['generic'],
      });

      // security_alerts_modified_mappings - contains mappings for actor and target
      await esArchiver.load(
        'x-pack/solutions/security/test/cloud_security_posture_functional/es_archives/security_alerts_modified_mappings'
      );
      await esArchiver.load(
        'x-pack/solutions/security/test/cloud_security_posture_functional/es_archives/logs_gcp_audit'
      );

      await waitForPluginInitialized({ retry, supertest, logger });
      await ebtUIHelper.setOptIn(true);

      // Delete v2 latest manually since cleanupEntityStore doesn't touch it
      try {
        await es.indices.delete({
          index: getEntitiesLatestIndexName(),
          ignore_unavailable: true,
        });
      } catch (e) {
        // Ignore if index doesn't exist
      }

      // Load v2 entity data
      await esArchiver.load(
        'x-pack/solutions/security/test/cloud_security_posture_functional/es_archives/entity_store_v2'
      );

      // The archive creates `.entities.v2.latest.security_default-00001` with only
      // the `entities-generic-latest` alias, but the GenericEntityPanel queries
      // `ASSET_INVENTORY_INDEX_PATTERN === 'entities-latest-*'` to resolve the
      // entity it should render. Without this alias the panel falls into its
      // "Unable to load entity" error state and the `generic-panel-header` test
      // subject never renders. v1 `initEntityEnginesWithRetry` would have added
      // this alias on its own, but esArchiver replaces the index on load and
      // drops the engine-managed aliases — root cause of #261460 for cases 1-3.
      await es.indices.putAlias({
        index: '.entities.v2.latest.security_default-00001',
        name: 'entities-latest-default',
      });

      // Wait for entity data to be fully indexed
      await waitForEntityDataIndexed({
        es,
        logger,
        retry,
        entitiesIndex: getEntitiesLatestIndexName(),
        expectedCount: 36,
      });
    });

    after(async () => {
      // Clean up entity store resources
      await cleanupEntityStore({ supertest, logger });

      // Disable asset inventory setting
      await kibanaServer.uiSettings.update({ 'securitySolution:enableAssetInventory': false });

      // Delete alerts (using unload destroys the .alerts index alias which breaks
      // subsequent FTR runs in the same group; delete by query instead)
      await es.deleteByQuery({
        index: '.internal.alerts-*',
        query: { match_all: {} },
        conflicts: 'proceed',
      });

      await esArchiver.unload(
        'x-pack/solutions/security/test/cloud_security_posture_functional/es_archives/entity_store_v2'
      );
      await esArchiver.unload(
        'x-pack/solutions/security/test/cloud_security_posture_functional/es_archives/logs_gcp_audit'
      );
    });

    it('shows the entity details preview panel when an entity node is selected from the network-events graph', async () => {
      await networkEventsPage.navigateToNetworkEventsPage(
        `${networkEventsPage.getAbsoluteTimerangeFilter(
          '2024-09-01T00:00:00.000Z',
          '2024-09-02T00:00:00.000Z'
        )}&${networkEventsPage.getFlyoutFilter('MvExpandBugTest123')}`
      );
      await networkEventsPage.waitForListToHaveEvents();

      await networkEventsPage.flyout.expandVisualizations();
      await networkEventsPage.flyout.assertGraphPreviewVisible();
      await networkEventsPage.flyout.assertGraphNodesNumber(4);

      await expandedFlyoutGraph.expandGraph();
      await expandedFlyoutGraph.waitGraphIsLoaded();
      await expandedFlyoutGraph.assertGraphNodesNumber(4);

      // `mv-expand-target-storage` has no engine_type prefix, so the
      // dispatch falls through to `generic-entity-panel` — which is what
      // the cross-package contract this smoke is here to validate.
      await expandedFlyoutGraph.showEntityDetails('mv-expand-target-storage');

      await entityFlyout.assertEntityPanelIsOpen('generic');
      await entityFlyout.assertEntityPanelHeader('generic', 'MvExpandTargetStorage');
    });
  });
}
