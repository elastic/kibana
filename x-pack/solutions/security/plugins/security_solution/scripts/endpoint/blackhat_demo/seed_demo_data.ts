/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { run } from '@kbn/dev-cli-runner';
import { createEsClient } from '../common/stack_services';
import { seedForensicTimeline, FORENSIC_HOSTS } from './forensic_seed_data';
import { seedBlackhatDemoData, cleanupBlackhatDemoData, DEMO_HOSTS } from './demo_data';

/**
 * Resolves each demo hostname to its REAL Fleet-enrolled agent UUID via the
 * Kibana Fleet API, so seeded telemetry's `agent.id` matches the agent that
 * will actually answer `osquery.run_live_query` dispatches — a fabricated
 * `blackhat-demo-*` id would seed cosmetically correct ES|QL rows but break
 * every live-query hop the forensic skill's mutex/hunt guidance depends on.
 */
async function resolveAgentIds(
  kibanaUrl: string,
  auth: { username: string; password: string } | { apiKey: string },
  hostnames: string[]
): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'kbn-xsrf': 'true' };
  if ('apiKey' in auth) {
    headers.Authorization = `ApiKey ${auth.apiKey}`;
  }
  const basicAuth: Record<string, string> =
    'username' in auth
      ? {
          Authorization: `Basic ${Buffer.from(`${auth.username}:${auth.password}`).toString(
            'base64'
          )}`,
        }
      : {};

  const response = await fetch(`${kibanaUrl}/api/fleet/agents?perPage=200`, {
    headers: { ...headers, ...basicAuth },
  });
  if (!response.ok) {
    throw new Error(`Fleet agents lookup failed: ${response.status} ${await response.text()}`);
  }
  const body = (await response.json()) as {
    items: Array<{ id: string; local_metadata?: { host?: { hostname?: string } } }>;
  };

  const result: Record<string, string> = {};
  for (const hostname of hostnames) {
    const match = body.items.find((item) => item.local_metadata?.host?.hostname === hostname);
    if (match) {
      result[hostname] = match.id;
    }
  }
  return result;
}

/**
 * Standalone seeder for the BlackHat 2026 demo project (deployed serverless
 * security project from PR #278636, NOT the local dev stack).
 *
 * The eval-suite's own `forensic_data.ts` kill chain (WKSTN-RECV01 →
 * SRV-DC01) is normally seeded by the eval harness' local bootstrap — that
 * bootstrap never runs against a remote deployed project, so this script
 * seeds it directly here too. On top of that it adds what only the LIVE
 * demo needs: WIN-FIN-03 (hunt target) + the ransomware alert (entry point).
 *
 * Usage:
 *   node --require ./src/setup_node_env \
 *     x-pack/solutions/security/plugins/security_solution/scripts/endpoint/blackhat_demo/seed_demo_data.ts \
 *     --node https://<deployed-project>.es.<region>.aws.elastic.cloud \
 *     --apiKey <base64 api key>
 *
 *   # or username/password:
 *   ... --node <es-url> --username elastic --password <pw>
 *
 *   # to wipe and reseed:
 *   ... --node <es-url> --apiKey <key> --cleanup
 */
run(
  async ({ log, flags }) => {
    const node = flags.node as string;
    const kibana = flags.kibana as string | undefined;
    const apiKey = flags.apiKey as string | undefined;
    const username = (flags.username as string | undefined) ?? 'elastic';
    const password = flags.password as string | undefined;
    const cleanup = Boolean(flags.cleanup);

    if (!node) {
      throw new Error('--node <elasticsearch url> is required');
    }
    if (!apiKey && !password) {
      throw new Error('Either --apiKey or --username/--password must be provided');
    }

    const esClient = createEsClient({
      url: node,
      username,
      password: password ?? '',
      apiKey,
      log,
    });

    if (cleanup) {
      log.info('Cleaning up prior blackhat-demo-* seed data...');
      await cleanupBlackhatDemoData({ esClient });
    }

    let agentIdOverrides: Record<string, string> = {};
    if (kibana) {
      log.info('Resolving real Fleet agent IDs for seeded hostnames...');
      agentIdOverrides = await resolveAgentIds(
        kibana,
        apiKey ? { apiKey } : { username, password: password ?? '' },
        [FORENSIC_HOSTS.patientZero, FORENSIC_HOSTS.domainController, DEMO_HOSTS.lateralFinance]
      );
      const missing = [
        FORENSIC_HOSTS.patientZero,
        FORENSIC_HOSTS.domainController,
        DEMO_HOSTS.lateralFinance,
      ].filter((h) => !agentIdOverrides[h]);
      if (missing.length > 0) {
        log.warning(
          `No enrolled agent found for: ${missing.join(
            ', '
          )} — those hosts will seed with fabricated agent ids and won't answer live osquery dispatches.`
        );
      } else {
        log.info(`Resolved agent ids: ${JSON.stringify(agentIdOverrides)}`);
      }
    } else {
      log.warning(
        '--kibana not provided — seeding with fabricated agent.id values. Live osquery dispatches (mutex row, hunt) will not resolve to real hosts. Pass --kibana <url> to fix.'
      );
    }

    log.info('Seeding forensic kill-chain timeline (WKSTN-RECV01 -> SRV-DC01)...');
    await seedForensicTimeline({ esClient }, log, undefined, agentIdOverrides);

    await seedBlackhatDemoData({ esClient }, log, undefined, agentIdOverrides);
    log.success('BlackHat demo data seeded.');
  },
  {
    description:
      'Seeds the WIN-FIN-03 lateral-infection events + ransomware alert into a deployed BlackHat demo project',
    flags: {
      string: ['node', 'kibana', 'apiKey', 'username', 'password'],
      boolean: ['cleanup'],
      help: `
        --node        Elasticsearch URL of the deployed project (required)
        --kibana      Kibana URL of the deployed project — resolves real Fleet agent ids so live osquery dispatches work (strongly recommended)
        --apiKey      API key for auth (preferred over username/password)
        --username    Kibana/ES username (default: elastic)
        --password    Kibana/ES password
        --cleanup     Delete any previously-seeded blackhat-demo-* docs before reseeding
      `,
    },
  }
);
