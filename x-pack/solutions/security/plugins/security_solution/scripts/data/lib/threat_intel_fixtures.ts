/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { listPacks } from '../packs';
import { getStatusCode } from './type_guards';

/**
 * Mustard TI hub index names (PR 275243). Keep aligned with
 * `common/threat_intelligence/hub/constants.ts` on the mustard branch.
 * This generator branch cannot import those constants.
 */
export const THREAT_INTEL_SOURCES_INDEX = '.kibana-threat-intel-sources';
export const THREAT_INTEL_SUBSCRIPTIONS_INDEX = '.kibana-threat-intel-subscriptions';
export const THREAT_REPORTS_DATA_STREAM = '.kibana-threat-reports';

export const THREAT_INTEL_SUBSCRIPTION_ID = 'threat-intel-digest';

/** Previous TI fixture ids (pre-rename). Still deleted by --clean. */
const LEGACY_THREAT_INTEL_SOURCE_IDS = [
  'data-generator-ti-rss-okta',
  'data-generator-ti-rss-aws-iam',
  'data-generator-ti-rss-kubernetes',
  'data-generator-ti-rss-github-actions',
] as const;

const LEGACY_THREAT_INTEL_SUBSCRIPTION_IDS = ['data-generator-threat-intel-digest'] as const;

/**
 * Classic IOC types mustard `hunt_for_threat` can term-match into pack telemetry.
 * These are environment join keys — not MITRE ids or event.action strings.
 */
export type PackTiJoinIocType = 'ip' | 'email' | 'user';

export interface PackTiJoinIoc {
  type: PackTiJoinIocType;
  /** Canonical (fanged) value expected on pack ECS after enrich. */
  value: string;
  /** Defanged form that must appear in RSS for discriminating extraction. */
  defanged?: string;
}

export interface PackTiScenario {
  packId: string;
  sourceId: string;
  name: string;
  title: string;
  body: string;
  /**
   * Environment join keys. Must appear in the RSS body (value + optional
   * defanged) AND on pack docs after `ensureEcsSourceIp` + `enrichDocForGraph`
   * in the ECS fields mustard hunt searches.
   */
  joinIocs: PackTiJoinIoc[];
  /**
   * Narrative anchors for RSS flavor / hunt-rule pairing (MITRE, event.action,
   * ARNs, short nicknames). Must appear in RSS; not required on pack ECS.
   */
  narrative: string[];
  tags: string[];
  mitre: string[];
}

/** Flat list of strings that must appear in the RSS XML payload. */
export const scenarioRssMustContain = (scenario: PackTiScenario): string[] => {
  const out: string[] = [];
  for (const ioc of scenario.joinIocs) {
    out.push(ioc.value);
    if (ioc.defanged) out.push(ioc.defanged);
  }
  out.push(...scenario.narrative);
  return out;
};

/**
 * ECS fields mustard `buildIocShould` searches for each join type.
 * Kept local to this generator branch (cannot import mustard constants).
 */
export const PACK_TI_HUNT_JOIN_FIELDS: Record<PackTiJoinIocType, readonly string[]> = {
  ip: [
    'source.ip',
    'destination.ip',
    'host.ip',
    'client.ip',
    'server.ip',
    'related.ip',
    'kubernetes.audit.sourceIPs',
  ],
  email: ['user.email', 'user.name', 'user.target.email', 'user.target.name', 'related.user'],
  user: ['user.name', 'user.email', 'user.target.name', 'user.target.email', 'related.user'],
};

const asStringValues = (value: unknown): string[] => {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string');
  return [];
};

/**
 * Collect string values for an ECS field path. Pack ndjson often stores
 * compound fields as a single dotted key (`"user.target": { email }`) rather
 * than nested `user.target.email`, so we try flat-prefix resolution first.
 */
const collectEcsFieldStrings = (doc: Record<string, unknown>, pathExpr: string): string[] => {
  const direct = asStringValues(doc[pathExpr]);
  if (direct.length) return direct;

  // Flat parent key + leaf (e.g. user.target + email).
  const lastDot = pathExpr.lastIndexOf('.');
  if (lastDot > 0) {
    const parentKey = pathExpr.slice(0, lastDot);
    const leaf = pathExpr.slice(lastDot + 1);
    const parent = doc[parentKey];
    if (parent && typeof parent === 'object' && !Array.isArray(parent)) {
      const fromFlatParent = asStringValues((parent as Record<string, unknown>)[leaf]);
      if (fromFlatParent.length) return fromFlatParent;
    }
  }

  // Nested walk (related.ip, kubernetes.audit.sourceIPs, user.email, …).
  const parts = pathExpr.split('.');
  let cur: unknown = doc;
  for (const part of parts) {
    if (cur == null || typeof cur !== 'object' || Array.isArray(cur)) return [];
    cur = (cur as Record<string, unknown>)[part];
  }
  return asStringValues(cur);
};

