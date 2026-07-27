/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
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

/** Distinct historic Hub article copy; live RSS keeps canonical title/body. */
export interface PackTiHistoricArticle {
  title: string;
  body: string;
}

export interface PackTiScenario {
  packId: string;
  sourceId: string;
  name: string;
  /** Canonical live RSS title (Last 24h / workflow ingest). */
  title: string;
  /** Canonical live RSS body (severity ladder for enrich classify_severity). */
  body: string;
  /**
   * Historic Hub narratives rotated by itemIndex. Each variant must embed the
   * pack's join IOCs (canonical + defanged) and narrative anchors so hunts
   * remain valid if someone opens an older report. Live RSS ignores this list.
   */
  historicArticles: PackTiHistoricArticle[];
  /**
   * Historic-only emerging `source.name` for Hub Sources cardinality demos.
   * Applied only to the newest historic slots so older adjacent windows stay on
   * the four canonical feed names while recent windows also include these
   * aliases (Sources ↑ vs prior). Live RSS / Sources index keep canonical `name`.
   */
  historicSourceAliases: {
    /** Newest historic slots — newly subscribed feed label. */
    emerging: string;
  };
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
  /**
   * Closed-set Hub categories for historic report docs (mustard
   * `THREAT_CATEGORIES`). Not inferred from tags — keep aligned with Hub UI.
   */
  categories: string[];
  /** Closed-set Hub regions for historic report docs (mustard `THREAT_REGIONS`). */
  regions: string[];
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
 * Age-gate historic `source.name` so Hub Sources cardinality rises in newer
 * windows. Older slots keep the canonical live feed name; only the newest ~40%
 * switch to `emerging`. That way a prior equal-length window (older half of the
 * generate range) stays near 4 sources while the current window can reach ~8.
 * Symmetric retired+emerging thirds previously produced 8 vs 8 → 0%.
 */
export const resolveHistoricSourceName = ({
  scenario,
  itemIndex,
  reportsPerPack,
}: {
  scenario: PackTiScenario;
  itemIndex: number;
  reportsPerPack: number;
}): string => {
  if (reportsPerPack <= 1) return scenario.name;
  const ratio = itemIndex / Math.max(reportsPerPack - 1, 1);
  if (ratio >= 0.6) return scenario.historicSourceAliases.emerging;
  return scenario.name;
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
  // Intended enrich severity ladder from body wording only (mustard classify_severity):
  // okta → critical, aws-iam → high, kubernetes → medium, github-actions → low.
  // Titles stay natural (no "ACTIVE INCIDENT" / "Research note" demo prefixes).
  okta: {
    packId: 'okta',
    sourceId: 'ti-rss-okta',
    name: 'Okta identity takeover feed',
    title: 'Okta Super Admin takeover via stolen sessions from Russian IP space',
    body:
      // Keep campaign/actor language explicit so enrich_taxonomy marks diamond_suitable
      // true (generic "threat actors" alone has been gated false and skipped extract_diamond).
      'Operators linked to a LAPSUS$-style identity campaign are actively abusing stolen Okta ' +
      'sessions from Russian IP 192[.]0[.]2[.]50 (192.0.2.50) against production tenants. They are ' +
      'resetting passwords, stripping MFA (user.mfa.factor.deactivate), and granting Super Admin to ' +
      'finance and IT accounts including cfo@corp.example and it-admin@corp.example. Immediate ' +
      'business impact includes system.api_token.create and privileged app group membership while ' +
      'payroll and ERP SSO remain exposed. This is an ongoing breach with ransomware-adjacent ' +
      'extortion risk; revoke sessions and lock down Super Admin immediately. Hunt ATT&CK ' +
      'T1078.004, T1556, T1098, and T1136.003 across okta.system telemetry.',
    historicArticles: [
      {
        title: 'Follow-up: Okta session replay still tied to finance SSO abuse',
        body:
          'A follow-up bulletin revisits stolen Okta sessions from 192[.]0[.]2[.]50 (192.0.2.50) ' +
          'where operators continue targeting cfo@corp.example and it-admin@corp.example. Watch for ' +
          'user.mfa.factor.deactivate ahead of Super Admin grants and api token creation. Prior ' +
          'detections still map to ATT&CK T1078.004, T1556, T1098, and T1136.003 in okta.system.',
      },
      {
        title: 'Identity campaign note: MFA strip patterns against Okta Super Admin',
        body:
          'Campaign analysts catalogued MFA strip sequences (user.mfa.factor.deactivate) before ' +
          'privileged role changes. Related infrastructure includes 192[.]0[.]2[.]50 (192.0.2.50) and ' +
          'mailbox pivots into cfo@corp.example plus it-admin@corp.example. Map hunts to T1078.004, ' +
          'T1556, T1098, and T1136.003 when reviewing Okta admin audit trails.',
      },
      {
        title: 'Okta tenant hardening advisory after Russian IP session theft',
        body:
          'Hardening guidance after session theft from Russian IP space 192[.]0[.]2[.]50 (192.0.2.50). ' +
          'Validate that cfo@corp.example and it-admin@corp.example cannot receive Super Admin without ' +
          'break-glass review, and alert on user.mfa.factor.deactivate. Coverage should include ' +
          'T1078.004, T1556, T1098, and T1136.003 across identity telemetry.',
      },
      {
        title: 'Threat research: LAPSUS$-style Okta privilege chains in enterprise tenants',
        body:
          'Research summary of LAPSUS$-style Okta privilege chains using 192[.]0[.]2[.]50 (192.0.2.50). ' +
          'Observed mailbox and admin targets include cfo@corp.example and it-admin@corp.example with ' +
          'user.mfa.factor.deactivate as an early signal. Technique coverage: T1078.004, T1556, T1098, ' +
          'and T1136.003.',
      },
      {
        title: 'Okta API token creation spikes after stolen session reuse',
        body:
          'Operators reusing stolen sessions from 192[.]0[.]2[.]50 (192.0.2.50) were seen creating API ' +
          'tokens after elevating cfo@corp.example and it-admin@corp.example. Correlate ' +
          'user.mfa.factor.deactivate with Super Admin membership changes. Hunt ATT&CK T1078.004, ' +
          'T1556, T1098, and T1136.003 in okta.system logs.',
      },
      {
        title: 'Detection coverage refresh for Okta Super Admin and MFA disable events',
        body:
          'Detection engineering refresh for Okta Super Admin abuse. Seed hunts with IP ' +
          '192[.]0[.]2[.]50 (192.0.2.50), users cfo@corp.example and it-admin@corp.example, and ' +
          'user.mfa.factor.deactivate. Retain ATT&CK mappings T1078.004, T1556, T1098, and T1136.003 ' +
          'for identity takeover playbooks.',
      },
    ],
    categories: ['insider-threat', 'cloud-security'],
    regions: ['north-america', 'europe'],
    historicSourceAliases: {
      emerging: 'Okta session intel digest',
    },
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
    title: 'AWS IAM privilege escalation and credential theft in account 123456789012',
    body:
      'Security researchers documented a confirmed privilege-escalation campaign in AWS account ' +
      '123456789012. Compromised user dev-user@corp.example (source IP 192[.]0[.]2[.]30 / 192.0.2.30) ' +
      'attached AdministratorAccess, assumed escalated-role, and staged access toward S3 bucket ' +
      'corp-prod-data. Follow-on activity from 192[.]0[.]2[.]31 (192.0.2.31) included GetSecretValue ' +
      'on prod/db-credentials plus StopLogging and DeleteTrail for defense evasion. The campaign ' +
      'is well evidenced with reusable IOCs and ATT&CK mappings, so defenders should prioritize ' +
      'hunts, but this write-up does not assert that customer production is currently offline. ' +
      'Hunt ATT&CK T1098.001, T1078.004, and T1562.008 in aws.cloudtrail logs.',
    historicArticles: [
      {
        title: 'CloudTrail retrospective: AdministratorAccess attach in account 123456789012',
        body:
          'Retrospective for AWS account 123456789012 where user dev-user (dev-user@corp.example) from ' +
          '192[.]0[.]2[.]30 (192.0.2.30) attached AdministratorAccess and later reached bucket ' +
          'corp-prod-data. Secondary IP 192[.]0[.]2[.]31 (192.0.2.31) called GetSecretValue on ' +
          'prod/db-credentials and StopLogging. Map to T1098.001, T1078.004, and T1562.008.',
      },
      {
        title: 'Secrets Manager access after IAM escalation toward corp-prod-data',
        body:
          'After privilege escalation in 123456789012, analysts saw GetSecretValue on ' +
          'prod/db-credentials from 192[.]0[.]2[.]31 (192.0.2.31) following activity by ' +
          'dev-user@corp.example (dev-user) at 192[.]0[.]2[.]30 (192.0.2.30). AdministratorAccess ' +
          'and StopLogging preceded S3 staging on corp-prod-data. Hunt T1098.001, T1078.004, T1562.008.',
      },
      {
        title: 'Defense evasion note: StopLogging paired with DeleteTrail in AWS IAM abuse',
        body:
          'Defense-evasion note for account 123456789012. Operators used StopLogging after ' +
          'AdministratorAccess attach by dev-user / dev-user@corp.example from 192[.]0[.]2[.]30 ' +
          '(192.0.2.30), with follow-on 192[.]0[.]2[.]31 (192.0.2.31) against prod/db-credentials and ' +
          'corp-prod-data. Techniques: T1098.001, T1078.004, T1562.008.',
      },
      {
        title: 'IAM role assumption playbook for escalated-role in production accounts',
        body:
          'Playbook covering escalated-role assumption in 123456789012. Seed with ' +
          'dev-user@corp.example (dev-user), source IPs 192[.]0[.]2[.]30 (192.0.2.30) and ' +
          '192[.]0[.]2[.]31 (192.0.2.31), AdministratorAccess attach, corp-prod-data access, ' +
          'prod/db-credentials reads, and StopLogging. ATT&CK: T1098.001, T1078.004, T1562.008.',
      },
      {
        title: 'S3 staging indicators after credential theft in AWS account 123456789012',
        body:
          'S3 staging indicators for corp-prod-data in account 123456789012 following credential ' +
          'theft by dev-user@corp.example (dev-user). Ingress IPs 192[.]0[.]2[.]30 (192.0.2.30) and ' +
          '192[.]0[.]2[.]31 (192.0.2.31) align with AdministratorAccess, GetSecretValue on ' +
          'prod/db-credentials, and StopLogging. Cover T1098.001, T1078.004, and T1562.008.',
      },
      {
        title: 'AWS privilege-escalation IOC refresh for CloudTrail monitoring teams',
        body:
          'IOC refresh for CloudTrail monitors in 123456789012: 192[.]0[.]2[.]30 (192.0.2.30), ' +
          '192[.]0[.]2[.]31 (192.0.2.31), dev-user@corp.example, short name dev-user, ' +
          'AdministratorAccess, corp-prod-data, prod/db-credentials, and StopLogging. Keep hunts ' +
          'aligned to T1098.001, T1078.004, and T1562.008.',
      },
    ],
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
    categories: ['cloud-security', 'insider-threat'],
    regions: ['north-america', 'global'],
    historicSourceAliases: {
      emerging: 'AWS IAM privilege intel stream',
    },
  },
  kubernetes: {
    packId: 'kubernetes',
    sourceId: 'ti-rss-kubernetes',
    name: 'Kubernetes audit abuse feed',
    title: 'Kubernetes service-account abuse indicators observed near prod-us-east-1',
    body:
      'This advisory summarizes indicators previously associated with Kubernetes audit abuse for ' +
      'detection coverage. Watch for service account system:serviceaccount:default:compromised-sa ' +
      '(short name compromised-sa) in cluster prod-us-east-1 accessing secrets such as ' +
      'db-credentials, creating clusterrolebindings/escalation-binding toward cluster-admin, and ' +
      'traffic from 192[.]0[.]2[.]60 (192.0.2.60). Related behaviors may include pod exec against ' +
      'exec-pod and kube-system ConfigMap changes. Apply as monitoring guidance; the advisory does ' +
      'not claim your cluster is under active compromise. Hunt ATT&CK T1552.007, T1078, and T1610 ' +
      'in kubernetes.audit logs.',
    historicArticles: [
      {
        title: 'Cluster audit review: compromised-sa secret reads in prod-us-east-1',
        body:
          'Audit review for cluster prod-us-east-1 where system:serviceaccount:default:compromised-sa ' +
          '(compromised-sa) read db-credentials and created escalation-binding. Source IP ' +
          '192[.]0[.]2[.]60 (192.0.2.60) also appeared near exec-pod activity. Hunt T1552.007, T1078, ' +
          'and T1610 in kubernetes.audit.',
      },
      {
        title: 'Service-account lateral movement patterns toward cluster-admin bindings',
        body:
          'Lateral movement patterns for system:serviceaccount:default:compromised-sa (compromised-sa) ' +
          'creating escalation-binding toward cluster-admin in prod-us-east-1. Correlate secret access ' +
          'to db-credentials, exec-pod, and 192[.]0[.]2[.]60 (192.0.2.60). Techniques T1552.007, T1078, ' +
          'T1610 remain primary.',
      },
      {
        title: 'Kubernetes secret theft advisory for db-credentials in shared namespaces',
        body:
          'Advisory on db-credentials theft via system:serviceaccount:default:compromised-sa ' +
          '(compromised-sa) in prod-us-east-1. Monitor 192[.]0[.]2[.]60 (192.0.2.60), ' +
          'escalation-binding creation, and exec-pod. Map detections to T1552.007, T1078, and T1610.',
      },
      {
        title: 'Pod exec abuse notes tied to compromised-sa in prod-us-east-1',
        body:
          'Pod exec notes for exec-pod when driven by system:serviceaccount:default:compromised-sa ' +
          '(compromised-sa) in prod-us-east-1. Related IOCs include 192[.]0[.]2[.]60 (192.0.2.60), ' +
          'db-credentials access, and escalation-binding. Cover ATT&CK T1552.007, T1078, and T1610.',
      },
      {
        title: 'RBAC escalation-binding detections for Kubernetes audit pipelines',
        body:
          'RBAC detections for escalation-binding in prod-us-east-1 involving ' +
          'system:serviceaccount:default:compromised-sa (compromised-sa). Seed with IP ' +
          '192[.]0[.]2[.]60 (192.0.2.60), db-credentials reads, and exec-pod. Techniques: T1552.007, ' +
          'T1078, T1610.',
      },
      {
        title: 'Container platform IOC pack: compromised-sa and 192.0.2.60 revisit',
        body:
          'IOC pack revisit for system:serviceaccount:default:compromised-sa (compromised-sa), ' +
          '192[.]0[.]2[.]60 (192.0.2.60), prod-us-east-1, db-credentials, escalation-binding, and ' +
          'exec-pod. Keep kubernetes.audit hunts on T1552.007, T1078, and T1610.',
      },
    ],
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
    categories: ['cloud-security', 'malware'],
    regions: ['north-america', 'europe'],
    historicSourceAliases: {
      emerging: 'Kubernetes cluster threat feed',
    },
  },
  'github-actions': {
    packId: 'github-actions',
    sourceId: 'ti-rss-github-actions',
    name: 'GitHub supply-chain abuse feed',
    title: 'Recurring contractor IOCs in GitHub supply-chain reporting',
    body:
      'Background research note for situational awareness. Prior public reporting has mentioned ' +
      'contractor-style accounts such as dev-contractor-42@corp.example (user dev-contractor-42) in ' +
      'GitHub org corp-example, source IP 192[.]0[.]2[.]70 (192.0.2.70), and invitee ' +
      'malicious-actor-x@external.example as illustrative indicators. Historical write-ups also ' +
      'referenced making corp-example/payment-service public, deploy_key.create, secret-scanning ' +
      'alert dismissals, and fine-grained PATs. No immediate incident response is requested; this ' +
      'catalogs previously reported indicators for optional hunting. Related ATT&CK references: ' +
      'T1567, T1098, and T1195 in github.audit telemetry.',
    historicArticles: [
      {
        title: 'Supply-chain bulletin: contractor invite patterns in corp-example org',
        body:
          'Bulletin on contractor invites in org corp-example. Watch ' +
          'dev-contractor-42@corp.example (dev-contractor-42), invitee malicious-actor-x@external.example, ' +
          'and source IP 192[.]0[.]2[.]70 (192.0.2.70) near payment-service visibility changes and ' +
          'deploy_key.create. Optional hunts: T1567, T1098, T1195.',
      },
      {
        title: 'GitHub audit revisit: deploy_key.create around payment-service exposure',
        body:
          'Audit revisit for deploy_key.create when corp-example/payment-service exposure coincided ' +
          'with dev-contractor-42@corp.example (dev-contractor-42) and malicious-actor-x@external.example ' +
          'from 192[.]0[.]2[.]70 (192.0.2.70). Map github.audit to T1567, T1098, and T1195.',
      },
      {
        title: 'PAT and secret-scanning dismissal patterns in contractor abuse reporting',
        body:
          'Reporting on fine-grained PATs and secret-scanning dismissals linked to ' +
          'dev-contractor-42@corp.example (dev-contractor-42) in corp-example, IP ' +
          '192[.]0[.]2[.]70 (192.0.2.70), and malicious-actor-x@external.example. payment-service and ' +
          'deploy_key.create remain useful pivots for T1567, T1098, T1195.',
      },
      {
        title: 'Org hardening note after public flip of corp-example/payment-service',
        body:
          'Hardening note after corp-example/payment-service was made public. Review activity from ' +
          'dev-contractor-42@corp.example (dev-contractor-42), malicious-actor-x@external.example, and ' +
          '192[.]0[.]2[.]70 (192.0.2.70), including deploy_key.create. Techniques T1567, T1098, T1195.',
      },
      {
        title: 'External invitee tracking for malicious-actor-x across GitHub orgs',
        body:
          'Invitee tracking for malicious-actor-x@external.example alongside ' +
          'dev-contractor-42@corp.example (dev-contractor-42) in corp-example. Correlate ' +
          '192[.]0[.]2[.]70 (192.0.2.70), payment-service, and deploy_key.create. Hunt T1567, T1098, ' +
          'and T1195 in github.audit.',
      },
      {
        title: 'GitHub supply-chain IOC catalog refresh for optional hunting',
        body:
          'IOC catalog refresh: 192[.]0[.]2[.]70 (192.0.2.70), dev-contractor-42@corp.example, ' +
          'dev-contractor-42, malicious-actor-x@external.example, corp-example, payment-service, and ' +
          'deploy_key.create. Keep optional hunts on T1567, T1098, and T1195.',
      },
    ],
    joinIocs: [
      { type: 'ip', value: '192.0.2.70', defanged: '192[.]0[.]2[.]70' },
      { type: 'email', value: 'dev-contractor-42@corp.example' },
      { type: 'user', value: 'dev-contractor-42' },
      { type: 'email', value: 'malicious-actor-x@external.example' },
    ],
    narrative: ['corp-example', 'payment-service', 'deploy_key.create', 'T1567', 'T1098', 'T1195'],
    tags: ['threat-intel', 'pack:github-actions', 'github', 'supply-chain'],
    mitre: ['T1567', 'T1098', 'T1195'],
    categories: ['supply-chain', 'insider-threat'],
    regions: ['north-america', 'europe'],
    historicSourceAliases: {
      emerging: 'GitHub Actions supply-chain watch',
    },
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

const htmlEscape = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const cdata = (value: string): string =>
  `<![CDATA[${value.replace(/\]\]>/g, ']]]]><![CDATA[>')}]]>`;

const timestampAt = (startMs: number, endMs: number, ratio: number): string =>
  new Date(Math.round(startMs + (endMs - startMs) * ratio)).toISOString();

/**
 * Current-only RSS items per pack feed. Kept to a single recent item so mustard
 * `source_ingestion` demos real ingest once per pack without minting near-duplicate
 * "today" cards (Hub history comes from `--threat-intel-reports`, not RSS).
 */
export const THREAT_INTEL_RSS_CURRENT_ITEMS_PER_PACK = 1;

/**
 * Default historic Hub reports per pack when `--threat-intel-reports` is set
 * without `--threat-intel-report-count`. Spread across `--start-date`/`--end-date`.
 */
export const THREAT_INTEL_HISTORIC_REPORTS_PER_PACK_DEFAULT = 12;

/** @deprecated Prefer THREAT_INTEL_HISTORIC_REPORTS_PER_PACK_DEFAULT / RSS current count. */
export const THREAT_INTEL_REPORTS_PER_PACK = THREAT_INTEL_HISTORIC_REPORTS_PER_PACK_DEFAULT;

/** Place the single current RSS item just before endMs (pubDate is narrative-only; ingest uses now). */
const RSS_CURRENT_OFFSET_MS = 15 * 60 * 1000;

/**
 * Trailing window reserved for real mustard workflow ingest. Historic
 * `--threat-intel-reports` docs stop at `endMs - LIVE_WINDOW` so Last 24h can
 * be filled by `source_ingestion` without colliding with mocks.
 */
export const THREAT_INTEL_LIVE_WINDOW_MS = 24 * 60 * 60 * 1000;

export const resolveHistoricThreatIntelWindow = ({
  startMs,
  endMs,
  liveWindowMs = THREAT_INTEL_LIVE_WINDOW_MS,
}: {
  startMs: number;
  endMs: number;
  liveWindowMs?: number;
}): { historicStartMs: number; historicEndMs: number } => {
  const historicEndMs = endMs - liveWindowMs;
  if (historicEndMs <= startMs) {
    throw new Error(
      `--threat-intel-reports needs a generate window wider than the ${Math.round(
        liveWindowMs / (60 * 60 * 1000)
      )}h live reserve (got start=${new Date(startMs).toISOString()} end=${new Date(
        endMs
      ).toISOString()}). Use e.g. --start-date 180d --end-date now.`
    );
  }
  return { historicStartMs: startMs, historicEndMs };
};

const SEVERITY_CYCLE = [
  { level: 'medium', score: 40 },
  { level: 'high', score: 70 },
  { level: 'critical', score: 90 },
  { level: 'low', score: 20 },
] as const;

/**
 * Severity for live-window twins (one per pack). Pack 0 is Critical so Last 24h
 * shows variety after ingest dedup (mustard RSS adapter would otherwise write medium).
 */
export const LIVE_PACK_SEVERITY_CYCLE = [
  { level: 'critical', score: 90 },
  { level: 'high', score: 70 },
  { level: 'medium', score: 40 },
  { level: 'high', score: 70 },
] as const;

/**
 * Severity for seeded Hub reports.
 * - `historic`: newest slot Critical, then High, then cycle
 * - `live`: per-pack Critical/High/Medium for the trailing 24h twins
 */
export const severityForSeededReport = ({
  kind,
  packIndex = 0,
  itemIndex,
  reportsPerPack,
}: {
  kind: 'historic' | 'live';
  packIndex?: number;
  itemIndex: number;
  reportsPerPack: number;
}): { level: string; score: number } => {
  if (kind === 'live') {
    return LIVE_PACK_SEVERITY_CYCLE[packIndex % LIVE_PACK_SEVERITY_CYCLE.length];
  }
  const fromEnd = reportsPerPack - 1 - itemIndex;
  if (fromEnd === 0) return { level: 'critical', score: 90 };
  if (fromEnd === 1) return { level: 'high', score: 70 };
  if (fromEnd === 2) return { level: 'medium', score: 40 };
  return SEVERITY_CYCLE[itemIndex % SEVERITY_CYCLE.length];
};

export interface PackRssReportItem {
  /** Stable suffix for RSS guid (`ti-report-<pack>-<itemKey>`). */
  itemKey: string;
  reportTimestamp: string;
}

export interface HistoricThreatReportDoc {
  '@timestamp': string;
  content_fingerprint: string;
  space_id: string;
  source: {
    type: 'rss';
    name: string;
    url: string;
    adapter_id: string;
  };
  content: {
    title: string;
    body_text: string;
    language: 'en';
  };
  severity: { level: string; score: number };
  extracted?: {
    categories: string[];
    ttps: { techniques: string[] };
    iocs: Array<{ type: string; value: string; defanged?: string }>;
    relevance: number;
    detection_actionability: 'rule_candidate';
  };
  geography?: { regions: string[] };
  lineage: {
    ingested_at: string;
    extracted_at?: string;
    extraction_method: 'seeded' | 'pending';
    source_doc_ref: { index: 'rss:feed'; id: string };
  };
  attribution?: {
    environment_hits_total: number;
    environment_hits: {
      window: string;
      computed_at: string;
      layer_1_ioc_match: number;
      layer_2_behavioral: number;
    };
  };
}

/**
 * Mirror of mustard `adapters/fingerprint.buildFingerprint` so optional
 * overlap with RSS current items can share the ingest dedup key.
 */
export const buildThreatIntelContentFingerprint = (
  parts: ReadonlyArray<string | undefined | null>
): string => {
  const seed = parts.map((part) => (part ?? '').trim().normalize('NFKC')).join(':');
  return createHash('sha256').update(seed).digest('hex');
};

/**
 * Spread report timestamps across the generator window. Each pack gets a
 * different phase so aggregate counts differ between Hub presets (24h / 7d /
 * 30d / 90d) and their prior windows.
 */
export const reportTimestampRatiosForPack = (
  packIndex: number,
  packCount: number,
  reportsPerPack: number = THREAT_INTEL_HISTORIC_REPORTS_PER_PACK_DEFAULT
): number[] => {
  const ratios: number[] = [];
  for (let itemIndex = 0; itemIndex < reportsPerPack; itemIndex++) {
    const slot = (itemIndex + 1) / (reportsPerPack + 1);
    const packPhase = (packIndex / Math.max(packCount, 1)) * 0.45;
    const wave =
      Math.sin((itemIndex / Math.max(reportsPerPack, 1)) * Math.PI * 2 + packPhase) * 0.11;
    ratios.push(Math.min(0.97, Math.max(0.03, slot + wave)));
  }
  return ratios.sort((a, b) => a - b);
};

export const reportTimestampsForWindow = (
  startMs: number,
  endMs: number,
  ratios: readonly number[]
): string[] => ratios.map((ratio) => timestampAt(startMs, endMs, ratio));

/** Historic Hub report slots across the full generate window (not written into RSS). */
export const buildPackHistoricReportItemsForScenario = ({
  packIndex,
  packCount,
  startMs,
  endMs,
  reportsPerPack = THREAT_INTEL_HISTORIC_REPORTS_PER_PACK_DEFAULT,
}: {
  packIndex: number;
  packCount: number;
  startMs: number;
  endMs: number;
  reportsPerPack?: number;
}): PackRssReportItem[] => {
  const ratios = reportTimestampRatiosForPack(packIndex, packCount, reportsPerPack);
  return reportTimestampsForWindow(startMs, endMs, ratios).map((reportTimestamp, itemIndex) => ({
    itemKey: `historic-${String(itemIndex + 1).padStart(2, '0')}`,
    reportTimestamp,
  }));
};

/**
 * RSS-only items near `endMs` for mustard workflow demos. Guids are distinct
 * from historic report refs so ingest does not collide with seeded history.
 * Titles stay undated — dated title variants belong only on historic Hub docs.
 */
export const buildPackRssCurrentReportItems = ({
  endMs,
  itemsPerPack = THREAT_INTEL_RSS_CURRENT_ITEMS_PER_PACK,
}: {
  endMs: number;
  itemsPerPack?: number;
}): PackRssReportItem[] => {
  const items: PackRssReportItem[] = [];
  for (let itemIndex = 0; itemIndex < itemsPerPack; itemIndex++) {
    const offsetMs = RSS_CURRENT_OFFSET_MS * (itemIndex + 1);
    items.push({
      itemKey: `current-${String(itemIndex + 1).padStart(2, '0')}`,
      reportTimestamp: new Date(Math.max(0, endMs - offsetMs)).toISOString(),
    });
  }
  return items;
};

/** @deprecated Use buildPackHistoricReportItemsForScenario or buildPackRssCurrentReportItems. */
export const buildPackRssReportItemsForScenario = buildPackHistoricReportItemsForScenario;

/**
 * Offline mock "upstream article" for Intelligence Hub's external link.
 * Becomes report `source.url` after mustard RSS ingestion. Requires mustard
 * `isBrowsableReportUrl` to allow `data:` (http/https alone hides the link).
 */
export const buildPackArticleDataUrl = (
  scenario: PackTiScenario,
  article?: Pick<PackTiHistoricArticle, 'title' | 'body'>
): string => {
  const title = article?.title ?? scenario.title;
  const body = article?.body ?? scenario.body;
  const mitreLine = scenario.mitre.length
    ? `<p><strong>Techniques:</strong> ${htmlEscape(scenario.mitre.join(', '))}</p>`
    : '';
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${htmlEscape(title)}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 42rem; margin: 2rem auto; padding: 0 1rem; line-height: 1.5; color: #1a1a1a; }
    .feed { color: #666; font-size: 0.875rem; margin-bottom: 0.5rem; }
    h1 { font-size: 1.5rem; margin: 0 0 1rem; }
    p { margin: 0 0 1rem; }
  </style>
</head>
<body>
  <p class="feed">${htmlEscape(scenario.name)}</p>
  <h1>${htmlEscape(title)}</h1>
  <p>${htmlEscape(body)}</p>
  ${mitreLine}
</body>
</html>`;

  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
};

export const buildPackRssDataUrl = ({
  scenario,
  reportItems,
}: {
  scenario: PackTiScenario;
  reportItems: PackRssReportItem[];
}): string => {
  if (reportItems.length === 0) {
    throw new Error('buildPackRssDataUrl requires at least one report item');
  }
  const mitreLine = scenario.mitre.length ? ` Techniques: ${scenario.mitre.join(', ')}.` : '';
  const description = `${scenario.body}${mitreLine}`;
  const articleLink = xmlEscape(buildPackArticleDataUrl(scenario));
  const itemsXml = reportItems
    .map((item) => {
      const guid = `ti-report-${scenario.packId}-${item.itemKey}`;
      // Current RSS items always use the canonical title. Historic Hub docs
      // rotate `historicArticles` instead of minting dated title duplicates.
      const title = scenario.title;
      return `    <item>
      <title>${xmlEscape(title)}</title>
      <guid isPermaLink="false">${xmlEscape(guid)}</guid>
      <link>${articleLink}</link>
      <pubDate>${new Date(item.reportTimestamp).toUTCString()}</pubDate>
      <description>${cdata(description)}</description>
    </item>`;
    })
    .join('\n');
  const feedBody = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${xmlEscape(scenario.name)}</title>
    <link>${articleLink}</link>
    <language>en</language>
${itemsXml}
  </channel>
</rss>`;

  return `data:application/rss+xml;charset=utf-8,${encodeURIComponent(feedBody)}`;
};

export const buildHistoricThreatReportDoc = ({
  scenario,
  item,
  itemIndex,
  packIndex = 0,
  reportsPerPack = THREAT_INTEL_HISTORIC_REPORTS_PER_PACK_DEFAULT,
  spaceId,
  feedUrl,
  kind = 'historic',
}: {
  scenario: PackTiScenario;
  item: PackRssReportItem;
  itemIndex: number;
  packIndex?: number;
  reportsPerPack?: number;
  spaceId: string;
  feedUrl: string;
  /** `live` = trailing-24h twin (pending enrich, varied severity). */
  kind?: 'historic' | 'live';
}): HistoricThreatReportDoc => {
  const isLive = kind === 'live' || item.itemKey.startsWith('current-');
  const historicVariant =
    !isLive && scenario.historicArticles.length > 0
      ? scenario.historicArticles[itemIndex % scenario.historicArticles.length]
      : undefined;
  const title = historicVariant?.title ?? scenario.title;
  const articleBody = historicVariant?.body ?? scenario.body;
  const guid = `ti-report-${scenario.packId}-${item.itemKey}`;
  const articleUrl = buildPackArticleDataUrl(
    scenario,
    historicVariant ? { title, body: articleBody } : undefined
  );
  const severity = severityForSeededReport({
    kind: isLive ? 'live' : 'historic',
    packIndex,
    itemIndex,
    reportsPerPack: isLive ? Math.max(itemIndex + 1, 1) : reportsPerPack,
  });
  const mitreLine = scenario.mitre.length ? ` Techniques: ${scenario.mitre.join(', ')}.` : '';
  const bodyText = `${articleBody}${mitreLine}`;
  const sourceName = isLive
    ? scenario.name
    : resolveHistoricSourceName({ scenario, itemIndex, reportsPerPack });

  const doc: HistoricThreatReportDoc = {
    '@timestamp': item.reportTimestamp,
    content_fingerprint: buildThreatIntelContentFingerprint([feedUrl, guid, title]),
    space_id: spaceId,
    source: {
      type: 'rss',
      name: sourceName,
      url: articleUrl,
      adapter_id: `rss:${scenario.sourceId}`,
    },
    content: {
      title,
      body_text: bodyText,
      language: 'en',
    },
    severity: { level: severity.level, score: severity.score },
    lineage: {
      ingested_at: item.reportTimestamp,
      extraction_method: isLive ? 'pending' : 'seeded',
      source_doc_ref: { index: 'rss:feed', id: guid },
    },
  };

  if (!isLive) {
    const region = scenario.regions[itemIndex % scenario.regions.length];
    const categories =
      itemIndex % 2 === 0 ? scenario.categories : [...scenario.categories].reverse();
    const envHitsTotal = itemIndex % 3 === 0 ? 4 + (itemIndex % 5) : 0;
    doc.extracted = {
      categories,
      ttps: { techniques: [...scenario.mitre] },
      iocs: scenario.joinIocs.map((ioc) => ({
        type: ioc.type,
        value: ioc.value,
        ...(ioc.defanged ? { defanged: ioc.defanged } : {}),
      })),
      relevance: 0.72,
      detection_actionability: 'rule_candidate',
    };
    doc.geography = { regions: [region] };
    doc.lineage.extracted_at = item.reportTimestamp;
    if (envHitsTotal > 0) {
      const layer1 = Math.max(1, Math.floor(envHitsTotal * 0.6));
      const layer2 = Math.max(0, envHitsTotal - layer1);
      doc.attribution = {
        environment_hits_total: envHitsTotal,
        environment_hits: {
          window: 'seeded',
          computed_at: item.reportTimestamp,
          layer_1_ioc_match: layer1,
          layer_2_behavioral: layer2,
        },
      };
    }
  }

  return doc;
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

const seedHistoricThreatReports = async ({
  esClient,
  log,
  scenarios,
  startMs,
  endMs,
  spaceId,
  reportsPerPack,
}: {
  esClient: Client;
  log: ToolingLog;
  scenarios: PackTiScenario[];
  startMs: number;
  endMs: number;
  spaceId: string;
  reportsPerPack: number;
}): Promise<number> => {
  const { historicStartMs, historicEndMs } = resolveHistoricThreatIntelWindow({ startMs, endMs });
  const docs: HistoricThreatReportDoc[] = [];

  for (let packIndex = 0; packIndex < scenarios.length; packIndex++) {
    const scenario = scenarios[packIndex];
    // Fingerprint feed URL matches the live RSS source (current-only items near endMs).
    // Do not seed live-window report docs: Last 24h stays empty until real source_ingestion.
    const currentItems = buildPackRssCurrentReportItems({ endMs });
    const feedUrl = buildPackRssDataUrl({ scenario, reportItems: currentItems });
    const historicItems = buildPackHistoricReportItemsForScenario({
      packIndex,
      packCount: scenarios.length,
      startMs: historicStartMs,
      endMs: historicEndMs,
      reportsPerPack,
    });
    for (let itemIndex = 0; itemIndex < historicItems.length; itemIndex++) {
      docs.push(
        buildHistoricThreatReportDoc({
          scenario,
          item: historicItems[itemIndex],
          itemIndex,
          packIndex,
          reportsPerPack,
          spaceId,
          feedUrl,
          kind: 'historic',
        })
      );
    }
  }

  if (docs.length === 0) return 0;

  try {
    const bulkBody = docs.flatMap((doc) => [
      { create: { _index: THREAT_REPORTS_DATA_STREAM } },
      doc,
    ]);
    const bulkResponse = await esClient.bulk({ refresh: true, body: bulkBody });
    if (bulkResponse.errors) {
      const firstError = bulkResponse.items.find((item) => item.create?.error)?.create?.error;
      throw new Error(
        `Historic threat-report bulk index had errors: ${
          firstError?.reason ?? firstError?.type ?? 'unknown'
        }`
      );
    }
  } catch (e) {
    const status = getStatusCode(e);
    if (status === 404) {
      throw new Error(
        `Cannot seed historic threat reports: data stream ${THREAT_REPORTS_DATA_STREAM} does not exist. ` +
          `Start mustard Kibana against this Elasticsearch first so the Hub index template is installed.`
      );
    }
    throw e;
  }

  log.info(
    `Seeded ${docs.length} historic threat report(s) into ${THREAT_REPORTS_DATA_STREAM} ` +
      `across [${new Date(historicStartMs).toISOString()}, ${new Date(
        historicEndMs
      ).toISOString()}] ` +
      `(live window (${
        THREAT_INTEL_LIVE_WINDOW_MS / (60 * 60 * 1000)
      }h) left empty for real workflow ingest).`
  );
  return docs.length;
};

export const seedThreatIntelForPacks = async ({
  esClient,
  log,
  packIds,
  startMs,
  endMs,
  spaceId,
  historicReportsPerPack,
}: {
  esClient: Client;
  log: ToolingLog;
  packIds: string[];
  startMs: number;
  endMs: number;
  spaceId: string;
  /** When set, write enriched historic reports into `.kibana-threat-reports`. */
  historicReportsPerPack?: number;
}): Promise<{ sourceCount: number; reportItemCount: number; historicReportCount: number }> => {
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

  const sourceTimestamp = new Date(endMs).toISOString();
  const allTags = new Set<string>(['threat-intel']);
  let reportItemCount = 0;

  for (const scenario of scenarios) {
    for (const tag of scenario.tags) allTags.add(tag);
    // RSS stays current-only so workflow ingest does not replay the historic archive.
    const reportItems = buildPackRssCurrentReportItems({ endMs });
    reportItemCount += reportItems.length;
    const url = buildPackRssDataUrl({ scenario, reportItems });
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
        created_at: sourceTimestamp,
        updated_at: sourceTimestamp,
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
      created_at: sourceTimestamp,
      updated_at: sourceTimestamp,
    },
  });

  let historicReportCount = 0;
  if (historicReportsPerPack !== undefined) {
    if (!Number.isFinite(historicReportsPerPack) || historicReportsPerPack < 1) {
      throw new Error(
        `Invalid historicReportsPerPack "${historicReportsPerPack}" (expected integer >= 1)`
      );
    }
    historicReportCount = await seedHistoricThreatReports({
      esClient,
      log,
      scenarios,
      startMs,
      endMs,
      spaceId,
      reportsPerPack: Math.floor(historicReportsPerPack),
    });
  }

  log.info(
    `Seeded ${scenarios.length} threat-intel RSS source(s) (${reportItemCount} current RSS item(s) ` +
      `for workflow ingest) and 1 digest subscription${
        historicReportCount > 0 ? `, plus ${historicReportCount} historic Hub report(s)` : ''
      }. Environment telemetry is the Technology Watch pack indices (not logs-aws.local). ` +
      `On mustard Kibana: run threat-intel.source_ingestion to fill the live ${
        THREAT_INTEL_LIVE_WINDOW_MS / (60 * 60 * 1000)
      }h window with real reports; ` +
      `Hub history comes from --threat-intel-reports (through end-date minus that live window).`
  );

  return { sourceCount: scenarios.length, reportItemCount, historicReportCount };
};
