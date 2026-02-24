/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { run, type RunFn } from '@kbn/dev-cli-runner';
import { ok } from 'assert';
import { createToolingLogger } from '../../../common/endpoint/data_loaders/utils';
import { createEsClient, createKbnClient } from '../common/stack_services';
import {
  addEndpointIntegrationToAgentPolicy,
  fetchAgentPolicy,
  fetchFleetAgents,
  installIntegration,
} from '../common/fleet_services';
import { createRule, findRules } from '../common/detection_rules_services';
import { CalderaClient } from '../ref7707_lab/caldera/client';
import { assertGcloudAvailable, gcloudSsh } from '../gcp_fleet_vm/gcloud';
import {
  tactics as mitreTactics,
  techniques as mitreTechniques,
} from '../../../public/detections/mitre/mitre_tactics_techniques';
import { DETECTION_ENGINE_RULES_BULK_ACTION } from '../../../common/constants';
import { PERFORM_RULE_INSTALLATION_URL } from '../../../common/api/detection_engine/prebuilt_rules';
import { addOsqueryIntegrationToAgentPolicy } from '../osquery_host/services/add_osquery_integration';
import { addPacketbeatDnsIntegrationToAgentPolicy } from '../ref7707_lab/services/add_packetbeat_dns_integration';
import { addNetworkPacketCaptureDnsIntegrationToAgentPolicy } from '../ref7707_lab/services/add_network_packet_capture_dns_integration';

type TargetOs = 'windows' | 'linux' | 'macos' | 'any';
type CalderaPlatform = 'windows' | 'linux' | 'darwin';

const normalizeOsToCalderaPlatform = (os: TargetOs): CalderaPlatform | 'any' => {
  if (os === 'windows') return 'windows';
  if (os === 'linux') return 'linux';
  if (os === 'macos') return 'darwin';
  return 'any';
};

const runInvokeAtomicOnGcpLinux = async ({
  log,
  gcpProject,
  gcpZone,
  instanceName,
  techniqueId,
  cleanup,
}: {
  log: ToolingLog;
  gcpProject: string;
  gcpZone: string;
  instanceName: string;
  techniqueId: string;
  cleanup: boolean;
}): Promise<void> => {
  await assertGcloudAvailable(log);

  const atomicsFolder = '/opt/atomic-red-team/atomics';
  const ps = [
    `$ErrorActionPreference = 'Stop'`,
    `$env:PathToAtomicsFolder = '${atomicsFolder}'`,
    `Import-Module Invoke-AtomicRedTeam -ErrorAction Stop`,
    `Invoke-AtomicTest ${techniqueId} -GetPrereqs -Force`,
    `Invoke-AtomicTest ${techniqueId} -Run -Force`,
    ...(cleanup ? [`Invoke-AtomicTest ${techniqueId} -Cleanup -Force`] : []),
  ].join('; ');

  const inner = [
    `set -euo pipefail`,
    `test -d '${atomicsFolder}' || { echo '[invoke-atomic] missing ${atomicsFolder} (did you provision with --enableInvokeAtomic?)'; exit 1; }`,
    `command -v pwsh >/dev/null 2>&1 || { echo '[invoke-atomic] pwsh not found (did install fail?)'; exit 1; }`,
    // prefer sudo if available (many atomics require elevation), but fall back to non-sudo
    `(sudo -n true >/dev/null 2>&1 && sudo -n pwsh -NoProfile -NonInteractive -Command ${JSON.stringify(
      ps
    )} || pwsh -NoProfile -NonInteractive -Command ${JSON.stringify(ps)})`,
  ].join('; ');

  log.info(
    `[invoke-atomic] running ${techniqueId} on GCP VM ${instanceName} (${gcpProject}/${gcpZone})`
  );
  await gcloudSsh({
    log,
    project: gcpProject,
    zone: gcpZone,
    instance: instanceName,
    command: `bash -lc ${JSON.stringify(inner)}`,
  });
  log.info(`[invoke-atomic] completed ${techniqueId} on ${instanceName}`);
};

const deriveKqlTokensFromExecutorCommand = (command: string, maxTokens: number = 6): string[] => {
  const raw = command.replaceAll('\n', ' ').replaceAll('\r', ' ').replaceAll('\t', ' ').trim();

  // Extract “words” that are likely to show up in process.command_line.
  // Filter out Caldera variables and short/noisy tokens.
  const candidates = raw
    .split(/[^\w./:-]+/g)
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t) => !t.includes('#{') && !t.includes('}') && !t.startsWith('$'))
    .filter((t) => t.length >= 4)
    .filter((t) => !['sudo', 'bash', 'sh', 'cmd', 'powershell', 'pwsh'].includes(t.toLowerCase()));

  // Keep first unique tokens for determinism.
  const out: string[] = [];
  for (const c of candidates) {
    if (!out.includes(c)) out.push(c);
    if (out.length >= maxTokens) break;
  }
  return out;
};

const extractTechniqueIdsFromRuleThreat = (rule: any): string[] => {
  const out: string[] = [];
  const threats = Array.isArray(rule?.threat) ? rule.threat : [];
  for (const th of threats) {
    const techniques = Array.isArray(th?.technique) ? th.technique : [];
    for (const tech of techniques) {
      const id = String(tech?.id ?? '');
      if (id) out.push(id);
      const subs = Array.isArray(tech?.subtechnique) ? tech.subtechnique : [];
      for (const st of subs) {
        const sid = String(st?.id ?? '');
        if (sid) out.push(sid);
      }
    }
  }
  return [...new Set(out)];
};

