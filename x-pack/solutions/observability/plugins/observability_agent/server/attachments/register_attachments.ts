/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAiInsightAttachmentType } from './ai_insight';
import type { ObservabilityAgentPluginSetupDependencies } from '../types';

export async function registerAttachments({
  plugins,
}: {
  plugins: ObservabilityAgentPluginSetupDependencies;
}) {
  const attachmentTypes = [createAiInsightAttachmentType()];

  for (const attachment of attachmentTypes) {
    plugins.onechat.attachments.registerType(attachment);
  }
}
