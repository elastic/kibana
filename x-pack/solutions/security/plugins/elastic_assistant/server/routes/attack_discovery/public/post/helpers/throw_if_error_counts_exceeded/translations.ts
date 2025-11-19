/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const MAX_HALLUCINATION_FAILURES = (hallucinationFailures: number) =>
  i18n.translate(
    'xpack.elasticAssistantPlugin.attackDiscovery.defaultAttackDiscoveryGraph.nodes.retriever.helpers.throwIfErrorCountsExceeded.maxHallucinationFailuresErrorMessage',
    {
      defaultMessage:
        'Maximum hallucination failures ({hallucinationFailures}) reached. Try sending fewer alerts to this model.',
      values: { hallucinationFailures },
    }
  );

export const MAX_GENERATION_ATTEMPTS = (generationAttempts: number) =>
  i18n.translate(
    'xpack.elasticAssistantPlugin.attackDiscovery.defaultAttackDiscoveryGraph.nodes.retriever.helpers.throwIfErrorCountsExceeded.maxGenerationAttemptsErrorMessage',
    {
      defaultMessage:
        'Maximum generation attempts ({generationAttempts}) reached. Try sending fewer alerts to this model.',
      values: { generationAttempts },
    }
  );