/** Union of mustard hunt field values across enriched pack docs for one join type. */
export const collectPackJoinFieldValues = (
  docs: Array<Record<string, unknown>>,
  type: PackTiJoinIocType
): Set<string> => {
  const values = new Set<string>();
  for (const doc of docs) {
    for (const field of PACK_TI_HUNT_JOIN_FIELDS[type]) {
      for (const v of collectEcsFieldStrings(doc, field)) values.add(v);
    }
  }
  return values;
};

export const PACK_TI_SCENARIOS: Record<string, PackTiScenario> = {
  okta: {
    packId: 'okta',
    sourceId: 'ti-rss-okta',
    name: 'Okta identity takeover feed',
    title: 'Okta identity takeover via stolen sessions from Russian IP space',
    body:
      'Threat actors are abusing stolen Okta sessions from Russian IP 192[.]0[.]2[.]50 ' +
      '(192.0.2.50) to reset passwords, strip MFA (user.mfa.factor.deactivate), and grant Super ' +
      'Admin to finance and IT accounts including cfo@corp.example and it-admin@corp.example. ' +
      'Follow-on activity includes system.api_token.create and privileged app group membership. ' +
      'Hunt ATT&CK T1078.004, T1556, T1098, and T1136.003 across okta.system telemetry.',
    joinIocs: [
      { type: 'ip', value: '192.0.2.50', defanged: '192[.]0[.]2[.]50' },
      { type: 'email', value: 'cfo@corp.example' },
      { type: 'email', value: 'it-admin@corp.example' },
    ],
    narrative: ['user.mfa.factor.deactivate', 'T1078.004', 'T1556', 'T1098', 'T1136.003'],
    tags: ['threat-intel', 'pack:okta', 'okta', 'identity'],
    mitre: ['T1078.004', 'T1556', 'T1098', 'T1136.003'],
  },
  'aws-iam': {
    packId: 'aws-iam',
    sourceId: 'ti-rss-aws-iam',
    name: 'AWS IAM privilege escalation feed',
    title: 'AWS IAM privilege escalation and data theft in account 123456789012',
    body:
      'Researchers report IAM abuse in AWS account 123456789012 where compromised user ' +
      'dev-user@corp.example (source IP 192[.]0[.]2[.]30 / 192.0.2.30) attaches AdministratorAccess, ' +
      'assumes escalated-role, and exfiltrates from S3 bucket corp-prod-data. Post-escalation ' +
      'activity from 192[.]0[.]2[.]31 (192.0.2.31) includes GetSecretValue on prod/db-credentials ' +
      'plus StopLogging and DeleteTrail for defense evasion. Hunt ATT&CK T1098.001, T1078.004, ' +
      'and T1562.008 in aws.cloudtrail logs.',
    joinIocs: [
      { type: 'ip', value: '192.0.2.30', defanged: '192[.]0[.]2[.]30' },
      { type: 'ip', value: '192.0.2.31', defanged: '192[.]0[.]2[.]31' },
      { type: 'email', value: 'dev-user@corp.example' },
      { type: 'user', value: 'dev-user' },
    ],
    narrative: [
      '123456789012',
      'AdministratorAccess',
      'corp-prod-data',
      'prod/db-credentials',
      'StopLogging',
      'T1098.001',
      'T1078.004',
      'T1562.008',
    ],
    tags: ['threat-intel', 'pack:aws-iam', 'aws', 'cloud-security'],
    mitre: ['T1098.001', 'T1078.004', 'T1562.008'],
  },
  kubernetes: {
    packId: 'kubernetes',
    sourceId: 'ti-rss-kubernetes',
    name: 'Kubernetes audit abuse feed',
    title: 'Compromised Kubernetes service account escalates in prod-us-east-1',
    body:
      'A compromised service account system:serviceaccount:default:compromised-sa in cluster ' +
      'prod-us-east-1 is reading production secrets including db-credentials and creating ' +
      'clusterrolebindings/escalation-binding to cluster-admin. Activity from 192[.]0[.]2[.]60 ' +
      '(192.0.2.60) also includes pod exec against exec-pod, kube-system ConfigMap tampering, ' +
      'and audit cleanup. Hunt ATT&CK T1552.007, T1078, and T1610 in kubernetes.audit logs.',
    joinIocs: [
      { type: 'ip', value: '192.0.2.60', defanged: '192[.]0[.]2[.]60' },
      // Full SA principal — short "compromised-sa" alone is narrative only (not term-matchable).
      { type: 'user', value: 'system:serviceaccount:default:compromised-sa' },
    ],
    narrative: [
      'compromised-sa',
      'prod-us-east-1',
      'db-credentials',
      'escalation-binding',
      'exec-pod',
      'T1552.007',
      'T1078',
      'T1610',
    ],
    tags: ['threat-intel', 'pack:kubernetes', 'kubernetes', 'containers'],
    mitre: ['T1552.007', 'T1078', 'T1610'],
  },
  'github-actions': {
    packId: 'github-actions',
    sourceId: 'ti-rss-github-actions',
    name: 'GitHub supply-chain abuse feed',
    title: 'GitHub org corp-example contractor account enables supply-chain abuse',
    body:
      'Contractor account dev-contractor-42@corp.example in GitHub org corp-example ' +
      '(IP 192[.]0[.]2[.]70 / 192.0.2.70) is making corp-example/payment-service public, creating ' +
      'deploy keys (deploy_key.create), and inviting malicious-actor-x@external.example as org ' +
      'admin. The same actor dismisses secret scanning alerts, bypasses branch protection, and ' +
      'completes fork-triggered workflows while minting fine-grained PATs. Hunt ATT&CK T1567, ' +
      'T1098, and T1195 in github.audit telemetry.',
    joinIocs: [
      { type: 'ip', value: '192.0.2.70', defanged: '192[.]0[.]2[.]70' },
      { type: 'email', value: 'dev-contractor-42@corp.example' },
      { type: 'user', value: 'dev-contractor-42' },
      { type: 'email', value: 'malicious-actor-x@external.example' },
    ],
    narrative: ['corp-example', 'payment-service', 'deploy_key.create', 'T1567', 'T1098', 'T1195'],
    tags: ['threat-intel', 'pack:github-actions', 'github', 'supply-chain'],
    mitre: ['T1567', 'T1098', 'T1195'],
  },
};
export const allThreatIntelSourceIds = (): string[] =>
  Object.values(PACK_TI_SCENARIOS).map((s) => s.sourceId);

