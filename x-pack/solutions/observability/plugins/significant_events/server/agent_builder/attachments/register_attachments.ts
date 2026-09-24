/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/core/server';
import type { GetScopedClients } from '../../routes/types';
import { createSignificantEventAttachmentType } from './significant_event_attachment_type';
import { createSignificantEventFeatureAttachmentType } from './feature_attachment_type';
import { createSignificantEventDetectionAttachmentType } from './detection_attachment_type';

export const registerAgentBuilderAttachments = ({
  agentBuilder,
  getScopedClients,
  logger,
}: {
  agentBuilder: AgentBuilderPluginSetup;
  getScopedClients: GetScopedClients;
  logger: Logger;
}): void => {
  agentBuilder.attachments.registerType(
    createSignificantEventAttachmentType({
      logger: logger.get('significant_event_attachment'),
      getScopedClients,
    }) as Parameters<typeof agentBuilder.attachments.registerType>[0]
  );

  agentBuilder.attachments.registerType(
    createSignificantEventFeatureAttachmentType({
      logger: logger.get('significant_event_feature_attachment'),
      getScopedClients,
    }) as Parameters<typeof agentBuilder.attachments.registerType>[0]
  );

  agentBuilder.attachments.registerType(
    createSignificantEventDetectionAttachmentType({
      logger: logger.get('significant_event_detection_attachment'),
      getScopedClients,
    }) as Parameters<typeof agentBuilder.attachments.registerType>[0]
  );
};
