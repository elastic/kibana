/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  matchAttackFingerprintsInputSchema,
  matchAttackFingerprintsStepCommonDefinition,
} from '../../../../common/workflows/step_types/match_attack_fingerprints/match_attack_fingerprints_step_common';
import { FingerprintIndexUnscopedError } from './fingerprint_index_unscoped_error';
import {
  FingerprintIndexUnreadError,
  matchAttackFingerprints,
  reviewsWhenMatchFails,
} from './match_attack_fingerprints';
import { resolveSpaceId } from '../get_alert_entities_step/resolve_space_id';

export const matchAttackFingerprintsStepDefinition = createServerStepDefinition({
  ...matchAttackFingerprintsStepCommonDefinition,
  handler: async (context) => {
    const parsed = matchAttackFingerprintsInputSchema.safeParse(context.input);
    if (!parsed.success) {
      return { error: new Error(`Invalid input: ${parsed.error.message}`) };
    }

    try {
      const output = await matchAttackFingerprints({
        abortSignal: context.abortSignal,
        attacks: parsed.data.attacks,
        contextManager: context.contextManager,
        esClient: context.contextManager.getScopedEsClient(),
        logger: context.logger,
        parentRunId: parsed.data.parent_run_id,
        spaceId: await resolveSpaceId(context.contextManager),
      });
      return { output };
    } catch (error) {
      if (context.abortSignal?.aborted) {
        return {
          error: error instanceof Error ? error : new Error('Failed to match attack fingerprints'),
        };
      }
      // A read that never happened must not write a fingerprint. Generation will
      // not hand these discoveries to a later run, so this run still reviews them.
      if (
        error instanceof FingerprintIndexUnreadError ||
        error instanceof FingerprintIndexUnscopedError
      ) {
        context.logger.error(
          error instanceof FingerprintIndexUnscopedError
            ? 'Attack fingerprint index is not space-scoped; reviewing every attack and writing no fingerprint'
            : 'Attack fingerprint index was not read; reviewing every attack and writing no fingerprint',
          error
        );
        return { output: reviewsWhenMatchFails(parsed.data.attacks) };
      }
      context.logger.error('Failed to match attack fingerprints', error);
      return { output: reviewsWhenMatchFails(parsed.data.attacks) };
    }
  },
});
