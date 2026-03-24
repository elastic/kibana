/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { KbnClient } from '@kbn/test';
import {
  BOOTSTRAP_PREBUILT_RULES_URL,
  GET_PREBUILT_RULES_STATUS_URL,
  PERFORM_RULE_INSTALLATION_URL,
  REVIEW_RULE_INSTALLATION_URL,
} from '../../../common/api/detection_engine/prebuilt_rules';

interface PrebuiltRulesStatusResponse {
  stats: {
    num_prebuilt_rules_installed: number;
    num_prebuilt_rules_to_install: number;
    num_prebuilt_rules_to_upgrade: number;
    num_prebuilt_rules_total_in_package: number;
  };
}

const INTERNAL_API_VERSION = '1';
const TARGET_PREBUILT_RULE_INSTALL_COUNT = 15;

export const ensurePrebuiltRulesInstalled = async ({
  kbnClient,
  log,
}: {
  kbnClient: KbnClient;
  log: ToolingLog;
}) => {
  const statusResp = await kbnClient.request<PrebuiltRulesStatusResponse>({
    method: 'GET',
    path: GET_PREBUILT_RULES_STATUS_URL,
    headers: {
      'kbn-xsrf': 'true',
      'elastic-api-version': INTERNAL_API_VERSION,
    },
  });

  const stats = statusResp.data.stats;
  const needsInstall =
    stats.num_prebuilt_rules_installed === 0 || stats.num_prebuilt_rules_to_install > 0;

  if (!needsInstall) {
    log.info(
      `Prebuilt rules already installed (installed=${stats.num_prebuilt_rules_installed}, to_install=${stats.num_prebuilt_rules_to_install}).`
    );
    return;
  }

  // If there are already many installed rules, we cannot "uninstall" from here.
  // We'll only auto-install on completely fresh installs.
  if (stats.num_prebuilt_rules_installed > 0) {
    log.warning(
      `Prebuilt rules are partially installed already (installed=${stats.num_prebuilt_rules_installed}). ` +
        `This script will not install additional rules beyond what is already present.`
    );
    return;
  }

  log.info(
    `Prebuilt rules missing (installed=${stats.num_prebuilt_rules_installed}, to_install=${stats.num_prebuilt_rules_to_install}). Installing up to ${TARGET_PREBUILT_RULE_INSTALL_COUNT} prebuilt rules...`
  );

  try {
    // Bootstrap packages needed for prebuilt rules (Fleet/EPR dependent).
    await kbnClient.request({
      method: 'POST',
      path: BOOTSTRAP_PREBUILT_RULES_URL,
      headers: {
        'kbn-xsrf': 'true',
        'elastic-api-version': INTERNAL_API_VERSION,
      },
    });

    // Get the list of installable rules and install a small deterministic subset.
    const review = await kbnClient.request<{
      rules: Array<{ rule_id: string; name: string; version?: number; immutable?: boolean }>;
    }>({
      method: 'POST',
      path: REVIEW_RULE_INSTALLATION_URL,
      headers: {
        'kbn-xsrf': 'true',
        'elastic-api-version': INTERNAL_API_VERSION,
      },
    });

    const installablePool = review.data.rules
      .filter((r): r is { rule_id: string; name: string; version: number; immutable?: boolean } => {
        return (
          typeof r.rule_id === 'string' &&
          typeof r.name === 'string' &&
          typeof r.version === 'number'
        );
      })
      // Prefer immutable=true (prebuilt Elastic rules), but don't hard-require it since the review API
      // can vary across environments.
      .sort((a, b) => {
        const aImm = a.immutable === true ? 1 : 0;
        const bImm = b.immutable === true ? 1 : 0;
        if (aImm !== bImm) return bImm - aImm;
        return (
          a.name.localeCompare(b.name) ||
          b.version - a.version ||
          a.rule_id.localeCompare(b.rule_id)
        );
      })
      .map((r) => ({ rule_id: r.rule_id, name: r.name, version: r.version }));

    // Pick the first N installable prebuilt rules, unique by title (and rule_id).
    const finalSelection: Array<{ rule_id: string; name: string; version: number }> = [];
    const seenRuleIds = new Set<string>();
    const seenNames = new Set<string>();
    for (const r of installablePool) {
      if (finalSelection.length >= TARGET_PREBUILT_RULE_INSTALL_COUNT) break;
      if (!seenRuleIds.has(r.rule_id) && !seenNames.has(r.name)) {
        seenRuleIds.add(r.rule_id);
        seenNames.add(r.name);
        finalSelection.push(r);
      }
    }
    if (finalSelection.length < TARGET_PREBUILT_RULE_INSTALL_COUNT) {
      log.warning(
        `Requested ${TARGET_PREBUILT_RULE_INSTALL_COUNT} prebuilt rules but only selected ${finalSelection.length} unique titles to install.`
      );
    }

    await kbnClient.request({
      method: 'POST',
      path: PERFORM_RULE_INSTALLATION_URL,
      headers: {
        'kbn-xsrf': 'true',
        'elastic-api-version': INTERNAL_API_VERSION,
      },
      body: {
        mode: 'SPECIFIC_RULES',
        rules: finalSelection.map((r) => ({ rule_id: r.rule_id, version: r.version })),
      },
    });
  } catch (e) {
    log.error(`Failed to install prebuilt rules automatically.`);
    log.error(e);
    throw new Error(
      'Prebuilt rule installation failed. Ensure Kibana can reach Elastic Package Registry (EPR) and Fleet is set up, then install prebuilt rules via the Security app (Rules -> Install prebuilt rules) and re-run.'
    );
  }
};