const pickRandomAbilityWithInstalledRuleCoverage = async ({
  kbnClient,
  abilities,
  targetOs,
  executorMatches,
  log,
  excludeAbilityIds,
  stableOnly,
  preferEndpointPrebuiltRules,
}: {
  kbnClient: any;
  abilities: any[];
  targetOs: TargetOs;
  executorMatches: (ab: any) => boolean;
  log: any;
  excludeAbilityIds?: Set<string>;
  stableOnly?: boolean;
  preferEndpointPrebuiltRules?: boolean;
}): Promise<any> => {
  const isStableAbility = (ab: any): boolean => {
    const name = String(ab?.name ?? '').toLowerCase();
    const desc = String(ab?.description ?? '').toLowerCase();
    const execs = Array.isArray(ab?.executors) ? ab.executors : [];
    const cmd = execs
      .map((e: any) => String(e?.command ?? ''))
      .join('\n')
      .toLowerCase();

    const hay = `${name}\n${desc}\n${cmd}`;

    // Exclude “agent bootstrap / download sandcat” style abilities (can be flaky and not telemetry-focused)
    const bootstrapIndicators = [
      'sandcat',
      'splunkd',
      '/file/download',
      'file: sandcat',
      'curl -x post',
      'invoke-webrequest -method post',
      'go build',
      'download agent',
      'install agent',
    ];
    if (bootstrapIndicators.some((s) => hay.includes(s))) return false;

    // Exclude destructive / disruptive patterns
    const destructiveIndicators = [
      'dd of=',
      'mkfs',
      'wipefs',
      'shred',
      'rm -rf /',
      'shutdown',
      'reboot',
      'poweroff',
      'halt',
      'kill -9 1',
      'systemctl stop',
      'systemctl disable',
      'del /f',
      'format ',
    ];
    if (destructiveIndicators.some((s) => hay.includes(s))) return false;

    // Require a usable executor command
    if (!cmd.trim().length) return false;

    return true;
  };

  const usableAbilities = abilities
    .filter(executorMatches)
    .filter(
      (ab: any) => String(ab?.technique_id ?? ab?.technique?.attack_id ?? '').trim().length > 0
    )
    .filter((ab: any) => {
      const execs = Array.isArray(ab?.executors) ? ab.executors : [];
      return execs.some((ex: any) => String(ex?.command ?? '').trim().length > 0);
    });
  const filteredByStability = stableOnly
    ? usableAbilities.filter(isStableAbility)
    : usableAbilities;

  ok(
    filteredByStability.length > 0,
    `[caldera] no usable${
      stableOnly ? ' stable' : ''
    } abilities with technique id found for the selected platform/OS`
  );

  const rulesResp = await findRules(kbnClient, { per_page: 5000 });
  const rules = rulesResp.data ?? [];

  const SUPPORTED_PREREQ_PACKAGES = new Set<string>([
    // Packages we can reasonably satisfy in this lab runner today
    'endpoint',
    'packetbeat',
    'osquery_manager',
    'osquery',
    'network_packet_capture',
  ]);

  const prereqsAreSatisfiable = (r: any): boolean => {
    const prereqs = inferPrereqPackages(r);
    return prereqs.every((p) => SUPPORTED_PREREQ_PACKAGES.has(p));
  };

  const isEndpointTelemetryRule = (r: any): boolean => {
    const indices = Array.isArray(r?.index) ? r.index : [];
    const idx = indices
      .map((i: any) => String(i))
      .join(' ')
      .toLowerCase();
    return (
      idx.includes('logs-endpoint.events.') ||
      idx.includes('logs-endpoint.alerts') ||
      idx.includes('metrics-endpoint') ||
      idx.includes('endpoint.events') ||
      idx.includes('auditbeat-') ||
      idx.includes('winlogbeat-') ||
      idx.includes('filebeat-') ||
      idx.includes('logs-')
    );
  };

  const collectTechniqueIds = (
    predicate: (r: any) => boolean,
    onlySatisfiable: boolean
  ): Set<string> => {
    const ids = new Set<string>();
    for (const r of rules) {
      if (!ruleSupportsOs(r, targetOs).supported) continue;
      if (!predicate(r)) continue;
      if (onlySatisfiable && !prereqsAreSatisfiable(r)) continue;
      for (const id of extractTechniqueIdsFromRuleThreat(r)) ids.add(id);
    }
    return ids;
  };

  const isEndpointRule = (r: any): boolean => isEndpointTelemetryRule(r);

  const pickFromTechniqueIds = (techniqueIds: Set<string>): any[] => {
    return filteredByStability.filter((ab: any) => {
      const id = String(ab?.technique_id ?? ab?.technique?.attack_id ?? '');
      const abilityId = String(ab?.ability_id ?? ab?.id ?? '');
      if (excludeAbilityIds?.has(abilityId)) return false;
      return techniqueIds.has(id);
    });
  };

  // Prefer endpoint-style rules first (more likely to fire in endpoint labs) and satisfiable prereqs.
  // If preferEndpointPrebuiltRules is true, do not fall back to cloud-only / unsatisfiable rules.
  let candidates = pickFromTechniqueIds(collectTechniqueIds(isEndpointRule, true));
  if (!preferEndpointPrebuiltRules) {
    // Progressive fallback
    if (candidates.length === 0) {
      candidates = pickFromTechniqueIds(collectTechniqueIds(() => true, true));
    }
    if (candidates.length === 0) {
      candidates = pickFromTechniqueIds(collectTechniqueIds(isEndpointRule, false));
    }
    if (candidates.length === 0) {
      candidates = pickFromTechniqueIds(collectTechniqueIds(() => true, false));
    }
  }

  ok(
    candidates.length > 0,
    `[caldera] no abilities found that map to an installed Elastic rule (by technique id) for os=${targetOs}`
  );

  const picked = candidates[Math.floor(Math.random() * candidates.length)];
  log.info(
    `[caldera] picked ability with installed rule coverage: name="${String(
      picked?.name ?? ''
    )}" technique=${String(picked?.technique_id ?? picked?.technique?.attack_id ?? '')}`
  );
  return picked;
};

const isFleetServerAgent = (agent: any): boolean => {
  const type = String(agent?.type ?? '').toLowerCase();
  if (type === 'fleet-server') return true;

  const components = Array.isArray(agent?.components) ? agent.components : [];
  if (components.some((c: any) => String(c?.name ?? '').toLowerCase() === 'fleet-server'))
    return true;

  // Fallback heuristic: hostname commonly includes "fleet-server"
  const hostname = String(
    agent?.local_metadata?.host?.hostname ?? agent?.local_metadata?.host?.name ?? ''
  ).toLowerCase();
  if (hostname.includes('fleet-server')) return true;

  return false;
};

const getFleetHostname = (agent: any): string => {
  return (
    agent?.local_metadata?.host?.hostname ??
    agent?.local_metadata?.host?.name ??
    agent?.local_metadata?.host?.id ??
    ''
  );
};

const getFleetOsFamily = (agent: any): string => {
  return String(
    agent?.local_metadata?.host?.os?.family ??
      agent?.local_metadata?.host?.os?.platform ??
      agent?.local_metadata?.os?.family ??
      agent?.local_metadata?.os?.platform ??
      ''
  ).toLowerCase();
};

const osMatches = (targetOs: TargetOs, agentOsFamily: string): boolean => {
  if (targetOs === 'any') return true;
  if (targetOs === 'macos')
    return (
      agentOsFamily.includes('darwin') ||
      agentOsFamily.includes('mac') ||
      agentOsFamily.includes('osx')
    );
  if (targetOs === 'windows') return agentOsFamily.includes('windows');
  // Treat any non-windows and non-macos family as linux for Fleet filtering
  const isWindows = agentOsFamily.includes('windows');
  const isMac =
    agentOsFamily.includes('darwin') ||
    agentOsFamily.includes('mac') ||
    agentOsFamily.includes('osx');
  return !isWindows && !isMac;
};

const inferTargetOsFromFleetOsFamily = (agentOsFamily: string): TargetOs => {
  const v = agentOsFamily.toLowerCase();
  if (v.includes('windows')) return 'windows';
  if (v.includes('darwin') || v.includes('mac') || v.includes('osx')) return 'macos';
  // Most linux distros show up as debian/ubuntu/rhel/etc.
  return 'linux';
};

const findMitreTactic = (tacticId: string) => mitreTactics.find((t) => t.id === tacticId);

