/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { createAiInsightAttachmentType } from './ai_insight';
import { createErrorAttachmentType } from './error';
import { createAlertAttachmentType } from './alert';
import { createLogAttachmentType } from './log';
import type {
  ObservabilityAgentBuilderCoreSetup,
  ObservabilityAgentBuilderPluginSetupDependencies,
} from '../types';
import type { ObservabilityAgentBuilderDataRegistry } from '../data_registry/data_registry';

export async function registerAttachments({
  core,
  plugins,
  logger,
  dataRegistry,
}: {
  core: ObservabilityAgentBuilderCoreSetup;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  logger: Logger;
  dataRegistry: ObservabilityAgentBuilderDataRegistry;
}) {
  const attachmentTypes: AttachmentTypeDefinition<any, any>[] = [
    createAiInsightAttachmentType(),
    createErrorAttachmentType({ core, logger, dataRegistry }),
    createAlertAttachmentType({ core, logger }),
    createLogAttachmentType({ core, logger, dataRegistry }),
  ];

  for (const attachment of attachmentTypes) {
    plugins.agentBuilder.attachments.registerType(attachment);
  }
}
