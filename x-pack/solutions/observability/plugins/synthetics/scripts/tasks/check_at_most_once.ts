/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

import { Client } from '@elastic/elasticsearch';
import { readKibanaConfig } from '@kbn/observability-synthetics-test-data';
import { findAtMostOnceViolations } from '../../server/synthetics_service/private_location/at_most_once_check';

interface CliArgs {
  from?: string;
  to?: string;
  minutes: number;
}

const parseArgs = (): CliArgs => {
  const argv = process.argv.slice(2);
  const flag = (name: string) => {
    const idx = argv.indexOf(`--${name}`);
    return idx === -1 ? undefined : argv[idx + 1];
  };
  return {
    from: flag('from'),
    to: flag('to'),
    minutes: Number(flag('minutes') ?? '60'),
  };
};

const isKibanaSystemUser = (username: string | undefined) =>
  username === 'kibana_system' || username === 'kibana_system_user';

const buildEsClient = (): Client => {
  try {
    const config = readKibanaConfig();
    const node = config.elasticsearch?.hosts;
    if (node) {
      const rawUser = config.elasticsearch?.username;
      const esUsername = isKibanaSystemUser(rawUser) || !rawUser ? 'elastic' : rawUser;
      const esPassword = config.elasticsearch?.password;
      const verificationMode = config.elasticsearch?.ssl?.verificationMode;
      return new Client({
        node: Array.isArray(node) ? node[0] : node,
        auth: esUsername && esPassword ? { username: esUsername, password: esPassword } : undefined,
        tls: verificationMode === 'none' ? { rejectUnauthorized: false } : undefined,
      });
    }
  } catch {
    // fall through to defaults
  }
  return new Client({
    node: 'http://localhost:9200',
    auth: { username: 'elastic', password: 'changeme' },
  });
};

/**
 * At-most-once harness CLI: runs the `synthetics-*` ES|QL invariant check
 * (see `at_most_once_check.ts`) against a live cluster and reports any
 * monitor whose checks were written by more than one Fleet agent within the
 * window — evidence for the acceptance criteria of elastic/kibana#281846.
 *
 * Usage:
 *   node scripts/check_at_most_once.js [--minutes 60] [--from <iso>] [--to <iso>]
 *
 * Exits non-zero when a violation is found, so it can gate a load/scale test
 * run in CI or a shell pipeline.
 */
export const checkAtMostOnce = async () => {
  const args = parseArgs();
  const to = args.to ?? new Date().toISOString();
  const from = args.from ?? new Date(Date.parse(to) - args.minutes * 60 * 1000).toISOString();

  console.log(`Checking at-most-once invariant over ${from} .. ${to}`);

  const esClient = buildEsClient();
  const violations = await findAtMostOnceViolations(esClient, { from, to });

  if (violations.length === 0) {
    console.log('✓ No monitor ran on more than one agent in the window.');
    return;
  }

  console.log(`✗ ${violations.length} monitor(s) ran on more than one agent:`);
  for (const { monitorId, distinctAgents, agentIds } of violations) {
    console.log(`  - ${monitorId}: ${distinctAgents} agents [${agentIds.join(', ')}]`);
  }
  process.exitCode = 1;
};
