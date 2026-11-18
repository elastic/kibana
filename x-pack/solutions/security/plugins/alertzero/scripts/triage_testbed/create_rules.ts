/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Creates the generated rules in Kibana as disabled detection rules, and writes `rule_map.json`
 * (generated rule uuid to the saved-object id that Kibana gave the rule). The replayer uses the map, so that
 * `kibana.alert.rule.uuid` of an alert points to a rule that exists. A run twice does not create a rule twice.
 *
 * Safety: the script writes only if the Elasticsearch that Kibana must use (`--expect-es`) already holds
 * Kibana saved-object indices and has the cluster name `--expect-cluster`. A Kibana started without
 * `--es-host` talks to the Elasticsearch on port 9200, which can belong to another session.
 *
 * Usage:
 *   node x-pack/solutions/security/plugins/alertzero/scripts/triage_testbed/create_rules_cli.js \
 *     --data <folder with rules.json> --kibana http://localhost:5601 \
 *     --expect-es http://localhost:9220 --expect-cluster az-onweek
 *   The user and password come from the variable ES_AUTH (default elastic:changeme, the local snapshot default).
 */

import fs from 'fs';
import path from 'path';

export type Severity = 'low' | 'medium' | 'high' | 'critical';

/** A generated rule as `rules.json` holds it. */
export interface GeneratedRule {
  uuid: string;
  name: string;
  kind: string;
  severity: Severity;
  buildingBlock?: boolean;
}

export interface CreateRulesArgs {
  data: string;
  kibana: string;
  expectEs: string;
  expectCluster: string;
}

export type RuleBody = Readonly<Record<string, string | number | boolean | readonly string[]>>;

interface CallResponse<T> {
  status: number;
  body: T | undefined;
  text: string;
}

interface ClusterInfo {
  cluster_name: string;
}

const RISK_SCORE: Readonly<Record<Severity, number>> = {
  low: 21,
  medium: 47,
  high: 73,
  critical: 99,
};
const CONCURRENCY = 8;

export const parseArgs = (argv: readonly string[]): CreateRulesArgs => {
  const flags: Readonly<Record<string, keyof CreateRulesArgs>> = {
    '--data': 'data',
    '--kibana': 'kibana',
    '--expect-es': 'expectEs',
    '--expect-cluster': 'expectCluster',
  };
  const args: Partial<CreateRulesArgs> = {};
  for (let i = 2; i < argv.length; i++) {
    const key = flags[argv[i]];
    if (!key) throw new Error(`unknown argument ${argv[i]}`);
    args[key] = argv[++i];
  }
  Object.values(flags).forEach((name) => {
    if (!args[name])
      throw new Error(`--${name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)} is required`);
  });
  return args as CreateRulesArgs;
};

const auth = (): string =>
  `Basic ${Buffer.from(process.env.ES_AUTH ?? 'elastic:changeme').toString('base64')}`;

const call = async <T>(
  base: string,
  method: string,
  url: string,
  body?: object
): Promise<CallResponse<T>> => {
  const response = await fetch(`${base}${url}`, {
    method,
    headers: { Authorization: auth(), 'Content-Type': 'application/json', 'kbn-xsrf': 'true' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  const isJson = (response.headers.get('content-type') ?? '').includes('json');
  return {
    status: response.status,
    body: isJson && text ? (JSON.parse(text) as T) : undefined,
    text,
  };
};

export const ruleBody = (rule: GeneratedRule): RuleBody => ({
  rule_id: rule.uuid,
  name: rule.name,
  description: `Generated test rule (${rule.kind}). It never runs.`,
  type: 'query',
  language: 'kuery',
  query: '*:*',
  // An index pattern that matches nothing, in case the rule is ever enabled by mistake.
  index: ['az-testbed-never-exists-*'],
  severity: rule.severity,
  risk_score: RISK_SCORE[rule.severity],
  interval: '5m',
  from: 'now-6m',
  enabled: false,
  tags: ['az-testbed'],
  ...(rule.buildingBlock ? { building_block_type: 'default' } : {}),
});

export const createOne = async (kibana: string, rule: GeneratedRule): Promise<string> => {
  const created = await call<{ id: string }>(
    kibana,
    'POST',
    '/api/detection_engine/rules',
    ruleBody(rule)
  );
  if (created.status === 200 && created.body) return created.body.id;
  if (created.status === 409) {
    const found = await call<{ id: string }>(
      kibana,
      'GET',
      `/api/detection_engine/rules?rule_id=${encodeURIComponent(rule.uuid)}`
    );
    if (found.status === 200 && found.body) return found.body.id;
  }
  throw new Error(
    `rule "${rule.name}" failed with ${created.status}: ${created.text.slice(0, 300)}`
  );
};

export const main = async (): Promise<void> => {
  const args = parseArgs(process.argv);
  const rules = JSON.parse(
    fs.readFileSync(path.join(args.data, 'rules.json'), 'utf8')
  ) as GeneratedRule[];

  const root = await call<ClusterInfo>(args.expectEs, 'GET', '/');
  if (root.status !== 200 || root.body?.cluster_name !== args.expectCluster) {
    throw new Error(
      `refusing to write: cluster at ${args.expectEs} is "${root.body?.cluster_name}", expected "${args.expectCluster}"`
    );
  }
  const savedObjectIndices = await call<undefined>(
    args.expectEs,
    'GET',
    '/_cat/indices/.kibana*?h=index&expand_wildcards=all'
  );
  if (!savedObjectIndices.text.trim()) {
    throw new Error(
      `refusing to write: ${args.expectEs} has no .kibana indices, so Kibana at ${args.kibana} is probably connected to another Elasticsearch`
    );
  }

  const map: Record<string, string> = {};
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < rules.length) {
      const rule = rules[next++];
      map[rule.uuid] = await createOne(args.kibana, rule);
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const sortedMap = Object.fromEntries(Object.entries(map).sort(([a], [b]) => a.localeCompare(b)));
  fs.writeFileSync(path.join(args.data, 'rule_map.json'), JSON.stringify(sortedMap, null, 2));
  process.stdout.write(
    `${JSON.stringify({
      rules: rules.length,
      mapped: Object.keys(map).length,
      out: path.join(args.data, 'rule_map.json'),
    })}\n`
  );
};
