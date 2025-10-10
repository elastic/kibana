/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardMigrationsDataClient } from '../../data/dashboard_migrations_data_client';
import { DashboardResourceRetriever } from './dashboard_resource_retriever';

export interface DashboardMigrationsRetrieverClients {
  data: DashboardMigrationsDataClient;
}

/**
 * DashboardMigrationsRetriever is a class that is responsible for retrieving all the necessary data during the dashboard migration process.
 * It is composed of multiple retrievers that are responsible for retrieving specific types of data.
 * Such as dashboard integrations, prebuilt dashboards, and dashboard resources.
 */
export class DashboardMigrationsRetriever {
  public readonly resources: DashboardResourceRetriever;

  constructor(migrationId: string, clients: DashboardMigrationsRetrieverClients) {
    this.resources = new DashboardResourceRetriever(migrationId, clients.data.resources);
  }

  public async initialize() {
    await this.resources.initialize();
  }
}
