/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { fetchSourceStepCommonDefinition } from '../../../../../common/threat_intel/workflows/step_types/fetch_source/fetch_source_common';
import { runAdapter, UnknownAdapterError } from '../../../adapters';
import type { AdapterRunContext, SourceHit } from '../../../adapters';

export interface BuildFetchSourceStepDeps {
  logger: Logger;
}

/**
 * Build the `threat_intel.fetch_source` step definition.
 *
 * Wraps a step-scoped logger from the host plugin so the adapter run
 * context's `logger.get(<adapter-name>)` chains end up under
 * `securitySolution.threatIntel.fetch_source.<adapter>` in the
 * Kibana logs — that path is what operators grep when a feed misbehaves.
 *
 */
export const buildFetchSourceStepDefinition = (deps: BuildFetchSourceStepDeps) =>
  createServerStepDefinition({
    ...fetchSourceStepCommonDefinition,
    handler: async (context) => {
      // The handler is called with the rendered `with` payload as `input`.
      // Cast through the inferred input shape from the common schema —
      // the Zod runtime parsing is the engine's responsibility (see
      // `CustomStepImpl.createHandlerContext`); we re-narrow on access
      // here so the adapter contract sees a `SourceHit`.
      const { source } = context.input as { source: SourceHit | string };

      // `fetchSourceInputSchema` accepts a string because `{{ foreach.item }}`
      // (without the `$`) stringifies the hit instead of passing the object.
      // That is schema-valid, so catch it here and return the fix rather than
      // letting `source._source` throw a bare TypeError outside the try block.
      if (typeof source === 'string') {
        return {
          error: new Error(
            `threat_intel.fetch_source received "source" as a string ("${source.slice(
              0,
              80
            )}"). Pass the hit as \${{ foreach.item }} so it stays an object; {{ foreach.item }} stringifies it.`
          ),
        };
      }

      const stepLogger = deps.logger.get(
        'threatIntel',
        'fetch_source',
        source._source.adapter_type
      );

      const runContext: AdapterRunContext = {
        logger: stepLogger,
        abortSignal: context.abortSignal,
        now: () => new Date(),
      };

      try {
        const reports = await runAdapter(source, runContext);
        return {
          output: {
            adapter_type: source._source.adapter_type,
            source_id: source._id,
            total_fetched: reports.length,
            reports,
          },
        };
      } catch (err) {
        // Engine convention: a returned `error` is still a step
        // failure (see `BaseAtomicNodeImplementation`), but it lets us
        // attach a structured message instead of the raw stack. The
        // workflow's per-step `on-failure: continue: true` catches
        // these so a single misbehaving feed doesn't abort the run.
        const message = err instanceof Error ? err.message : String(err);
        stepLogger.warn(`Adapter failed for source ${source._id}: ${message}`);
        return {
          error:
            err instanceof UnknownAdapterError
              ? err
              : new Error(`Failed to fetch threat intelligence source ${source._id}: ${message}`),
        };
      }
    },
  });
