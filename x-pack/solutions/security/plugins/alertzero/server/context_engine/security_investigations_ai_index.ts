/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ContextEnginePluginSetup } from '@kbn/context-engine-plugin/server';
import { i18n } from '@kbn/i18n';
import {
  SECURITY_INVESTIGATIONS_AI_INDEX_ID,
  SECURITY_INVESTIGATIONS_AI_INDEX_NAME,
} from '@kbn/workflows/managed';

export { SECURITY_INVESTIGATIONS_AI_INDEX_ID, SECURITY_INVESTIGATIONS_AI_INDEX_NAME };

/**
 * Registers the investigations AI index with Context Engine so workers resolve a
 * managed dest instead of lazily creating one on the first `createKi`.
 */
export const registerSecurityInvestigationsAiIndex = (
  contextEngine: ContextEnginePluginSetup | undefined,
  logger: Logger
): void => {
  if (!contextEngine) {
    logger.debug(
      'contextEngine is not available — security investigations AI index will not be registered'
    );
    return;
  }

  contextEngine.registerAiIndex(SECURITY_INVESTIGATIONS_AI_INDEX_ID, {
    description: i18n.translate('xpack.alertzero.securityInvestigations.aiIndexDescription', {
      defaultMessage:
        'Knowledge indicators written by AlertZero workers, including detection-coverage gaps and endpoint-analysis handoffs.',
    }),
    dest: { type: 'index', value: SECURITY_INVESTIGATIONS_AI_INDEX_NAME },
    automations: [],
    sources: [],
    traces: [],
  });
};
