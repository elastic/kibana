/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isTemplateRequiredConnector } from '@kbn/inference-common';
import type { ScopedModel } from '@kbn/agent-builder-server';

/**
 * The model a Hunt call should use. A connector saved on Cyber domain models
 * replaces the tier. A call that writes its own prompt keeps the tier model
 * when that connector accepts only a prompt template.
 */
export const selectHuntCallModel = ({
  tierModel,
  cyberModel,
  messagesOnly = false,
}: {
  tierModel?: ScopedModel;
  cyberModel?: ScopedModel;
  /** True for `generateEsql`, which sends its own prompts across several rounds. */
  messagesOnly?: boolean;
}): ScopedModel | undefined => {
  if (cyberModel == null) {
    return tierModel;
  }
  if (messagesOnly && isTemplateRequiredConnector(cyberModel.connector)) {
    return tierModel;
  }
  return cyberModel;
};
