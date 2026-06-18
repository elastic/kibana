/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildScenarioModule, quote } from '@kbn/synthtrace-scenario-codegen';
import type { ReconstructedInfra } from './reconstruct';

export interface InfraCodegenOptions {
  /** Human-readable description of what was captured, recorded in the file header. */
  description?: string;
  /** Source cluster description, recorded in the file header for provenance. */
  source?: string;
  /** Whether host names were anonymized. */
  scrubbed?: boolean;
  /** Whether the capture hit the document cap and is therefore partial. */
  truncated?: boolean;
}

/**
 * Fixed (capture-size-independent) runtime code that rebuilds the `infra.host(...)` events from
 * the `captured` data literal. Emitted verbatim into every scenario so the module declares only a
 * handful of variables regardless of capture size (no per-event `const`, which would otherwise
 * hit the JS engine's per-function variable ceiling on large captures).
 */
const BUILDER_RUNTIME = `      const hostNames = new Map(captured.hosts.map((host) => [host.id, host.name]));
      const hostMeta = new Map(captured.hosts.map((host) => [host.id, host.meta || {}]));
      const ecsHosts = new Map();
      const semconvHosts = new Map();
      // Apply captured host-constant metadata (OS, cloud, architecture, ...) to the host's base
      // identity once, so it propagates to every metric doc and the Hosts view renders it verbatim.
      const getEcsHost = (id) => {
        let host = ecsHosts.get(id);
        if (!host) {
          host = infra.host(hostNames.get(id)).overrides(hostMeta.get(id));
          ecsHosts.set(id, host);
        }
        return host;
      };
      const getSemconvHost = (id) => {
        let host = semconvHosts.get(id);
        if (!host) {
          host = infra.semconvHost(hostNames.get(id)).overrides(hostMeta.get(id));
          semconvHosts.set(id, host);
        }
        return host;
      };

      const buildSample = (sample) => {
        const ts = start + sample.offset;
        const fields = sample.fields || {};
        // Semconv (OTel hostmetrics): emit the captured document verbatim (numeric metrics + the
        // state/direction dimensions) on top of the host's semconv identity.
        if (sample.schema === 'semconv') {
          return getSemconvHost(sample.host).metricset(fields).timestamp(ts);
        }
        // ECS (metricbeat/system): pick the matching builder so \`metricset.name\` (and index
        // routing) is correct, then apply every captured numeric field via \`.overrides\`.
        const host = getEcsHost(sample.host);
        switch (sample.method) {
          case 'memory':
            return host.memory().overrides(fields).timestamp(ts);
          case 'network':
            return host.network().overrides(fields).timestamp(ts);
          case 'filesystem':
            return host.filesystem().overrides(fields).timestamp(ts);
          case 'diskio':
            return host.diskio().overrides(fields).timestamp(ts);
          case 'load':
            return host.load().overrides(fields).timestamp(ts);
          case 'core':
            return host.core().overrides(fields).timestamp(ts);
          case 'cpu':
          default:
            return host.cpu().overrides(fields).timestamp(ts);
        }
      };

      const rootEvents = captured.samples.map(buildSample);`;

/**
 * Renders a reconstructed host-metrics capture as a runnable `@kbn/synthtrace` scenario module
 * built on the `infra.host(...)` DSL. Emits the capture as a single `captured` data literal
 * (hosts + metric samples) plus a fixed builder loop, sharing the deterministic, multi-worker-safe
 * module shell (absolute anchoring + first-bucket guard + degenerate warning) with the APM tool.
 */
export const generateInfraScenario = (
  infra: ReconstructedInfra,
  options: InfraCodegenOptions
): string => {
  const captured = {
    hosts: infra.hosts.map((host, index) => ({
      id: `h${index + 1}`,
      name: host.name,
      meta: host.metadata,
    })),
    samples: infra.samples.map((sample) => ({
      host: `h${sample.hostIndex + 1}`,
      schema: sample.schema,
      method: sample.method,
      fields: sample.fields,
      offset: sample.offsetMs,
    })),
  };

  // Emit the capture as a JSON string parsed at runtime rather than a literal object. A large
  // capture serialized as an object literal becomes a single multi-MB expression that Babel (via
  // synthtrace's @babel/register) parses into millions of AST nodes, exhausting the heap. A string
  // literal + JSON.parse is parsed as one node and stays cheap regardless of capture size.
  const body = `      const captured = JSON.parse(${quote(JSON.stringify(captured))});\n\n${BUILDER_RUNTIME}`;

  return buildScenarioModule({
    fieldsType: 'InfraDocument',
    clientVarName: 'infraEsClient',
    imports: [
      "import type { InfraDocument } from '@kbn/synthtrace-client';",
      "import { infra } from '@kbn/synthtrace-client';",
    ],
    startMs: infra.startMs,
    endMs: infra.endMs,
    documentCount: infra.documentCount,
    // Host metrics don't use a service environment, so skip the ENVIRONMENT declaration/import.
    includeEnvironment: false,
    provenanceLines: [
      options.description ? ` * ${options.description}` : undefined,
      options.source ? ` * Source: ${options.source}` : undefined,
      options.scrubbed ? ' * Host names were anonymized.' : undefined,
      ` * ${infra.hosts.length} host(s), ${infra.documentCount} metric document(s), ${infra.samples.length} sample(s).`,
      options.truncated
        ? ' * NOTE: the capture hit the document cap and is therefore partial.'
        : undefined,
    ],
    body,
  });
};
