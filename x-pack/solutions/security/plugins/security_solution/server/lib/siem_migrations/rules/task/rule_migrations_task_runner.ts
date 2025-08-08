/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser, Logger } from '@kbn/core/server';
import type {
  ElasticRule,
  RuleMigration,
  RuleMigrationRule,
} from '../../../../../common/siem_migrations/model/rule_migration.gen';
import type { RuleMigrationsDataClient } from '../data/rule_migrations_data_client';
import type { MigrateRuleConfigSchema, MigrateRuleState } from './agent/types';
import { getRuleMigrationAgent } from './agent';
import { RuleMigrationsRetriever } from './retrievers';
import type { StoredRuleMigrationRule } from '../types';
import { EsqlKnowledgeBase } from '../../common/task/util/esql_knowledge_base';
import { nullifyMissingProperties } from '../../common/task/util/nullify_missing_properties';
import type { SiemMigrationsClientDependencies } from '../../common/types';
import { SiemMigrationTaskRunner } from '../../common/task/siem_migrations_task_runner';
import { RuleMigrationTelemetryClient } from './rule_migrations_telemetry_client';
import type { MigrationResources } from '../../common/task/retrievers/resource_retriever';

export interface RuleMigrationTaskInput
  extends Pick<StoredRuleMigrationRule, 'id' | 'original_rule'> {
  resources: MigrationResources;
}
export type RuleMigrationTaskOutput = MigrateRuleState;

export class RuleMigrationTaskRunner extends SiemMigrationTaskRunner<
  RuleMigration,
  RuleMigrationRule,
  RuleMigrationTaskInput,
  MigrateRuleConfigSchema,
  RuleMigrationTaskOutput
> {
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
    this.task = (input, config) => agent.invoke(input, config);
  }

  /** Initializes the retriever populating ELSER indices. It may take a few minutes */
  protected async initialize() {
    await this.retriever.initialize();
  }

  protected async prepareTaskInput(
    migrationRule: StoredRuleMigrationRule
  ): Promise<RuleMigrationTaskInput> {
    const resources = await this.retriever.resources.getResources(migrationRule);
    return { id: migrationRule.id, original_rule: migrationRule.original_rule, resources };
  }

  protected processTaskOutput(
    migrationRule: StoredRuleMigrationRule,
    migrationOutput: RuleMigrationTaskOutput
  ): StoredRuleMigrationRule {
    return {
      ...migrationRule,
      elastic_rule: nullifyMissingProperties({
        source: migrationRule.elastic_rule,
        target: migrationOutput.elastic_rule as ElasticRule,
      }),
      translation_result: migrationOutput.translation_result,
      comments: migrationOutput.comments,
    };
  }
}