export const resolveThreatIntelPackIds = (packIds: string[]): string[] => {
  if (packIds.length > 0) return packIds;
  return listPacks().map((p) => p.id);
};

const xmlEscape = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const cdata = (value: string): string =>
  `<![CDATA[${value.replace(/\]\]>/g, ']]]]><![CDATA[>')}]]>`;

const timestampAt = (startMs: number, endMs: number, ratio: number): string =>
  new Date(Math.round(startMs + (endMs - startMs) * ratio)).toISOString();

export const buildPackRssDataUrl = ({
  scenario,
  reportTimestamp,
}: {
  scenario: PackTiScenario;
  reportTimestamp: string;
}): string => {
  const guid = `ti-report-${scenario.packId}`;
  const mitreLine = scenario.mitre.length ? ` Techniques: ${scenario.mitre.join(', ')}.` : '';
  const description = `${scenario.body}${mitreLine}`;
  const feedBody = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${xmlEscape(scenario.name)}</title>
    <link>https://example.elastic.dev/threat-intel/${xmlEscape(scenario.packId)}</link>
    <language>en</language>
    <item>
      <title>${xmlEscape(scenario.title)}</title>
      <guid isPermaLink="false">${xmlEscape(guid)}</guid>
      <link>https://example.elastic.dev/threat-intel/${xmlEscape(scenario.packId)}/primary</link>
      <pubDate>${new Date(reportTimestamp).toUTCString()}</pubDate>
      <description>${cdata(description)}</description>
    </item>
  </channel>
</rss>`;

  return `data:application/rss+xml;charset=utf-8,${encodeURIComponent(feedBody)}`;
};

const ensurePlainIndex = async ({
  esClient,
  index,
  log,
}: {
  esClient: Client;
  index: string;
  log: ToolingLog;
}): Promise<void> => {
  const exists = await esClient.indices.exists({ index });
  if (exists) return;
  try {
    await esClient.indices.create({
      index,
      mappings: {
        dynamic: true,
        properties: {
          adapter_type: { type: 'keyword' },
          name: { type: 'keyword' },
          enabled: { type: 'boolean' },
          tags: { type: 'keyword' },
          space_id: { type: 'keyword' },
          owner: { type: 'keyword' },
          created_at: { type: 'date' },
          updated_at: { type: 'date' },
        },
      },
    });
    log.info(`Created ${index} for threat-intel fixtures.`);
  } catch (e) {
    const status = getStatusCode(e);
    if (status === 400) {
      // Race: another process created it.
      return;
    }
    throw e;
  }
};

export const cleanThreatIntelFixtures = async ({
  esClient,
  log,
  packIds,
}: {
  esClient: Client;
  log: ToolingLog;
  packIds?: string[];
}): Promise<void> => {
  const scenarios =
    packIds && packIds.length > 0
      ? packIds.map((id) => PACK_TI_SCENARIOS[id]).filter(Boolean)
      : Object.values(PACK_TI_SCENARIOS);
  const sourceIds = [...scenarios.map((s) => s.sourceId), ...LEGACY_THREAT_INTEL_SOURCE_IDS];
  const subscriptionIds = [THREAT_INTEL_SUBSCRIPTION_ID, ...LEGACY_THREAT_INTEL_SUBSCRIPTION_IDS];

  const deleteByIds = async (index: string, ids: readonly string[]) => {
    if (ids.length === 0) return;
    try {
      await esClient.deleteByQuery({
        index,
        conflicts: 'proceed',
        refresh: true,
        query: { ids: { values: [...ids] } },
      });
    } catch (e) {
      if (getStatusCode(e) !== 404) throw e;
    }
  };

  const deleteByQuery = async (index: string, query: Record<string, unknown>) => {
    try {
      await esClient.deleteByQuery({
        index,
        conflicts: 'proceed',
        refresh: true,
        query,
      });
    } catch (e) {
      if (getStatusCode(e) !== 404) throw e;
    }
  };

  await deleteByIds(THREAT_INTEL_SOURCES_INDEX, sourceIds);
  await deleteByIds(THREAT_INTEL_SUBSCRIPTIONS_INDEX, subscriptionIds);

  for (const sourceId of sourceIds) {
    await deleteByQuery(THREAT_REPORTS_DATA_STREAM, {
      term: { 'source.adapter_id': `rss:${sourceId}` },
    });
  }

  log.info(
    `Deleted prior threat-intel fixtures (${scenarios.length} current source id(s)), if present.`
  );
};

export const seedThreatIntelForPacks = async ({
  esClient,
  log,
  packIds,
  startMs,
  endMs,
  spaceId,
}: {
  esClient: Client;
  log: ToolingLog;
  packIds: string[];
  startMs: number;
  endMs: number;
  spaceId: string;
}): Promise<{ sourceCount: number }> => {
  const resolved = resolveThreatIntelPackIds(packIds);
  const scenarios = resolved.map((id) => {
    const scenario = PACK_TI_SCENARIOS[id];
    if (!scenario) {
      throw new Error(`No threat-intel RSS scenario for pack "${id}"`);
    }
    return scenario;
  });

  log.info(`Seeding threat-intel RSS fixtures for packs: ${resolved.join(', ')}`);

  await ensurePlainIndex({ esClient, index: THREAT_INTEL_SOURCES_INDEX, log });
  await ensurePlainIndex({ esClient, index: THREAT_INTEL_SUBSCRIPTIONS_INDEX, log });
  await cleanThreatIntelFixtures({ esClient, log, packIds: resolved });

  const reportTimestamp = timestampAt(startMs, endMs, 0.7);
  const allTags = new Set<string>(['threat-intel']);

  for (const scenario of scenarios) {
    for (const tag of scenario.tags) allTags.add(tag);
    const url = buildPackRssDataUrl({ scenario, reportTimestamp });
    await esClient.index({
      index: THREAT_INTEL_SOURCES_INDEX,
      id: scenario.sourceId,
      refresh: true,
      document: {
        adapter_type: 'rss',
        name: scenario.name,
        enabled: true,
        config: { url },
        tags: scenario.tags,
        space_id: spaceId,
        created_at: reportTimestamp,
        updated_at: reportTimestamp,
      },
    });
  }

  await esClient.index({
    index: THREAT_INTEL_SUBSCRIPTIONS_INDEX,
    id: THREAT_INTEL_SUBSCRIPTION_ID,
    refresh: true,
    document: {
      owner: 'threat-intel',
      tags: [...allTags],
      severity_threshold: 'medium',
      schedule_rrule: 'FREQ=DAILY;BYHOUR=9;BYMINUTE=0',
      delivery: { type: 'email', target: 'security-ops@example.com' },
      human_summary: 'Daily digest of medium+ severity reports tagged for Technology Watch packs.',
      template_id: 'threat-intel',
      space_id: spaceId,
      created_at: reportTimestamp,
      updated_at: reportTimestamp,
    },
  });

  log.info(
    `Seeded ${scenarios.length} threat-intel RSS source(s) and 1 digest subscription. ` +
      `Environment telemetry is the Technology Watch pack indices (not logs-aws.local). ` +
      `On mustard Kibana: run threat-intel.source_ingestion, then threat-intel.nl_extraction_behavioral.`
  );

  return { sourceCount: scenarios.length };
};