const findMitreTechniqueOrSubtechnique = (
  id: string
):
  | { id: string; name: string; reference: string; parent?: { id: string; name: string } }
  | undefined => {
  for (const t of mitreTechniques as any[]) {
    if (t.id === id) return { id: t.id, name: t.name, reference: t.reference };
    const subs = Array.isArray(t.subtechniques) ? t.subtechniques : [];
    const sub = subs.find((s: any) => s.id === id);
    if (sub)
      return {
        id: sub.id,
        name: sub.name,
        reference: sub.reference,
        parent: { id: t.id, name: t.name },
      };
  }
  return undefined;
};

const ruleMatchesMitre = (
  rule: any,
  { tacticId, techniqueId }: { tacticId?: string; techniqueId?: string }
): boolean => {
  const threats = Array.isArray(rule?.threat) ? rule.threat : [];
  return threats.some((th: any) => {
    const tacticOk = tacticId ? String(th?.tactic?.id ?? '') === tacticId : true;
    const techniques = Array.isArray(th?.technique) ? th.technique : [];
    const techOk = techniqueId
      ? techniques.some((tech: any) => {
          if (String(tech?.id ?? '') === techniqueId) return true;
          const subs = Array.isArray(tech?.subtechnique) ? tech.subtechnique : [];
          return subs.some((st: any) => String(st?.id ?? '') === techniqueId);
        })
      : true;
    return tacticOk && techOk;
  });
};

const ruleSupportsOs = (rule: any, targetOs: TargetOs): { supported: boolean; reason?: string } => {
  if (targetOs === 'any') return { supported: true };

  const tags = (Array.isArray(rule?.tags) ? rule.tags : []).map((t: any) => String(t));
  const normalized = tags.map((t) => t.toLowerCase());

  const windows = normalized.some(
    (t) => t === 'os: windows' || t === 'windows' || t.includes('os: windows')
  );
  const linux = normalized.some(
    (t) => t === 'os: linux' || t === 'linux' || t.includes('os: linux')
  );
  const macos = normalized.some(
    (t) => t === 'os: macos' || t === 'macos' || t.includes('os: macos')
  );

  const hasAnyOsTag = windows || linux || macos;
  if (!hasAnyOsTag) {
    // best-effort fallback: treat as any, but note ambiguity
    return {
      supported: true,
      reason: 'Rule has no explicit OS tags; treating as OS-agnostic (best-effort).',
    };
  }

  if (targetOs === 'windows')
    return { supported: windows, reason: windows ? undefined : 'Rule is not tagged for Windows.' };
  if (targetOs === 'linux')
    return { supported: linux, reason: linux ? undefined : 'Rule is not tagged for Linux.' };
  return { supported: macos, reason: macos ? undefined : 'Rule is not tagged for macOS.' };
};

const inferPrereqPackages = (rule: any): string[] => {
  const pkgs = new Set<string>();

  // Prefer explicit metadata if present
  const related = Array.isArray(rule?.related_integrations) ? rule.related_integrations : [];
  for (const r of related) {
    const pkg = (r?.package ?? r?.package_name ?? r?.name ?? '').toString().trim();
    if (pkg) pkgs.add(pkg);
  }

  // Heuristics based on index patterns
  const indices = Array.isArray(rule?.index) ? rule.index : [];
  const indexStr = indices
    .map((i: any) => String(i))
    .join(' ')
    .toLowerCase();

  if (
    indexStr.includes('logs-endpoint') ||
    indexStr.includes('metrics-endpoint') ||
    indexStr.includes('endpoint.')
  ) {
    pkgs.add('endpoint');
  }
  if (indexStr.includes('packetbeat')) pkgs.add('packetbeat');
  if (indexStr.includes('logs-osquery') || indexStr.includes('osquery'))
    pkgs.add('osquery_manager');

  return [...pkgs];
};

const attachKnownPrereqsToPolicy = async ({
  kbnClient,
  log,
  agentPolicyId,
  packages,
}: {
  kbnClient: any;
  log: any;
  agentPolicyId: string;
  packages: string[];
}): Promise<{ attached: string[]; skipped: string[] }> => {
  const attached: string[] = [];
  const skipped: string[] = [];

  for (const pkg of packages) {
    try {
      // Ensure package assets exist in Fleet where applicable
      await installIntegration(kbnClient, pkg).catch(() => undefined);
    } catch {
      // best effort
    }

    if (pkg === 'endpoint') {
      await addEndpointIntegrationToAgentPolicy({ kbnClient, log, agentPolicyId });
      attached.push(pkg);
    } else if (pkg === 'osquery_manager' || pkg === 'osquery') {
      await addOsqueryIntegrationToAgentPolicy({ kbnClient, log, agentPolicyId });
      attached.push(pkg);
    } else if (pkg === 'packetbeat') {
      await addPacketbeatDnsIntegrationToAgentPolicy({ kbnClient, log, agentPolicyId });
      attached.push(pkg);
    } else if (pkg === 'network_packet_capture') {
      await addNetworkPacketCaptureDnsIntegrationToAgentPolicy({ kbnClient, log, agentPolicyId });
      attached.push(pkg);
    } else {
      skipped.push(pkg);
    }
  }

  return { attached, skipped };
};

const installPrebuiltRules = async (kbnClient: any): Promise<void> => {
  await kbnClient.request({
    method: 'POST',
    path: PERFORM_RULE_INSTALLATION_URL,
    // Internal versioned route: use api version "1" and internal origin header.
    headers: {
      'elastic-api-version': '1',
      'kbn-xsrf': 'security-solution',
      'x-elastic-internal-origin': 'security-solution',
    },
    body: { mode: 'ALL_RULES' },
  });
};

const findAlertsForRule = async ({
  esClient,
  ruleId,
  startedAt,
  hostname,
}: {
  esClient: any;
  ruleId: string;
  startedAt: string;
  hostname?: string;
}): Promise<number> => {
  const must: any[] = [
    { range: { '@timestamp': { gte: startedAt } } },
    // Detection engine alert documents include rule id under kibana.alert.rule.uuid
    { term: { 'kibana.alert.rule.uuid': ruleId } },
  ];
  if (hostname) {
    must.push({
      bool: {
        should: [{ term: { 'host.name': hostname } }, { term: { 'host.hostname': hostname } }],
        minimum_should_match: 1,
      },
    });
  }

  const res = await esClient.search({
    index: '.alerts-security.alerts*',
    size: 0,
    track_total_hits: true,
    query: { bool: { must } },
  });

  const total = res?.hits?.total;
  if (typeof total === 'number') return total;
  return total?.value ?? 0;
};

const waitForAlerts = async ({
  esClient,
  ruleId,
  startedAt,
  hostname,
  timeoutMs,
  pollMs,
  log,
}: {
  esClient: any;
  ruleId: string;
  startedAt: string;
  hostname?: string;
  timeoutMs: number;
  pollMs: number;
  log: any;
}): Promise<number> => {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const count = await findAlertsForRule({ esClient, ruleId, startedAt, hostname });
    log.info(`[alerts] rule=${ruleId} alerts_since_start=${count}`);
    if (count > 0) return count;
    await new Promise((r) => setTimeout(r, pollMs));
  }
  return 0;
};

