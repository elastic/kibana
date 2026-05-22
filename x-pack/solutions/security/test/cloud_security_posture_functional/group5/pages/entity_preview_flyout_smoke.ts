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
 * Three of those four assertions reduced to engine_type dispatch — moved to
 * L1. The remaining cross-system signal is preserved here as one canonical
 * happy path. The block this replaces was failing because it ran the v2
 * LOOKUP JOIN scenario with the v1 entity-engine setup
 * (`initEntityEnginesWithRetry` + missing `securitySolution:entityStoreEnableV2`
 * UI setting); this smoke mirrors the v2 setup that `events_flyout.ts` runs
 * green against on `main` (`installEntityStoreV2` + `waitForEntityStoreV2Running`
 * + the v2 UI setting).
 */

import { getEntitiesLatestIndexName } from '@kbn/cloud-security-posture-common/utils/helpers';
import {
  waitForPluginInitialized,
  waitForEntityDataIndexed,
  dataViewRouteHelpersFactory,
  installEntityStoreV2,
  uninstallEntityStoreV2,
  waitForEntityStoreV2Running,
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
      // Clean up any leftover alerts indices from previous failed runs
      for (const suffix of ['000001', '000002']) {
        try {
          await es.indices.delete({
            index: `.internal.alerts-security.alerts-default-${suffix}`,
          });
        } catch (e) {
          // Ignore if index doesn't exist
        }
      }

      // Clean up any leftover entities-latest index from a v1 run
      try {
        await es.indices.delete({
          index: getEntitiesLatestIndexName(),
          ignore_unavailable: true,
        });
      } catch (e) {
        // Ignore if index doesn't exist
      }

      // security_alerts_modified_mappings - contains mappings for actor and target
      await esArchiver.load(
        'x-pack/solutions/security/test/cloud_security_posture_functional/es_archives/security_alerts_modified_mappings'
      );
      await esArchiver.load(
        'x-pack/solutions/security/test/cloud_security_posture_functional/es_archives/logs_gcp_audit'
      );

      await waitForPluginInitialized({ retry, supertest, logger });
      await ebtUIHelper.setOptIn(true);

      // Both settings are required for the v2 LOOKUP JOIN path that this
      // smoke exercises. Missing `entityStoreEnableV2` was part of the
      // root cause of the original FTR's failure under #261460.
      await kibanaServer.uiSettings.update({
        'securitySolution:enableAssetInventory': true,
        'securitySolution:entityStoreEnableV2': true,
      });

      // Initialize security-solution-default data-view (required by entity store)
      const dataView = dataViewRouteHelpersFactory(supertest);
      await dataView.create('security-solution');

      // Install Entity Store V2 (required for graph visualization with LOOKUP JOIN)
      await installEntityStoreV2({ supertest, logger });
      await waitForEntityStoreV2Running({ supertest, retry, logger });

      // Load v2 entity data and wait for it to be indexed
      await esArchiver.load(
        'x-pack/solutions/security/test/cloud_security_posture_functional/es_archives/entity_store_v2'
      );
      await waitForEntityDataIndexed({
        es,
        logger,
        retry,
        entitiesIndex: getEntitiesLatestIndexName(),
        expectedCount: 36,
      });
    });

    after(async () => {
      await uninstallEntityStoreV2({ supertest, logger });

      await kibanaServer.uiSettings.update({
        'securitySolution:enableAssetInventory': false,
        'securitySolution:entityStoreEnableV2': false,
      });

      // Using unload destroys the .alerts-security.alerts-default index alias which
      // breaks subsequent tests in the same FTR run. Delete docs by query instead.
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
      // Open the network events flyout for an event with multi-target entities
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

      // Click the entity node and open its details. `mv-expand-target-storage`
      // has no engine_type prefix, so the dispatch falls through to
      // `generic-entity-panel` — which is what the cross-package contract
      // this smoke is here to validate.
      await expandedFlyoutGraph.showEntityDetails('mv-expand-target-storage');

      await entityFlyout.assertEntityPanelIsOpen('generic');
      await entityFlyout.assertEntityPanelHeader('generic', 'MvExpandTargetStorage');
    });
  });
}
