/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorServerSideDefinition } from '@kbn/search-connectors';
import type { FleetStartContract, FleetSetupContract } from '@kbn/fleet-plugin/server';
import {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { SavedObjectsServiceSetup, SavedObjectsServiceStart } from '@kbn/core-saved-objects-server';
import { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import { CloudSetup } from '@kbn/cloud-plugin/server';

/* eslint-disable @typescript-eslint/no-empty-interface */

export interface SearchConnectorsPluginSetup {
  getConnectorTypes: () => ConnectorServerSideDefinition[];
}

export interface SearchConnectorsPluginStart {}

export interface SearchConnectorsPluginStartDependencies {
  fleet: FleetStartContract;
  taskManager: TaskManagerStartContract;
  soClient: SavedObjectsServiceStart;
  licensing: LicensingPluginStart;
}
export interface SearchConnectorsPluginSetupDependencies {
  fleet: FleetSetupContract;
  taskManager: TaskManagerSetupContract;
  soClient: SavedObjectsServiceSetup;
  cloud: CloudSetup;
}