const buildTemporaryTestRuleForAbility = ({
  ability,
  targetOs,
  hostname,
  tacticId,
  techniqueId,
}: {
  ability: any;
  targetOs: TargetOs;
  hostname: string;
  tacticId?: string;
  techniqueId?: string;
}): { name: string; query: string; tags: string[]; threat: any[] } => {
  const ts = new Date().toISOString();
  const abilityName = String(ability?.name ?? 'REF7707 ability');

  const tags = [
    'caldera-mitre-test',
    'temporary-rule',
    `caldera-ability:${abilityName}`,
    ...(targetOs === 'windows' ? ['OS: Windows'] : []),
    ...(targetOs === 'linux' ? ['OS: Linux'] : []),
    ...(targetOs === 'macos' ? ['OS: macOS'] : []),
  ];

  // Host-scoped “smoke test” query derived from the ability executor command (best-effort).
  // This is intentionally not a production-quality detection.
  const executors = Array.isArray(ability?.executors) ? ability.executors : [];
  const platform = normalizeOsToCalderaPlatform(targetOs);
  const preferredExecutor =
    platform === 'any'
      ? executors[0]
      : executors.find((ex: any) => String(ex?.platform ?? '') === platform) ?? executors[0];

  const cmd = String(preferredExecutor?.command ?? '');
  const tokens = deriveKqlTokensFromExecutorCommand(cmd);

  const hostClause = `(host.name:"${hostname}" or host.hostname:"${hostname}")`;
  const tokenClause = tokens.length
    ? `(${tokens.map((t) => `process.command_line:*${t}*`).join(' or ')})`
    : `(process.name:* or process.command_line:*)`;

  const query = `${hostClause} and ${tokenClause}`;

  const threat =
    tacticId || techniqueId
      ? [
          {
            framework: 'MITRE ATT&CK',
            ...(tacticId
              ? {
                  tactic: {
                    id: tacticId,
                    name: findMitreTactic(tacticId)?.name ?? tacticId,
                    reference: `https://attack.mitre.org/tactics/${tacticId}/`,
                  },
                }
              : {}),
            technique: techniqueId
              ? [
                  {
                    id: techniqueId,
                    name: findMitreTechniqueOrSubtechnique(techniqueId)?.name ?? techniqueId,
                    reference: `https://attack.mitre.org/techniques/${techniqueId}/`,
                  },
                ]
              : [],
          },
        ]
      : [];

  return {
    name: `Caldera Ability Test (temporary) - ${abilityName} - ${ts}`,
    query,
    tags,
    threat,
  };
};

const enableRulesById = async (kbnClient: any, ids: string[]): Promise<void> => {
  await kbnClient.request({
    method: 'POST',
    path: DETECTION_ENGINE_RULES_BULK_ACTION,
    headers: { 'elastic-api-version': '2023-10-31', 'kbn-xsrf': 'security-solution' },
    body: { action: 'enable', ids },
  });
};

