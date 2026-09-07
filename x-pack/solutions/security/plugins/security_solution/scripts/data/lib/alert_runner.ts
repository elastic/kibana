/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { KbnClient } from '@kbn/test';
import { copyPreviewAlertsToRealAlertsIndex, previewRule } from './rule_preview';
import {
  createCustomRule,
  deleteRules,
  disableRules,
  enableRules,
  fetchAllInstalledRules,
  fetchRuleById,
  findInstalledRuleByRuleId,
  toRuleCreateProps,
  type ResolvedRuleRef,
} from './ruleset';
import { formatError } from './type_guards';

/** Elastic Endpoint Security prebuilt rule. */
export const ENDPOINT_SECURITY_RULE_ID = '9a1a2dae-0b5f-4c3d-8305-a268d404c306';
const ENDPOINT_SECURITY_QUERY = 'event.kind:alert and event.module:(endpoint and not endgame)';
/** Legacy stand-in rule_id from older generator runs (cleaned up on resolve). */
const LEGACY_GENERATOR_ENDPOINT_SECURITY_RULE_ID = 'data-generator-endpoint-security';
const ENDPOINT_SECURITY_DESCRIPTION =
  'Generates a detection alert each time an Elastic Endpoint Security alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.';

export type AlertMode = 'preview' | 'live' | 'none';

export interface PreviewTuning {
  interval: string;
  invocationCount: number;
  previewWindowSeconds: number;
  timeframeEndIso: string;
  timestampRange: { startMs: number; endMs: number };
}

export interface RuleAlertJob {
  ruleRef: ResolvedRuleRef;
  /** Indices the rule should query (overrides rule.index). */
  index: string[];
  /** When true, log.warning on 0 alerts (pack hunts). */
  expectAlerts?: boolean;
  label?: string;
}

const countPreviewAlerts = async ({
  esClient,
  spaceId,
  previewId,
}: {
  esClient: Client;
  spaceId: string;
  previewId: string;
}): Promise<number> => {
  const previewIndex = `.preview.alerts-security.alerts-${spaceId}`;
  try {
    const resp = await esClient.count({
      index: previewIndex,
      query: { term: { 'kibana.alert.rule.uuid': previewId } },
    });
    return resp.count;
  } catch {
    return 0;
  }
};

/**
 * Resolve Endpoint Security for episode alerts.
 * Prefer the Elastic prebuilt rule_id; if missing (common on minimal installs), create a
 * stand-in that reuses the real prebuilt rule_id / description so alerts look authentic.
 */
export const resolveEndpointSecurityRule = async ({
  kbnClient,
  log,
  index,
  ruleFrom,
}: {
  kbnClient: KbnClient;
  log: ToolingLog;
  index: string[];
  ruleFrom?: string;
}): Promise<ResolvedRuleRef | undefined> => {
  const byId = await findInstalledRuleByRuleId({
    kbnClient,
    ruleId: ENDPOINT_SECURITY_RULE_ID,
  });
  if (byId) {
    log.info(`Using installed Endpoint Security prebuilt rule (${byId.rule_id})`);
    return byId;
  }

  const installed = await fetchAllInstalledRules({ kbnClient });
  const byExactName = installed.find(
    (r) => r.name === 'Endpoint Security' && r.rule_id === ENDPOINT_SECURITY_RULE_ID
  );
  if (byExactName) {
    return { id: byExactName.id, rule_id: byExactName.rule_id, name: byExactName.name };
  }

  // Remove legacy generator-prefixed stand-in if present (older runs).
  const legacyStandIn = await findInstalledRuleByRuleId({
    kbnClient,
    ruleId: LEGACY_GENERATOR_ENDPOINT_SECURITY_RULE_ID,
  });
  if (legacyStandIn) {
    log.warning(
      `Removing legacy Endpoint Security stand-in (${LEGACY_GENERATOR_ENDPOINT_SECURITY_RULE_ID})`
    );
    await deleteRules({ kbnClient, ids: [legacyStandIn.id] });
  }

  log.warning(
    `Endpoint Security prebuilt (${ENDPOINT_SECURITY_RULE_ID}) is not installed. ` +
      `Creating a local stand-in with the same rule_id/query so episode alerts look authentic.`
  );
  return createCustomRule({
    kbnClient,
    log,
    rule: {
      name: 'Endpoint Security',
      description: ENDPOINT_SECURITY_DESCRIPTION,
      rule_id: ENDPOINT_SECURITY_RULE_ID,
      risk_score: 47,
      severity: 'medium',
      type: 'query',
      language: 'kuery',
      query: ENDPOINT_SECURITY_QUERY,
      index,
      from: ruleFrom ?? 'now-30d',
      to: 'now',
      interval: '5m',
      enabled: false,
      tags: ['Data Source: Elastic Defend', 'data-generator'],
      max_signals: 10000,
      // Keep honest attribution: do not override rule name from endpoint alert message.
    },
  });
};

