/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidV4 } from 'uuid';
import type { StoredSiemMigration } from '../types';
import { RuleMigrationsDataBaseClient } from './rule_migrations_data_base_client';
import type { RuleMigrationsDataRulesClient } from './rule_migrations_data_rules_client';
import type { RuleMigrationsDataResourcesClient } from './rule_migrations_data_resources_client';
import { isStringValidJSON } from './utils';

export class RuleMigrationsDataMigrationClient extends RuleMigrationsDataBaseClient {
  async create(): Promise<string> {
    const migrationId = uuidV4();
    const index = await this.getIndexName();
    const profileUid = await this.getProfileUid();
    const createdAt = new Date().toISOString();

    await this.esClient
      .create({
        refresh: 'wait_for',
        id: migrationId,
        index,
        document: {
          created_by: profileUid,
          created_at: createdAt,
        },
      })
      .catch((error) => {
        this.logger.error(`Error creating migration ${migrationId}: ${error}`);
        throw error;
      });

    return migrationId;
  }

  async get({ id }: { id: string }): Promise<StoredSiemMigration | undefined> {
    const index = await this.getIndexName();
    return this.esClient
      .get<StoredSiemMigration>({
        index,
        id,
      })
      .then((document) => {
        return this.processHit(document);
      })
      .catch((error) => {
        if (isStringValidJSON(error.message)) {
          const message = JSON.parse(error.message);
          if (Object.hasOwn(message, 'found') && message.found === false) {
            return undefined;
          }
        }
        this.logger.error(`Error getting migration ${id}: ${error}`);
        throw error;
      });
  }

  /**
   *
   * Deletes the migration document and all the rules and resources associated with it.
   *
   * */
  async delete({
    id,
    rulesClient,
    resourcesClient,
  }: {
    id: string;
    rulesClient: RuleMigrationsDataRulesClient;
    resourcesClient: RuleMigrationsDataResourcesClient;
  }): Promise<void> {
    const index = await this.getIndexName();

    const resourcesIndexName = await resourcesClient.getIndexName();
    const resourcesToBeDeleted = await resourcesClient.get(id);
    const resourcesToBeDeletedDocIds = resourcesToBeDeleted.map((resource) => resource.id);

    const ruleIndexName = await rulesClient.getIndexName();
    const rulesToBeDeleted = await rulesClient.get(id);
    const rulesToBeDeletedDocIds = rulesToBeDeleted.data.map((rule) => rule.id);

    const rulesDeleteOperations = rulesToBeDeletedDocIds.map((docId) => ({
      delete: {
        _id: docId,
        _index: ruleIndexName,
      },
    }));

    const resourcesDeleteOperations = resourcesToBeDeletedDocIds.map((docId) => ({
      delete: {
        _id: docId,
        _index: resourcesIndexName,
      },
    }));

    return this.esClient
      .bulk({
        refresh: 'wait_for',
        operations: [
          {
            delete: {
              _index: index,
              _id: id,
            },
          },
          ...rulesDeleteOperations,
          ...resourcesDeleteOperations,
        ],
      })
      .then(() => {
        this.logger.info(`Deleted migration ${id}`);
      })
      .catch((error) => {
        this.logger.error(`Error deleting migration ${id}: ${error}`);
        throw error;
      });
  }
}