const runCli: RunFn = async ({ log, flags }) => {
  createToolingLogger.setDefaultLogLevelFromCliFlags(flags);

  const kibanaUrl = flags.kibanaUrl as string;
  const elasticUrl = (flags.elasticUrl as string) || 'http://127.0.0.1:9200';
  const username = flags.username as string;
  const password = flags.password as string;
  const apiKey = (flags.apiKey as string) || '';
  const spaceId = (flags.spaceId as string) || '';

  const tacticId = (flags.tactic as string) || '';
  const techniqueId = (flags.technique as string) || '';
  const targetOs = ((flags.targetOs as string) || 'any') as TargetOs;
  const execute = Boolean(flags.execute);

  const fleetAgentId = (flags.fleetAgentId as string) || '';
  const autoSelectAgent = Boolean(flags.autoSelectAgent);
  const randomAbility = Boolean(flags.randomAbility);
  const createRuleIfMissing = Boolean(flags.createRuleIfMissing);
  const trustCalderaAgent = Boolean(flags.trustCalderaAgent);
  const stableAbilities = Boolean(flags.stableAbilities);
  const preferEndpointPrebuiltRules = Boolean(flags.preferEndpointPrebuiltRules);
  const abilityId = String(flags.abilityId ?? '').trim();
  const abilityName = String(flags.abilityName ?? '').trim();

  const calderaUrl = (flags.calderaUrl as string) || '';
  const calderaApiKey = (flags.calderaApiKey as string) || '';
  const calderaGroup = (flags.calderaGroup as string) || '';
  const gcpProject = (flags.gcpProject as string) || '';
  const gcpZone = (flags.gcpZone as string) || '';
  const useInvokeAtomic =
    Boolean(flags.useInvokeAtomic) ||
    (execute && Boolean(techniqueId) && !randomAbility && !abilityId && !abilityName);
  const invokeAtomicCleanup =
    flags.invokeAtomicCleanup !== undefined ? Boolean(flags.invokeAtomicCleanup) : true;

  const enableMatchingRules = Boolean(flags.enableRules);
  const installPrebuilt = Boolean(flags.installPrebuilt);
  const remediatePrereqs = Boolean(flags.remediatePrereqs);

  const listAbilities = Boolean(flags.listAbilities);
  const waitForAlertsEnabled = Boolean(flags.waitForAlerts);
  const waitForAlertsMs = flags.waitForAlertsMs ? Number(flags.waitForAlertsMs) : 120000;
  const waitForAlertsPollMs = flags.waitForAlertsPollMs ? Number(flags.waitForAlertsPollMs) : 5000;

  ok(
    Boolean(tacticId || techniqueId || randomAbility || abilityId || abilityName),
    'Provide at least one of --tactic or --technique, pass --randomAbility, or select an explicit ability via --abilityId/--abilityName'
  );
  ok(
    targetOs === 'windows' || targetOs === 'linux' || targetOs === 'macos' || targetOs === 'any',
    'Invalid --targetOs'
  );
  ok(
    !execute || Boolean(fleetAgentId || autoSelectAgent),
    '--execute requires --fleetAgentId (single-target) or --autoSelectAgent'
  );
  ok(
    !execute || useInvokeAtomic || Boolean(calderaUrl),
    '--execute requires --calderaUrl (unless using Invoke-Atomic)'
  );
  ok(
    !execute || useInvokeAtomic || Boolean(calderaApiKey),
    '--execute requires --calderaApiKey (unless using Invoke-Atomic)'
  );

  const kbnClient = createKbnClient({
    log,
    url: kibanaUrl,
    username,
    password,
    apiKey,
    spaceId: spaceId || undefined,
  });
  const esClient = createEsClient({
    url: elasticUrl,
    username,
    password,
    apiKey: apiKey || undefined,
    log,
  });

  // 1) Resolve MITRE metadata
  if (tacticId) {
    const t = findMitreTactic(tacticId);
    log.info(`[mitre] tactic: ${tacticId}${t ? ` (${t.name})` : ''}${t ? ` ${t.reference}` : ''}`);
  }
  if (techniqueId) {
    const tt = findMitreTechniqueOrSubtechnique(techniqueId);
    log.info(
      `[mitre] technique: ${techniqueId}${tt ? ` (${tt.name})` : ''}${
        tt?.parent ? ` parent=${tt.parent.id} (${tt.parent.name})` : ''
      }${tt ? ` ${tt.reference}` : ''}`
    );
  }

  // 2) Fleet agents → in-scope candidates (plan)
  const agentsResp = await fetchFleetAgents(kbnClient, { perPage: 1000, showInactive: false });
  const allAgents = agentsResp.items ?? [];
  const candidates = allAgents
    .filter((a: any) => !isFleetServerAgent(a))
    .filter((a: any) => osMatches(targetOs, getFleetOsFamily(a)));

  log.info(`[fleet] candidates (excluding fleet-server, os=${targetOs}): ${candidates.length}`);
  for (const a of candidates) {
    const hostname = getFleetHostname(a);
    const osFamily = getFleetOsFamily(a);
    log.info(
      `  - ${a.id} host=${hostname || '<unknown>'} os=${osFamily || '<unknown>'} status=${
        a.status ?? '<unknown>'
      }`
    );
  }

  // If not executing, we still validate rules (coverage + enabled) so the operator gets the full plan.
  // 3) Rule coverage validation (and optional prebuilt install)
  const findAndFilterRules = async ({
    effectiveTacticId,
    effectiveTechniqueId,
  }: {
    effectiveTacticId: string;
    effectiveTechniqueId: string;
  }): Promise<any[]> => {
    const resp = await findRules(kbnClient, { per_page: 5000 });
    const rules = resp.data ?? [];
    return rules
      .filter((r: any) =>
        ruleMatchesMitre(r, {
          tacticId: effectiveTacticId || undefined,
          techniqueId: effectiveTechniqueId || undefined,
        })
      )
      .filter((r: any) => ruleSupportsOs(r, targetOs).supported);
  };

  let effectiveTacticId = tacticId;
  let effectiveTechniqueId = techniqueId;

  // If MITRE mapping is provided, validate rule coverage during plan; otherwise defer to execute-time rule creation.
  let matchingRules: any[] = [];
  if (effectiveTacticId || effectiveTechniqueId) {
    matchingRules = await findAndFilterRules({ effectiveTacticId, effectiveTechniqueId });
    if (matchingRules.length === 0 && installPrebuilt) {
      log.warning(`[rules] no matching rules found; attempting prebuilt rules installation...`);
      await installPrebuiltRules(kbnClient).catch((e: any) => {
        log.warning(
          `[rules] prebuilt installation failed (continuing): ${String(e?.message ?? e)}`
        );
      });
      matchingRules = await findAndFilterRules({ effectiveTacticId, effectiveTechniqueId });
    }

    if (matchingRules.length === 0 && !execute) {
      throw new Error(
        `[rules] no matching rules found for tactic=${tacticId || '<none>'} technique=${
          techniqueId || '<none>'
        } os=${targetOs}`
      );
    }
  }

  if (matchingRules.length > 0) {
    const enabledRules = matchingRules.filter((r: any) => Boolean(r.enabled));
    log.info(`[rules] matching rules: ${matchingRules.length} (enabled: ${enabledRules.length})`);
    for (const r of matchingRules.slice(0, 25)) {
      const osInfo = ruleSupportsOs(r, targetOs).reason;
      log.info(
        `  - ${r.id} enabled=${Boolean(r.enabled)} name="${r.name}"${
          osInfo ? ` note="${osInfo}"` : ''
        }`
      );
    }
    if (matchingRules.length > 25) log.info(`  ... and ${matchingRules.length - 25} more`);

    // Enable gate
    if (enabledRules.length === 0) {
      if (enableMatchingRules) {
        log.warning(
          `[rules] enabling ${matchingRules.length} matching rules (explicit flag enabled)`
        );
        await enableRulesById(
          kbnClient,
          matchingRules.map((r: any) => r.id)
        );
      } else {
        throw new Error(
          `[rules] matching rules exist but none are enabled. Re-run with --enableRules to enable them.`
        );
      }
    }
  } else {
    log.warning(
      `[rules] skipping MITRE rule coverage check in plan (no tactic/technique provided)`
    );
  }

  // 4) Prerequisites (best-effort), only meaningful when a concrete target is chosen
  if (fleetAgentId && remediatePrereqs && matchingRules.length > 0) {
    const target = allAgents.find((a: any) => a.id === fleetAgentId);
    if (!target) throw new Error(`[fleet] agent not found: ${fleetAgentId}`);

    const policyId = String(target?.policy_id ?? '');
    if (!policyId) throw new Error(`[fleet] selected agent has no policy_id: ${fleetAgentId}`);

    const policy = await fetchAgentPolicy(kbnClient, policyId);
    const prereqs = inferPrereqPackages(matchingRules[0]);

    log.info(
      `[prereqs] inferred packages for rule "${matchingRules[0].name}": ${
        prereqs.length ? prereqs.join(', ') : '<none>'
      }`
    );
    log.info(`[prereqs] target policy: ${policy.name} (${policy.id})`);

    const { attached, skipped } = await attachKnownPrereqsToPolicy({
      kbnClient,
      log,
      agentPolicyId: policy.id,
      packages: prereqs,
    });

    if (attached.length) log.info(`[prereqs] attached to policy: ${attached.join(', ')}`);
    if (skipped.length)
      log.warning(
        `[prereqs] could not auto-attach (unsupported generic config): ${skipped.join(', ')}`
      );
  }

  // Stop here unless explicitly executing
  if (!execute) {
    log.info(`[plan] complete. Re-run with --execute --fleetAgentId <id> to run Caldera.`);
    return;
  }

  // Invoke-Atomic execution path (Linux GCP VMs via gcloud ssh)
  if (useInvokeAtomic) {
    ok(Boolean(techniqueId), `[invoke-atomic] requires --technique`);
    ok(Boolean(gcpProject), `[invoke-atomic] requires --gcpProject`);
    ok(Boolean(gcpZone), `[invoke-atomic] requires --gcpZone`);

    let selectedFleetAgentId = fleetAgentId;
    if (!selectedFleetAgentId && autoSelectAgent) {
      ok(candidates.length > 0, `[autoSelect] no Fleet candidates available`);
      // For Invoke-Atomic we don't require Caldera paw matching; pick the first candidate deterministically.
      selectedFleetAgentId = candidates[0].id;
      log.info(
        `[autoSelect] selected Fleet agent: ${selectedFleetAgentId} host=${getFleetHostname(
          candidates[0]
        )}`
      );
    }

    const target = allAgents.find((a: any) => a.id === selectedFleetAgentId);
    ok(Boolean(target), `[fleet] agent not found: ${selectedFleetAgentId}`);
    const hostname = getFleetHostname(target);
    ok(
      Boolean(hostname),
      `[fleet] selected agent has no hostname metadata: ${selectedFleetAgentId}`
    );

    const execTargetOs: TargetOs =
      targetOs === 'any' ? inferTargetOsFromFleetOsFamily(getFleetOsFamily(target)) : targetOs;
    ok(
      execTargetOs === 'linux',
      `[invoke-atomic] currently supports linux only (got targetOs=${execTargetOs})`
    );

    // Best-effort prereq remediation for the selected host
    if (remediatePrereqs && matchingRules.length > 0) {
      const policyId = String(target?.policy_id ?? '');
      if (!policyId)
        throw new Error(`[fleet] selected agent has no policy_id: ${selectedFleetAgentId}`);
      const policy = await fetchAgentPolicy(kbnClient, policyId);
      const prereqs = inferPrereqPackages(matchingRules[0]);
      log.info(
        `[prereqs] inferred packages for rule "${matchingRules[0].name}": ${
          prereqs.length ? prereqs.join(', ') : '<none>'
        }`
      );
      log.info(`[prereqs] target policy: ${policy.name} (${policy.id})`);
      const { attached, skipped } = await attachKnownPrereqsToPolicy({
        kbnClient,
        log,
        agentPolicyId: policy.id,
        packages: prereqs,
      });
      if (attached.length) log.info(`[prereqs] attached to policy: ${attached.join(', ')}`);
      if (skipped.length)
        log.warning(
          `[prereqs] could not auto-attach (unsupported generic config): ${skipped.join(', ')}`
        );
    }

    // Pick the rule we'll wait on (plan stage already ensured enablement when --enableRules is set)
    const enabled = matchingRules.filter((r: any) => Boolean(r.enabled));
    const ruleIdForAlerts = (enabled[0]?.id ?? matchingRules[0]?.id ?? '') as string;
    ok(
      Boolean(ruleIdForAlerts),
      `[invoke-atomic] no matching rule id available to wait for alerts`
    );

    const startedAt = new Date().toISOString();
    await runInvokeAtomicOnGcpLinux({
      log,
      gcpProject,
      gcpZone,
      instanceName: hostname,
      techniqueId,
      cleanup: invokeAtomicCleanup,
    });

    if (waitForAlertsEnabled) {
      log.info(
        `[alerts] waiting up to ${waitForAlertsMs}ms for alerts for rule ${ruleIdForAlerts}...`
      );
      const count = await waitForAlerts({
        esClient,
        ruleId: ruleIdForAlerts,
        startedAt,
        hostname,
        timeoutMs: waitForAlertsMs,
        pollMs: waitForAlertsPollMs,
        log,
      });
      if (count > 0) {
        log.info(`[alerts] success: found ${count} alert(s) for rule ${ruleIdForAlerts}`);
      } else {
        log.warning(`[alerts] timed out: no alerts found for rule ${ruleIdForAlerts}`);
      }
    }
    return;
  }

  // 5) Caldera validation + execution
  const caldera = new CalderaClient({ calderaUrl, apiKey: calderaApiKey });
  const healthy = await caldera.healthCheck();
  ok(healthy, `[caldera] health check failed for ${calderaUrl}`);

  const calderaAgents = await caldera.getAgents();
  if (listAbilities) {
    const abilities = await caldera.getAbilities();
    log.info(`[caldera] abilities available: ${abilities.length}`);
    for (const ab of abilities.slice(0, 50)) {
      const execs = Array.isArray(ab?.executors) ? ab.executors : [];
      const platforms = [
        ...new Set(execs.map((e: any) => String(e?.platform ?? '')).filter(Boolean)),
      ].sort();
      log.info(
        `  - ${ab?.ability_id ?? ab?.id ?? '<no-id>'} name="${String(
          ab?.name ?? ''
        )}" tactic=${String(ab?.tactic ?? '')} technique=${String(
          ab?.technique_id ?? ab?.technique?.attack_id ?? ''
        )} platforms=${platforms.join(',')}`
      );
    }
    if (abilities.length > 50) log.info(`  ... and ${abilities.length - 50} more`);
  }

  let selectedFleetAgentId = fleetAgentId;
  if (!selectedFleetAgentId && autoSelectAgent) {
    const paws = new Set(calderaAgents.map((a: any) => String(a?.paw ?? '')).filter(Boolean));
    const match = candidates.find((a: any) => paws.has(getFleetHostname(a)));
    ok(
      Boolean(match),
      `[autoSelect] no Fleet candidate matched any Caldera paw (sandcat -paw %H expected)`
    );
    selectedFleetAgentId = match.id;
    log.info(
      `[autoSelect] selected Fleet agent: ${selectedFleetAgentId} host=${getFleetHostname(match)}`
    );
  }

  const target = allAgents.find((a: any) => a.id === selectedFleetAgentId);
  ok(Boolean(target), `[fleet] agent not found: ${selectedFleetAgentId}`);

  const hostname = getFleetHostname(target);
  ok(Boolean(hostname), `[fleet] selected agent has no hostname metadata: ${selectedFleetAgentId}`);
  const execTargetOs: TargetOs =
    targetOs === 'any' ? inferTargetOsFromFleetOsFamily(getFleetOsFamily(target)) : targetOs;
  let calderaAgent = calderaAgents.find((a: any) => String(a?.paw ?? '') === hostname);
  ok(
    Boolean(calderaAgent),
    `[caldera] no sandcat agent found matching paw=${hostname} (deploy sandcat with -paw %H)`
  );
  if (calderaAgent?.trusted === false) {
    if (!trustCalderaAgent) {
      throw new Error(
        `[caldera] agent paw=${hostname} is not trusted, so Caldera will not execute abilities. ` +
          `Trust it in the Caldera UI (Agents → trust) or re-run with --trustCalderaAgent.`
      );
    }
    log.warning(`[caldera] trusting agent paw=${hostname} via API...`);
    await caldera.updateAgent(hostname, { ...calderaAgent, trusted: true });
    calderaAgent = await caldera.getAgentByPaw(hostname);
    log.info(`[caldera] agent paw=${hostname} trusted=${Boolean(calderaAgent?.trusted)}`);
  }

  const abilities = await caldera.getAbilities();
  const platform = normalizeOsToCalderaPlatform(execTargetOs);
  const executorMatches = (ab: any): boolean => {
    if (platform === 'any') return true;
    const executors = Array.isArray(ab?.executors) ? ab.executors : [];
    return executors.some((ex: any) => String(ex?.platform ?? '') === platform);
  };

  let filteredAbilities = abilities.filter(executorMatches);
  if (abilityId || abilityName) {
    const found = filteredAbilities.find((ab: any) => {
      const id = String(ab?.ability_id ?? ab?.id ?? '').trim();
      const name = String(ab?.name ?? '').trim();
      if (abilityId && id === abilityId) return true;
      if (abilityName && name === abilityName) return true;
      return false;
    });
    ok(
      Boolean(found),
      `[caldera] ability not found (abilityId="${abilityId || '<none>'}" abilityName="${
        abilityName || '<none>'
      }")`
    );
    filteredAbilities = [found];
    effectiveTacticId = String(found?.tactic ?? '');
    effectiveTechniqueId = String(found?.technique_id ?? found?.technique?.attack_id ?? '');
    log.info(
      `[caldera] ability selected explicitly: name="${String(found?.name ?? '')}" tactic=${
        effectiveTacticId || '<none>'
      } technique=${effectiveTechniqueId || '<none>'}`
    );
  } else if (randomAbility) {
    // Prefer selecting an ability that maps to an installed Elastic rule (by technique id).
    // This makes the smoke-test rely on prebuilt rule coverage rather than temporary rules.
    if (installPrebuilt) {
      await installPrebuiltRules(kbnClient).catch((e: any) => {
        log.warning(
          `[rules] prebuilt installation failed (continuing): ${String(e?.message ?? e)}`
        );
      });
    }

    const picked = await pickRandomAbilityWithInstalledRuleCoverage({
      kbnClient,
      abilities,
      targetOs: execTargetOs,
      executorMatches,
      log,
      stableOnly: stableAbilities,
      preferEndpointPrebuiltRules,
    });

    filteredAbilities = [picked];
    effectiveTacticId = String(picked?.tactic ?? '');
    effectiveTechniqueId = String(picked?.technique_id ?? picked?.technique?.attack_id ?? '');

    log.info(
      `[caldera] random ability picked (prebuilt-first): name="${String(
        picked?.name ?? ''
      )}" tactic=${effectiveTacticId || '<none>'} technique=${effectiveTechniqueId || '<none>'}`
    );
  } else {
    filteredAbilities = filteredAbilities.filter((ab: any) => {
      const tacticOk = effectiveTacticId ? String(ab?.tactic ?? '') === effectiveTacticId : true;
      const techOk = effectiveTechniqueId
        ? String(ab?.technique_id ?? ab?.technique?.attack_id ?? '') === effectiveTechniqueId
        : true;
      return tacticOk && techOk;
    });
  }

  ok(
    filteredAbilities.length > 0,
    `[caldera] no abilities found matching requested selection for platform=${platform}`
  );

  // Choose first ability by default (deterministic). Future: interactive/explicit ability selection.
  const ability = filteredAbilities[0];
  log.info(`[caldera] selected ability: ${ability?.name ?? ability?.ability_id ?? '<unknown>'}`);

  let ruleIdForAlerts = '';
  // Ensure rule coverage for the effective MITRE mapping.
  matchingRules = [];
  if (effectiveTacticId || effectiveTechniqueId) {
    // Prefer technique match. Caldera tactic strings do not match rule tactic ids (TA****).
    matchingRules = await findAndFilterRules({ effectiveTacticId: '', effectiveTechniqueId }).then(
      (rules) =>
        // Apply OS gating using the execution OS (not "any") when possible
        rules.filter((r: any) => ruleSupportsOs(r, execTargetOs).supported)
    );
    if (matchingRules.length === 0 && installPrebuilt) {
      log.warning(
        `[rules] no matching rules for selected ability; attempting prebuilt rules installation...`
      );
      await installPrebuiltRules(kbnClient).catch((e: any) => {
        log.warning(
          `[rules] prebuilt installation failed (continuing): ${String(e?.message ?? e)}`
        );
      });
      matchingRules = await findAndFilterRules({
        effectiveTacticId: '',
        effectiveTechniqueId,
      }).then((rules) => rules.filter((r: any) => ruleSupportsOs(r, execTargetOs).supported));
    }
  }

  // When multiple rules map to the same technique, prefer a rule whose query mentions tokens present in the ability executor command.
  // This increases the chance that the prebuilt rule actually fires for the chosen ability.
  if (matchingRules.length > 1) {
    const executors = Array.isArray(ability?.executors) ? ability.executors : [];
    const preferredExecutor =
      platform === 'any'
        ? executors[0]
        : executors.find((ex: any) => String(ex?.platform ?? '') === platform) ?? executors[0];
    const cmd = String(preferredExecutor?.command ?? '');
    const tokens = deriveKqlTokensFromExecutorCommand(cmd, 8);
    const scored = matchingRules
      .map((r: any) => {
        const q = String(r?.query ?? '').toLowerCase();
        const score = tokens.reduce((acc, t) => acc + (q.includes(t.toLowerCase()) ? 1 : 0), 0);
        return { r, score };
      })
      .sort((a, b) => b.score - a.score);

    if (scored[0]?.score > 0) {
      matchingRules = [scored[0].r];
      log.info(
        `[rules] selected best-matching rule by query/token overlap: ${matchingRules[0].id} "${matchingRules[0].name}"`
      );
    } else {
      log.info(
        `[rules] multiple rules match technique, but none mention executor tokens; keeping first match: ${matchingRules[0].id} "${matchingRules[0].name}"`
      );
    }
  }

  if (matchingRules.length === 0 && createRuleIfMissing) {
    const tmp = buildTemporaryTestRuleForAbility({
      ability,
      targetOs,
      hostname,
      tacticId: effectiveTacticId || undefined,
      techniqueId: effectiveTechniqueId || undefined,
    });
    log.warning(`[rules] creating temporary test rule: ${tmp.name}`);
    const created = await createRule(kbnClient, {
      name: tmp.name,
      description: `Temporary smoke-test rule created by caldera_mitre_rule_validation (auto).`,
      query: tmp.query,
      tags: tmp.tags,
      threat: tmp.threat,
      enabled: true,
      interval: '1m',
      from: 'now-120s',
      risk_score: 47,
      severity: 'medium',
    });
    ruleIdForAlerts = created.id;
  } else if (matchingRules.length === 0) {
    throw new Error(
      `[rules] no matching rules found for selected ability mapping tactic=${
        effectiveTacticId || '<none>'
      } technique=${effectiveTechniqueId || '<none>'} os=${targetOs}`
    );
  } else {
    ruleIdForAlerts = matchingRules[0]?.id ?? '';
    const enabledRules2 = matchingRules.filter((r: any) => Boolean(r.enabled));
    if (enabledRules2.length === 0) {
      if (enableMatchingRules) {
        log.warning(
          `[rules] enabling ${matchingRules.length} matching rules (explicit flag enabled)`
        );
        await enableRulesById(
          kbnClient,
          matchingRules.map((r: any) => r.id)
        );
      } else {
        throw new Error(
          `[rules] matching rules exist but none are enabled. Re-run with --enableRules to enable them.`
        );
      }
    }
  }
  ok(Boolean(ruleIdForAlerts), `[alerts] unable to determine rule id for alert waiting`);

  // Best-effort prerequisite remediation for the selected target agent + selected prebuilt rule.
  // (This is important when using --autoSelectAgent; the earlier prereq step may not have run.)
  if (remediatePrereqs && matchingRules.length > 0) {
    const policyId = String(target?.policy_id ?? '');
    if (!policyId) {
      log.warning(`[prereqs] selected agent has no policy_id; skipping prerequisite remediation`);
    } else {
      const policy = await fetchAgentPolicy(kbnClient, policyId);
      const prereqs = inferPrereqPackages(matchingRules[0]);
      log.info(
        `[prereqs] inferred packages for rule "${matchingRules[0].name}": ${
          prereqs.length ? prereqs.join(', ') : '<none>'
        }`
      );
      log.info(`[prereqs] target policy: ${policy.name} (${policy.id})`);
      const { attached, skipped } = await attachKnownPrereqsToPolicy({
        kbnClient,
        log,
        agentPolicyId: policy.id,
        packages: prereqs,
      });
      if (attached.length) log.info(`[prereqs] attached to policy: ${attached.join(', ')}`);
      if (skipped.length)
        log.warning(
          `[prereqs] could not auto-attach (unsupported generic config): ${skipped.join(', ')}`
        );
    }
  }

  const adversaryName = `mitre-test-${Date.now()}`;
  const adversary = await caldera.createAdversary({
    name: adversaryName,
    description: `Temporary adversary for MITRE test (tactic=${
      effectiveTacticId || 'n/a'
    } technique=${effectiveTechniqueId || 'n/a'})`,
    atomic_ordering: [ability.ability_id ?? ability.id],
  });
  const adversaryId = adversary?.adversary_id ?? adversary?.id;
  ok(Boolean(adversaryId), `[caldera] failed to create adversary`);

  const group = calderaGroup || calderaAgent?.group || '';
  ok(
    Boolean(group),
    `[caldera] no --calderaGroup provided and agent has no group; cannot target operation`
  );

  const opName = `mitre-test-${hostname}-${Date.now()}`;
  const startedAt = new Date().toISOString();
  const operation = await caldera.createOperation({
    name: opName,
    adversary: { adversary_id: adversaryId },
    state: 'running',
    autonomous: 1,
    auto_close: true,
    // Target a single agent to make the UI/links unambiguous
    host_group: [hostname],
    group,
  });
  log.info(`[caldera] operation started: ${opName} (${operation?.id ?? 'no-id'}) group=${group}`);

  if (waitForAlertsEnabled) {
    log.info(
      `[alerts] waiting up to ${waitForAlertsMs}ms for alerts for rule ${ruleIdForAlerts}...`
    );
    const count = await waitForAlerts({
      esClient,
      ruleId: ruleIdForAlerts,
      startedAt,
      hostname,
      timeoutMs: waitForAlertsMs,
      pollMs: waitForAlertsPollMs,
      log,
    });
    if (count > 0) {
      log.info(`[alerts] success: found ${count} alert(s) for rule ${ruleIdForAlerts}`);
    } else {
      log.warning(`[alerts] timed out: no alerts found for rule ${ruleIdForAlerts}`);
    }
  }
};