/**
 * Preview a rule against concrete indices and copy honest alerts (no cross-rule relabel).
 */
export const previewAndCopyRuleAlerts = async ({
  esClient,
  kbnClient,
  log,
  spaceId,
  job,
  tuning,
}: {
  esClient: Client;
  kbnClient: KbnClient;
  log: ToolingLog;
  spaceId: string;
  job: RuleAlertJob;
  tuning: PreviewTuning;
}): Promise<number> => {
  const fullRule = await fetchRuleById({ kbnClient, id: job.ruleRef.id });
  const createProps = toRuleCreateProps(fullRule);
  createProps.interval = tuning.interval;
  createProps.from = `now-${tuning.previewWindowSeconds}s`;
  createProps.to = 'now';
  createProps.index = job.index;
  // Keep attribution honest: never let source message override the rule name.
  delete createProps.rule_name_override;
  // Keep rule ownership tags (data-generator, pack:<id>) so preview alerts inherit them.
  // Never put data-generator-fp on the rule itself.

  const label = job.label ?? job.ruleRef.name;
  log.info(`Previewing rule: ${label} (${job.ruleRef.rule_id}) indices=${job.index.join(',')}`);

  const { previewId } = await previewRule({
    kbnClient,
    log,
    req: {
      rule: createProps,
      invocationCount: tuning.invocationCount,
      timeframeEndIso: tuning.timeframeEndIso,
    },
  });

  const count = await countPreviewAlerts({ esClient, spaceId, previewId });
  log.info(`Rule preview produced ${count} alert(s) for ${label}`);

  if (count === 0) {
    if (job.expectAlerts) {
      log.warning(
        `Expected alerts for hunt/rule "${label}" but preview returned 0. ` +
          `Check index patterns and hunt query fidelity.`
      );
    }
    return 0;
  }

  await copyPreviewAlertsToRealAlertsIndex({
    esClient,
    log,
    spaceId,
    previewId,
    // Honest matching: do not rewrite kibana.alert.rule.* onto a different rule.
    // Namespace ids, attach real rule uuid, set producer=siem, jitter timestamps.
    namespaceKey: job.ruleRef.id,
    ruleUuid: job.ruleRef.id,
    timestampRange: tuning.timestampRange,
  });

  return count;
};

export const runAlertJobs = async ({
  esClient,
  kbnClient,
  log,
  spaceId,
  alertMode,
  leaveRulesDisabled = false,
  jobs,
  tuning,
}: {
  esClient: Client;
  kbnClient: KbnClient;
  log: ToolingLog;
  spaceId: string;
  alertMode: AlertMode;
  /** Live mode enables rules by default; set true to leave them disabled. */
  leaveRulesDisabled?: boolean;
  jobs: RuleAlertJob[];
  tuning: PreviewTuning;
}): Promise<Array<{ rule: string; count: number }>> => {
  const results: Array<{ rule: string; count: number }> = [];
  const ids = jobs.map((j) => j.ruleRef.id);

  if (alertMode === 'none') {
    log.info(
      `alert-mode=none: skipping alert minting / rule enable (${ids.length} job(s) unused).`
    );
    return jobs.map((j) => ({ rule: j.ruleRef.name, count: 0 }));
  }

  if (alertMode === 'live') {
    if (leaveRulesDisabled) {
      await disableRules({ kbnClient, ids });
      log.info(
        `Live mode: installed/resolved ${ids.length} rule(s) left disabled (--leave-rules-disabled). ` +
          `Re-run without that flag (or enable rules in the UI) for detection-engine alerts.`
      );
    } else {
      await enableRules({ kbnClient, ids });
      log.info(
        `Live mode: enabled ${ids.length} rule(s). Detection engine will create alerts on schedule ` +
          `(not minted by this script).`
      );
    }
    return jobs.map((j) => ({ rule: j.ruleRef.name, count: 0 }));
  }

  // preview mode
  for (const job of jobs) {
    try {
      const count = await previewAndCopyRuleAlerts({
        esClient,
        kbnClient,
        log,
        spaceId,
        job,
        tuning,
      });
      results.push({ rule: job.ruleRef.name, count });
    } catch (e) {
      log.warning(`Preview failed for ${job.ruleRef.name}: ${formatError(e)}`);
      results.push({ rule: job.ruleRef.name, count: 0 });
    }
  }
  return results;
};
