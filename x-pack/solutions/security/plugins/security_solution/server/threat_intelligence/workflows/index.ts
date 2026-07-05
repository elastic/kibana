/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import { asSpaceId } from '@kbn/core-spaces-common';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import DIGEST_DELIVERY_YAML from './digest_delivery.yaml';
import HIT_PROVENANCE_BACKFILL_YAML from './hit_provenance_backfill.yaml';
import NL_EXTRACTION_BEHAVIORAL_YAML from './nl_extraction_behavioral.yaml';
import SOURCE_INGESTION_YAML from './source_ingestion.yaml';

// Retry configuration for the startup-race window. workflowsManagement's
// internal startServices() promise resolves once all plugin starts complete,
// but the validation service may still be initialising connectors when our
// start() fires. Five attempts with exponential backoff (1s, 2s, 4s, 8s)
// covers a ~15 s window — enough to outlast any realistic boot lag.
const INSTALL_MAX_ATTEMPTS = 5;
const INSTALL_BASE_DELAY_MS = 1_000;

const DEFAULT_SPACE_ID = 'default';

// A minimal fake KibanaRequest used for background operations that have no
// real HTTP request (e.g. plugin start). getAuthenticatedUser falls back to
// 'system' when security is absent, so headers can be empty.
const buildSystemRequest = () =>
  kibanaRequestFactory({
    headers: {},
    route: { settings: {} },
    url: { href: '', hash: '' } as URL,
    raw: { req: { url: '/' } } as never,
    spaceId: asSpaceId(DEFAULT_SPACE_ID),
  });

/**
 * Built-in threat intelligence workflows. Each entry is upserted by stable
 * id at plugin start via `workflowsManagement.management.ensureBuiltinWorkflow`.
 *
 * Inline `yaml` import: the `@kbn/babel-register` Node transform turns
 * `import X from './foo.yaml'` into a string literal at module load time
 * (see `kbn-ambient-common-types`), so no runtime file I/O is needed and the
 * files are bundled with the plugin in the production build.
 */
export const BUILTIN_WORKFLOWS = [
  {
    id: 'threat-intel-source-ingestion',
    description:
      'Pull enabled .kibana-threat-intel-sources and write normalized reports to .kibana-threat-reports',
    yaml: SOURCE_INGESTION_YAML,
  },
  {
    id: 'threat-intel-nl-extraction-behavioral',
    description:
      'Extract IOCs + behaviors from freshly ingested threat reports (deduped by content_fingerprint)',
    yaml: NL_EXTRACTION_BEHAVIORAL_YAML,
  },
  {
    id: 'threat-intel-digest-delivery',
    description: 'Render and deliver per-subscription threat intelligence digests',
    yaml: DIGEST_DELIVERY_YAML,
  },
  {
    id: 'threat-intel-hit-provenance-backfill',
    description:
      'Attribute Detection Engine alerts back to their originating .kibana-threat-reports docs (Layers 1/2)',
    yaml: HIT_PROVENANCE_BACKFILL_YAML,
  },
] as const;

/**
 * Idempotently registers the bundled threat intelligence workflows with the
 * Workflows Management plugin. Built-ins live in the default space so they
 * are visible to operators from any space's Workflows UI.
 *
 * Retries up to INSTALL_MAX_ATTEMPTS times with exponential backoff to handle
 * the startup-race window where workflowsManagement's validation service may
 * not be fully ready when security_solution's start() fires.
 *
 * Partial failures (created.length < BUILTIN_WORKFLOWS.length) are treated as
 * errors, not warnings, so silent missing workflows cannot recur.
 *
 * Caller is expected to invoke this only when the optional
 * `workflowsManagement` plugin is present; the function takes the setup
 * contract directly so the caller's `if (workflowsManagement)` check stays
 * at the call site for readability.
 */
export const installBuiltinWorkflows = async ({
  workflowsManagement,
  logger,
  _delayFn = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
}: {
  workflowsManagement: WorkflowsServerPluginSetup;
  logger: Logger;
  /** Injected only in tests to avoid real timers. */
  _delayFn?: (ms: number) => Promise<void>;
}): Promise<void> => {
  const log = logger.get('install-builtin-workflows');

  // bulkCreateWorkflows requires a KibanaRequest for auth/validation. At plugin
  // start there is no real HTTP request, so we construct a minimal fake one scoped
  // to the default space. getAuthenticatedUser resolves to 'system' when the
  // security plugin is absent; with security present it reads headers which will
  // be empty, also yielding 'system'. This matches the standard Kibana pattern
  // used by entity-analytics background tasks (see risk_score/tasks/helpers.ts).
  const systemRequest = buildSystemRequest();
  const payload = BUILTIN_WORKFLOWS.map((wf) => ({ id: wf.id, yaml: wf.yaml }));

  for (let attempt = 1; attempt <= INSTALL_MAX_ATTEMPTS; attempt++) {
    const { created, failed } = await workflowsManagement.management.bulkCreateWorkflows(
      payload,
      DEFAULT_SPACE_ID,
      systemRequest,
      { overwrite: true }
    );

    for (const result of created) {
      log.debug(`Built-in workflow ${result.id} created/updated`);
    }

    const missingIds = BUILTIN_WORKFLOWS.map((wf) => wf.id).filter(
      (id) => !created.some((c) => c.id === id)
    );

    if (missingIds.length === 0) {
      // All registered successfully.
      return;
    }

    for (const failure of failed) {
      log.error(
        `Built-in workflow ${failure.id} failed to register (attempt ${attempt}/${INSTALL_MAX_ATTEMPTS}): ${failure.error}`
      );
    }

    if (attempt < INSTALL_MAX_ATTEMPTS) {
      const delayMs = INSTALL_BASE_DELAY_MS * Math.pow(2, attempt - 1);
      log.warn(
        `${
          missingIds.length
        } built-in workflow(s) not registered after attempt ${attempt}; retrying in ${delayMs}ms. Missing: ${missingIds.join(
          ', '
        )}`
      );
      await _delayFn(delayMs);
    } else {
      log.error(
        `Built-in workflow registration failed after ${INSTALL_MAX_ATTEMPTS} attempts. Missing: ${missingIds.join(
          ', '
        )}. The threat intelligence dashboard will not run autonomously until workflows are manually re-registered or Kibana is restarted.`
      );
    }
  }
};
