/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * FTR (L4): one end-to-end smoke for the network-events graph entity
 * preview flyout.
 *
 * Sibling coverage (engine_type → panel dispatch, both production owners):
 * - Graph-package hook:
 *   `.../kbn-cloud-security-posture/graph/src/components/graph_grouped_node_preview_panel/hooks/use_open_entity_preview_panel.test.tsx`
 * - security_solution flyout callback:
 *   `.../security_solution/public/flyout/shared/components/graph_visualization.test.tsx`
 *
 * L4-unique signal: the cross-package panel-key contract plus the
 * entity-store v2 LOOKUP JOIN data path through the network-events page —
 * neither is mockable at L1. Keep at exactly one `it(...)`.
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

      // The v2 archive ships only `entities-generic-latest`; the panel queries
      // `entities-latest-*`. Restore the alias the entity engine would have
      // created itself (otherwise the panel falls into its "Unable to load
      // entity" error state — see #261460).
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

      // `mv-expand-target-storage` has no engine_type prefix, so dispatch
      // falls through to `generic-entity-panel` — the cross-package contract
      // this smoke is here to pin.
      await expandedFlyoutGraph.showEntityDetails('mv-expand-target-storage');

      await entityFlyout.assertEntityPanelIsOpen('generic');
      await entityFlyout.assertEntityPanelHeader('generic', 'MvExpandTargetStorage');
    });
  });
}