export const cli = async () => {
  return run(runCli, {
    description: `Plan + (optionally) execute a Caldera MITRE technique/tactic emulation, gated on Elastic rule coverage.

Default mode is **plan**: it lists in-scope Fleet agents (excluding Fleet Server) and validates rule coverage/enabled state.
Execution requires --execute and a single --fleetAgentId target.
`,
    flags: {
      string: [
        'kibanaUrl',
        'elasticUrl',
        'username',
        'password',
        'apiKey',
        'spaceId',
        'tactic',
        'technique',
        'targetOs',
        'fleetAgentId',
        'calderaUrl',
        'calderaApiKey',
        'calderaGroup',
        'waitForAlertsMs',
        'waitForAlertsPollMs',
        'abilityId',
        'abilityName',
        'gcpProject',
        'gcpZone',
      ],
      boolean: [
        'execute',
        'enableRules',
        'installPrebuilt',
        'remediatePrereqs',
        'autoSelectAgent',
        'randomAbility',
        'stableAbilities',
        'preferEndpointPrebuiltRules',
        'useInvokeAtomic',
        'invokeAtomicCleanup',
        'createRuleIfMissing',
        'trustCalderaAgent',
        'listAbilities',
        'waitForAlerts',
        'verbose',
      ],
      default: {
        kibanaUrl: 'http://127.0.0.1:5601',
        elasticUrl: 'http://127.0.0.1:9200',
        username: 'elastic',
        password: 'changeme',
        apiKey: '',
        spaceId: '',
        targetOs: 'any',
        execute: false,
        enableRules: false,
        installPrebuilt: true,
        remediatePrereqs: true,
        autoSelectAgent: false,
        randomAbility: false,
        stableAbilities: false,
        preferEndpointPrebuiltRules: true,
        abilityId: '',
        abilityName: '',
        useInvokeAtomic: false,
        invokeAtomicCleanup: true,
        gcpProject: '',
        gcpZone: 'us-central1-a',
        createRuleIfMissing: false,
        trustCalderaAgent: false,
        listAbilities: false,
        waitForAlerts: false,
        waitForAlertsMs: '120000',
        waitForAlertsPollMs: '5000',
        calderaGroup: '',
        verbose: false,
      },
      help: `
      --tactic            MITRE tactic id (e.g., TA0002)
      --technique         MITRE technique/sub-technique id (e.g., T1059 or T1059.001)
      --targetOs          windows|linux|macos|any (default: any)

      --execute           Actually run a Caldera operation (default: false)
      --fleetAgentId      Required for --execute. Fleet agent id to run against (single-target)
      --autoSelectAgent   If set, auto-select the first Fleet candidate whose hostname matches a Caldera agent paw
      --randomAbility     If set, pick a random Caldera ability that maps to an installed Elastic rule (by technique id)
      --stableAbilities   If set, avoid known flaky/destructive abilities (agent bootstrappers, dd overwrite, etc.)
      --preferEndpointPrebuiltRules If set (default), only select abilities that map to endpoint-telemetry rules with satisfiable prerequisites (avoid AWS/Azure/O365-only rules)
      --abilityId         If set, run a specific Caldera ability by id (overrides --randomAbility/--tactic/--technique)
      --abilityName       If set, run a specific Caldera ability by exact name (overrides --randomAbility/--tactic/--technique)
      --useInvokeAtomic   If set (or implied by --execute + --technique), run Invoke-AtomicTest on the target host instead of a Caldera ability (Linux GCP VMs via gcloud ssh)
      --invokeAtomicCleanup If set (default), run Invoke-Atomic cleanup after the test
      --gcpProject        Required for Invoke-Atomic execution. GCP project id for gcloud ssh
      --gcpZone           Required for Invoke-Atomic execution. GCP zone for gcloud ssh (default: us-central1-a)
      --createRuleIfMissing   If set, create a temporary host-scoped query rule derived from the ability executor command when coverage is missing
      --trustCalderaAgent If set, mark the selected Caldera agent as trusted via API (required if Caldera shows trusted=false)

      --enableRules       If matching rules are found but disabled, enable them (explicit)
      --installPrebuilt   If no matching rules found, attempt to install prebuilt rules (default: true)
      --remediatePrereqs  Best-effort: install/attach known prerequisite integrations to the target policy (default: true)

      --listAbilities      Print available Caldera abilities (uses Caldera API) (max 50)
      --calderaUrl        Required for --execute. Caldera base URL (e.g., http://127.0.0.1:8888)
      --calderaApiKey     Required for --execute. Caldera API key (header KEY: ...)
      --calderaGroup      Optional for --execute. Caldera agent group to target (defaults to matched agent group)

      --waitForAlerts      After starting the operation, poll Elasticsearch for alerts from the enabled/created rule
      --waitForAlertsMs    Max time to wait for alerts (default: 120000)
      --waitForAlertsPollMs Poll interval (default: 5000)

      --kibanaUrl         Kibana URL (default: http://127.0.0.1:5601)
      --elasticUrl        Elasticsearch URL (default: http://127.0.0.1:9200)
      --username          Kibana username (default: elastic)
      --password          Kibana password (default: changeme)
      --apiKey            Kibana API key (alternative to username/password)
      --spaceId           Kibana space id (default: active/default space)
      `,
    },
  });
};
