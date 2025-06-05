/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pageObjects as kibanaFunctionalPageObjects } from '@kbn/test-suites-src/functional/page_objects';

import { CrossClusterReplicationPageProvider } from './cross_cluster_replication_page';
import { IndexManagementPageProvider } from './index_management_page';
import { RemoteClustersPageProvider } from './remote_clusters_page';
import { FleetSettingsPageProvider } from './fleet_settings_page';

// just like services, PageObjects are defined as a map of
// names to Providers. Merge in Kibana's or pick specific ones
export const pageObjects = {
  ...kibanaFunctionalPageObjects,
  crossClusterReplication: CrossClusterReplicationPageProvider,
  indexManagement: IndexManagementPageProvider,
  remoteClusters: RemoteClustersPageProvider,
  fleetSettingsPage: FleetSettingsPageProvider,
};
