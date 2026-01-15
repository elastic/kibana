/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server';
import type { SiemMigrationsService } from '../../siem_migrations_service';
import type {
  SecuritySolutionPluginStart,
  SecuritySolutionPluginStartDependencies,
} from '../../../plugin_contract';
import { createSiemMigrationsClientFactory } from '../tools/create_client_factory';
import { createMigrationRuleAttachmentType } from './migration_rule';

export async function registerSiemMigrationAttachments({
  agentBuilder,
  core,
  siemMigrationsService,
  logger,
}: {
  agentBuilder: AgentBuilderPluginSetup;
  core: CoreSetup<SecuritySolutionPluginStartDependencies, SecuritySolutionPluginStart>;
  siemMigrationsService: SiemMigrationsService;
  logger: Logger;
}) {
  // Create client factory that attachments will use to get scoped clients
  const getClient = createSiemMigrationsClientFactory({
    core,
    siemMigrationsService,
  });

  // Register SIEM migration rule attachment type
  const attachmentType = createMigrationRuleAttachmentType({
    core,
    logger,
    getClient,
  });

  agentBuilder.attachments.registerType(attachmentType);

  logger.debug('Successfully registered SIEM migration rule attachment type');
}
