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
import { resolveRulesetForInstall } from './ruleset';

interface PrebuiltRulesStatusResponse {
  stats: {
    num_prebuilt_rules_installed: number;
    num_prebuilt_rules_to_install: number;
    num_prebuilt_rules_to_upgrade: number;
    num_prebuilt_rules_total_in_package: number;
  };
}

const INTERNAL_API_VERSION = '1';

export const ensurePrebuiltRulesInstalledBestEffort = async ({
  kbnClient,
  log,
  rulesetPath,
}: {
  kbnClient: KbnClient;
  log: ToolingLog;
  rulesetPath: string;
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
  // We'll only install the ruleset subset on completely fresh installs.
  if (stats.num_prebuilt_rules_installed > 0) {
    log.warning(
      `Prebuilt rules are partially installed already (installed=${stats.num_prebuilt_rules_installed}). ` +
        `This script will not install additional rules beyond what is already present.`
    );
    return;
  }

  log.info(
    `Prebuilt rules missing (installed=${stats.num_prebuilt_rules_installed}, to_install=${stats.num_prebuilt_rules_to_install}). Installing ruleset subset best-effort...`
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

    // Get the list of installable rules (rule_id + version) and install only the ones in the ruleset.
    const review = await kbnClient.request<{
      rules: Array<{ rule_id: string; name: string; version?: number }>;
    }>({
      method: 'POST',
      path: REVIEW_RULE_INSTALLATION_URL,
      headers: {
        'kbn-xsrf': 'true',
        'elastic-api-version': INTERNAL_API_VERSION,
      },
    });

    const toInstall = resolveRulesetForInstall({
      log,
      rulesetPath,
      installableRules: review.data.rules,
      strict: false,
    });

    if (toInstall.length === 0) {
      log.warning(`No installable prebuilt rules matched the ruleset; skipping install.`);
      return;
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
        rules: toInstall.map((r) => ({ rule_id: r.rule_id, version: r.version })),
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
