/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitForPluginInitialized } from '../../cloud_security_posture_api/utils';
import { dataViewRouteHelpersFactory } from '../../cloud_security_posture_api/utils';
import type { SecurityTelemetryFtrProviderContext } from '../config';

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
    'genericEntityFlyout',
  ]);
  const networkEventsPage = pageObjects.networkEvents;
  const expandedFlyoutGraph = pageObjects.expandedFlyoutGraph;
  const genericEntityFlyout = pageObjects.genericEntityFlyout;

  const cleanupSpaceEnrichResources = async (spaceId?: string) => {
    const spacePath = spaceId ? `/s/${spaceId}` : '';

    // Delete the generic entity engine which will properly clean up:
    // - Platform pipeline
    // - Field retention enrich policy
    // - Enrich indices
    // Note: Asset Inventory uses the 'generic' entity type
    try {
      await supertest
        .delete(`${spacePath}/api/entity_store/engines/generic?data=true`)
        .set('kbn-xsrf', 'xxxx')
        .expect(200);
      logger.debug(`Deleted entity store generic engine for space: ${spaceId || 'default'}`);
    } catch (e) {
      // Ignore 404 errors if the engine doesn't exist
      if (e.status !== 404) {
        logger.debug(
          `Error deleting entity store for space ${spaceId || 'default'}: ${
            e && e.message ? e.message : JSON.stringify(e)
          }`
        );
      }
    }
  };

  describe('Security Network Page - Generic Entity Popover', function () {
    this.tags(['cloud_security_posture_graph_viz']);

    const entitiesIndex = '.entities.v1.latest.security_*';
    let dataView: ReturnType<typeof dataViewRouteHelpersFactory>;

    /**
     * Waits for the enrich index to be created and populated with data.
     */
    const waitForEnrichIndexPopulated = async () => {
      await retry.waitFor(
        'enrich index to be created and populated for default space',
        async () => {
          try {
            // Check if the index has data (policy has been executed)
            const count = await es.count({
              index: `.enrich-entity_store_field_retention_generic_default_v1.0.0`,
            });
            return count.count > 0;
          } catch (e) {
            return false;
          }
        }
      );
    };

    before(async () => {
      // Clean up any leftover resources from previous runs
      await cleanupSpaceEnrichResources();

      // Enable asset inventory
      await kibanaServer.uiSettings.update({ 'securitySolution:enableAssetInventory': true });

      // Load security alerts with modified mappings (includes actor and target)
      await esArchiver.load(
        'x-pack/solutions/security/test/cloud_security_posture_functional/es_archives/security_alerts_modified_mappings'
      );
      // Load GCP audit logs
      await esArchiver.load(
        'x-pack/solutions/security/test/cloud_security_posture_functional/es_archives/logs_gcp_audit'
      );
      // Load entity store data
      await esArchiver.load(
        'x-pack/solutions/security/test/cloud_security_posture_api/es_archives/entity_store'
      );

      // Wait for entity data to be indexed before proceeding
      await retry.waitFor('entity data to be indexed', async () => {
        const response = await es.count({
          index: entitiesIndex,
        });
        // We expect at least 1 document for the default space
        return response.count >= 1;
      });

      // Initialize security-solution-default data-view
      dataView = dataViewRouteHelpersFactory(supertest);
      await dataView.create('security-solution');

      // Enable asset inventory - install underlying indexes and enrich policies
      await supertest
        .post(`/api/asset_inventory/enable`)
        .set('kbn-xsrf', 'xxxx')
        .send({})
        .expect(200);

      // Wait for enrich index to be created AND populated with data
      await waitForEnrichIndexPopulated();

      await waitForPluginInitialized({ retry, supertest, logger });
      await ebtUIHelper.setOptIn(true);
    });

    after(async () => {
      // Clean up all enrich resources
      await cleanupSpaceEnrichResources();

      // Disable asset inventory
      await kibanaServer.uiSettings.update({ 'securitySolution:enableAssetInventory': false });

      // Delete alerts
      await es.deleteByQuery({
        index: '.internal.alerts-*',
        query: { match_all: {} },
        conflicts: 'proceed',
      });

      // Unload GCP audit logs
      await esArchiver.unload(
        'x-pack/solutions/security/test/cloud_security_posture_functional/es_archives/logs_gcp_audit'
      );

      // Delete data view
      await dataView.delete('security-solution');
    });

    it('expanded flyout - show generic entity details', async () => {
      // Setting the timerange to fit the data and open the flyout for a specific alert
      await networkEventsPage.navigateToNetworkEventsPage(
        `${networkEventsPage.getAbsoluteTimerangeFilter(
          '2024-09-01T00:00:00.000Z',
          '2024-09-02T00:00:00.000Z'
        )}&${networkEventsPage.getFlyoutFilter('1')}`
      );
      await networkEventsPage.waitForListToHaveEvents();

      await networkEventsPage.flyout.expandVisualizations();
      await networkEventsPage.flyout.assertGraphPreviewVisible();
      await networkEventsPage.flyout.assertGraphNodesNumber(3);

      await expandedFlyoutGraph.expandGraph();
      await expandedFlyoutGraph.waitGraphIsLoaded();
      await expandedFlyoutGraph.assertGraphNodesNumber(3);

      // Click on the entity node to show entity details
      await expandedFlyoutGraph.showEntityDetails('admin@example.com');

      // Verify the generic entity preview panel is open
      await genericEntityFlyout.assertGenericEntityPanelIsOpen();
      await genericEntityFlyout.assertGenericEntityPanelHeader('admin@example.com');
    });
  });
}
