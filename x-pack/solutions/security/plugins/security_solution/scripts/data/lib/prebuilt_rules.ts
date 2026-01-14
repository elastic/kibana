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

export const ensurePrebuiltRulesInstalledBestEffort = async ({
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
  const needsInstall = stats.num_prebuilt_rules_installed === 0 || stats.num_prebuilt_rules_to_install > 0;

  if (!needsInstall) {
    log.info(
      `Prebuilt rules already installed (installed=${stats.num_prebuilt_rules_installed}, to_install=${stats.num_prebuilt_rules_to_install}).`
    );
    return;
  }

  log.info(
    `Prebuilt rules missing (installed=${stats.num_prebuilt_rules_installed}, to_install=${stats.num_prebuilt_rules_to_install}). Installing best-effort...`
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

    await kbnClient.request({
      method: 'POST',
      path: PERFORM_RULE_INSTALLATION_URL,
      headers: {
        'kbn-xsrf': 'true',
        'elastic-api-version': INTERNAL_API_VERSION,
      },
      body: {},
    });
  } catch (e) {
    log.error(`Failed to install prebuilt rules automatically.`);
    log.error(e);
    throw new Error(
      'Prebuilt rule installation failed. Ensure Kibana can reach Elastic Package Registry (EPR) and Fleet is set up, then install prebuilt rules via the Security app (Rules -> Install prebuilt rules) and re-run.'
    );
  }
};

