/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { splResourceIdentifier } from '../../../../../../common/siem_migrations/rules/resources/splunk/splunk_identifier';
import type {
  CreateDashboardMigrationResourceInput,
  DashboardMigrationsDataResourcesClient,
} from '../../data/dashboard_migrations_data_resources_client';

/**
 * Identifies and persists the resources (lookups, macros) found within a dashboard's query content.
 *
 * @param migrationId The ID of the current migration task.
 * @param content The raw query string content from which to extract resources.
 * @param resourcesClient The data client used to persist the found resources.
 */
export const findAndPersistDashboardResources = async (
  migrationId: string,
  content: string,
  resourcesClient: DashboardMigrationsDataResourcesClient
): Promise<void> => {
  // Use the shared function to identify all resource instances in the query
  const identifiedResources = splResourceIdentifier(content);

  if (identifiedResources.length === 0) {
    return;
  }

  // Deduplicate resources by type and name before persisting
  const lookups = new Set<string>();
  const macros = new Set<string>();
  identifiedResources.forEach((resource) => {
    if (resource.type === 'macro') {
      macros.add(resource.name);
    } else if (resource.type === 'lookup') {
      lookups.add(resource.name);
    }
  });

  // Format the unique resources into the shape required for creation
  const resourcesToCreate: CreateDashboardMigrationResourceInput[] = [
    ...Array.from(macros).map((name) => ({
      type: 'macro' as const,
      name,
      migration_id: migrationId,
    })),
    ...Array.from(lookups).map((name) => ({
      type: 'lookup' as const,
      name,
      migration_id: migrationId,
    })),
  ];

  // Persist the placeholder resources
  if (resourcesToCreate.length > 0) {
    await resourcesClient.create(resourcesToCreate);
  }
};
