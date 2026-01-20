/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Client } from '@elastic/elasticsearch';
import { INDEX_PATTERN as SIEM_MIGRATIONS_BASE_INDEX_PATTERN } from '@kbn/security-solution-plugin/server/lib/siem_migrations/rules/data/rule_migrations_data_service';

const MIGRATIONS_INDEX_PATTERN = `${SIEM_MIGRATIONS_BASE_INDEX_PATTERN}-migrations-default`;
const RULES_INDEX_PATTERN = `${SIEM_MIGRATIONS_BASE_INDEX_PATTERN}-rules-default`;
const RESOURCES_INDEX_PATTERN = `${SIEM_MIGRATIONS_BASE_INDEX_PATTERN}-resources-default`;

export const getRuleMigrationFromES = async ({
  es,
  migrationId,
}: {
  es: Client;
  migrationId: string;
}) => {
  return await es.search({
    index: MIGRATIONS_INDEX_PATTERN,
    query: {
      terms: {
        _id: [migrationId],
      },
    },
  });
};

export const getRulesPerMigrationFromES = async ({
  es,
  migrationId,
}: {
  es: Client;
  migrationId: string;
}) => {
  return await es.search({
    index: RULES_INDEX_PATTERN,
    size: 10000,
    query: {
      term: {
        migration_id: migrationId,
      },
    },
  });
};

export const getResoucesPerMigrationFromES = async ({
  es,
  migrationId,
}: {
  es: Client;
  migrationId: string;
}) => {
  return await es.search({
    index: RESOURCES_INDEX_PATTERN,
    size: 10000,
    query: {
      term: {
        migration_id: migrationId,
      },
    },
  });
};
