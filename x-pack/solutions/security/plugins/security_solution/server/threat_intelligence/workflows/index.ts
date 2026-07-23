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
import DELIVER_THREAT_DIGESTS_YAML from './deliver_threat_digests.yaml';
import ATTRIBUTE_ALERTS_TO_REPORTS_YAML from './attribute_alerts_to_reports.yaml';
import ENRICH_THREAT_REPORT_YAML from './enrich_threat_report.yaml';
import INGEST_THREAT_FEEDS_YAML from './ingest_threat_feeds.yaml';
import CONTINUOUS_THREAT_HUNT_YAML from './continuous_threat_hunt.yaml';

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
    id: 'threat-intel-ingest-threat-feeds',
    description:
      'Pull enabled .kibana-threat-intel-sources and write normalized reports to .kibana-threat-reports',
    yaml: INGEST_THREAT_FEEDS_YAML,
  },
  {
    id: 'threat-intel-enrich-threat-report',
    description:
      'Extract IOCs + behaviors from freshly ingested threat reports (deduped by content_fingerprint)',
    yaml: ENRICH_THREAT_REPORT_YAML,
  },
  {
    id: 'threat-intel-deliver-threat-digests',
    description: 'Build and deliver per-subscription threat intelligence digests',
    yaml: DELIVER_THREAT_DIGESTS_YAML,
  },
  {
    id: 'threat-intel-attribute-alerts-to-reports',
    description:
      'Attribute Detection Engine alerts back to their originating .kibana-threat-reports docs',
    yaml: ATTRIBUTE_ALERTS_TO_REPORTS_YAML,
  },
  {
    id: 'threat-intel-continuous-threat-hunt',
    description:
      'Schedule continuous hunts against top threat reports and persist findings for Intelligence Hub',
    yaml: CONTINUOUS_THREAT_HUNT_YAML,
  },
] as const;

/**
 * Idempotently registers the bundled threat intelligence workflows with the
 * Workflows Management plugin. Built-ins live in the default space so they
 * are visible to operators from any space's Workflows UI.
 *
 * Caller is expected to invoke this only when the optional
 * `workflowsManagement` plugin is present; the function takes the setup
 * contract directly so the caller's `if (workflowsManagement)` check stays
 * at the call site for readability.
 */
export const installBuiltinWorkflows = async ({
  workflowsManagement,
  logger,
}: {
  workflowsManagement: WorkflowsServerPluginSetup;
  logger: Logger;
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
    return;
  }

  const failureDetails = failed.map((f) => `${f.id}: ${f.error}`).join('; ');

  log.error(
    `Built-in workflow registration failed. Missing: ${missingIds.join(', ')}${
      failureDetails ? ` — ${failureDetails}` : ''
    }. The threat intelligence dashboard will not run autonomously until workflows are manually re-registered or Kibana is restarted.`
  );
};
