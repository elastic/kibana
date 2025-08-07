/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser, Logger } from '@kbn/core/server';
import type {
  RuleMigration,
  RuleMigrationRule,
  ElasticRule,
} from '../../../../../common/siem_migrations/model/rule_migration.gen';
import type { RuleMigrationsDataClient } from '../data/rule_migrations_data_client';
import type { MigrateRuleConfigSchema, MigrateRuleGraphConfig } from './agent/types';
import { getRuleMigrationAgent } from './agent';
import { RuleMigrationsRetriever } from './retrievers';
import type { RuleMigrationInput } from './types';
import type { StoredRuleMigration } from '../types';
import { EsqlKnowledgeBase } from './util/esql_knowledge_base';
import { nullifyElasticRule } from './util/nullify_missing_properties';
import type { SiemMigrationsClientDependencies } from '../../common/types';
import { SiemMigrationTaskRunner } from '../../common/task/siem_migrations_task_runner';
import { RuleMigrationTelemetryClient } from './rule_migrations_telemetry_client';
import type { MigrationState, MigrationTask, MigrationTaskInvoke } from '../../common/task/types';

export class RuleMigrationTaskRunner extends SiemMigrationTaskRunner<
  RuleMigration,
  RuleMigrationRule,
  MigrateRuleConfigSchema
> {
  protected declare task?: MigrationTask<RuleMigrationRule, MigrateRuleConfigSchema>;
  private retriever: RuleMigrationsRetriever;

  constructor(
    public readonly migrationId: string,
    public readonly startedBy: AuthenticatedUser,
    public readonly abortController: AbortController,
    protected readonly data: RuleMigrationsDataClient,
    protected readonly logger: Logger,
    protected readonly dependencies: SiemMigrationsClientDependencies
  ) {
    super(migrationId, startedBy, abortController, data, logger, dependencies);
    this.retriever = new RuleMigrationsRetriever(this.migrationId, {
      data: this.data,
      rules: this.dependencies.rulesClient,
      savedObjects: this.dependencies.savedObjectsClient,
    });
  }

  /** Retrieves the connector and creates the migration agent */
  public async setup(connectorId: string): Promise<void> {
    const { inferenceClient } = this.dependencies;
    const model = await this.actionsClientChat.createModel({
      connectorId,
      migrationId: this.migrationId,
      abortController: this.abortController,
    });

    const telemetryClient = new RuleMigrationTelemetryClient(
      this.dependencies.telemetry,
      this.logger,
      this.migrationId,
      model.model
    );

    const esqlKnowledgeBase = new EsqlKnowledgeBase(
      connectorId,
      this.migrationId,
      inferenceClient,
      this.logger
    );

    const agent = getRuleMigrationAgent({
      esqlKnowledgeBase,
      model,
      ruleMigrationsRetriever: this.retriever,
      logger: this.logger,
      telemetryClient,
    });

    this.telemetry = telemetryClient;
    this.task = {
      prepare: async (
        migrationRule: StoredRuleMigration,
        config: MigrateRuleGraphConfig
      ): Promise<MigrationTaskInvoke<RuleMigrationRule>> => {
        const resources = await this.retriever.resources.getResources(migrationRule);
        const input: RuleMigrationInput = {
          id: migrationRule.id,
          original_rule: migrationRule.original_rule,
          resources,
        };
        return async () => {
          return agent.invoke(input, config) as Promise<MigrationState<RuleMigrationRule>>;
        };
      },
    };
  }

  /** Initializes the retriever populating ELSER indices. It may take a few minutes */
  protected async initialize() {
    await this.retriever.initialize();
  }

  /** Overload to nullify elastic rule specific properties */
  protected async saveItemCompleted(
    ruleMigration: StoredRuleMigration,
    migrationResult: Partial<StoredRuleMigration>
  ) {
    this.logger.debug(`Translation of rule "${ruleMigration.id}" succeeded`);
    const nullifiedElasticRule = nullifyElasticRule(
      migrationResult.elastic_rule as ElasticRule,
      this.logger.error
    );
    const ruleMigrationTranslated = {
      ...ruleMigration,
      elastic_rule: nullifiedElasticRule as ElasticRule,
      translation_result: migrationResult.translation_result,
      comments: migrationResult.comments,
    };
    return super.saveItemCompleted(ruleMigration, ruleMigrationTranslated);
  }
}
