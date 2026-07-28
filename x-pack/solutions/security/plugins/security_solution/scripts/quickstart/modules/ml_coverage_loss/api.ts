/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { catchAxiosErrorFormatAndThrow } from '@kbn/securitysolution-utils';
import type { KbnClient } from '@kbn/test';
import type { ToolingLog } from '@kbn/tooling-log';
import { DETECTION_ENGINE_RULES_URL } from '../../../../common/constants';
import { PERFORM_RULE_INSTALLATION_URL } from '../../../../common/api/detection_engine/prebuilt_rules/urls';
import type { RuleAssetSavedObject } from './rule_assets';
import { RULE_ASSET_INDEX, ruleAssetSavedObjectId } from './rule_assets';

const ML_ANOMALY_DETECTORS_URL = '/internal/ml/anomaly_detectors';
const INTERNAL_API_VERSION = '1';
const PUBLIC_RULES_API_VERSION = '2023-10-31';

/**
 * Creates a bare anomaly-detection job with the given id in the `security` group. That group
 * membership is the only thing the Security UI checks to treat a job as "installed"; no datafeed
 * or open state is needed. Requires a trial/platinum license (see the module README).
 *
 * Tolerant of per-job failures so one bad id (e.g. an ML memory limit) doesn't abort the whole
 * seed — failures are logged and the rest continue.
 */
export const installLegacyMlJobs = async ({
  kbnClient,
  log,
  jobIds,
}: {
  kbnClient: KbnClient;
  log: ToolingLog;
  jobIds: string[];
}): Promise<void> => {
  log.info(`Creating ${jobIds.length} legacy ML job(s) in the "security" group...`);
  const failures: string[] = [];
  for (const jobId of jobIds) {
    try {
      await kbnClient
        .request({
          path: `${ML_ANOMALY_DETECTORS_URL}/${jobId}`,
          method: 'PUT',
          headers: { [ELASTIC_HTTP_VERSION_HEADER]: INTERNAL_API_VERSION },
          body: {
            analysis_config: {
              bucket_span: '15m',
              detectors: [{ function: 'count' }],
              influencers: [],
            },
            data_description: { time_field: '@timestamp' },
            groups: ['security'],
          },
        })
        .catch(catchAxiosErrorFormatAndThrow);
    } catch (error) {
      failures.push(jobId);
      log.warning(
        `Failed to create ML job "${jobId}": ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
  log.info(`Created ${jobIds.length - failures.length}/${jobIds.length} ML job(s)`);
};

/** Deletes ML jobs by id. Tolerates missing jobs so teardown is idempotent. */
export const deleteMlJobs = async ({
  kbnClient,
  log,
  jobIds,
}: {
  kbnClient: KbnClient;
  log: ToolingLog;
  jobIds: string[];
}): Promise<void> => {
  for (const jobId of jobIds) {
    try {
      await kbnClient.request({
        path: `${ML_ANOMALY_DETECTORS_URL}/${jobId}`,
        method: 'DELETE',
        headers: { [ELASTIC_HTTP_VERSION_HEADER]: INTERNAL_API_VERSION },
        query: { force: true },
        ignoreErrors: [404],
      });
    } catch (error) {
      log.warning(
        `Could not delete ML job "${jobId}": ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
  log.info(`Deleted up to ${jobIds.length} ML job(s) (missing ones ignored)`);
};

/** Bulk-indexes `security-rule` asset docs straight into the SO index (refreshing immediately). */
export const bulkWriteRuleAssets = async ({
  esClient,
  log,
  docs,
}: {
  esClient: EsClient;
  log: ToolingLog;
  docs: RuleAssetSavedObject[];
}): Promise<void> => {
  const response = await esClient.bulk({
    refresh: true,
    operations: docs.flatMap((doc) => [
      {
        index: {
          _index: RULE_ASSET_INDEX,
          _id: ruleAssetSavedObjectId(doc['security-rule'].rule_id, doc['security-rule'].version),
        },
      },
      doc,
    ]),
  });

  if (response.errors) {
    throw new Error(`Failed to bulk-write rule assets: ${JSON.stringify(response.items)}`);
  }
  log.info(`Wrote ${docs.length} rule asset(s)`);
};

/** Deletes rule asset docs by saved-object id. Missing docs are ignored. */
export const deleteRuleAssets = async ({
  esClient,
  log,
  soIds,
}: {
  esClient: EsClient;
  log: ToolingLog;
  soIds: string[];
}): Promise<void> => {
  await esClient.bulk({
    refresh: true,
    operations: soIds.map((_id) => ({ delete: { _index: RULE_ASSET_INDEX, _id } })),
  });
  // Bulk deletes of missing docs report `not_found` rather than a hard error; nothing to assert.
  log.info(`Deleted ${soIds.length} rule asset(s) (if they existed)`);
};

/** Installs specific prebuilt rules (by rule_id + version) from the already-written assets. */
export const performInstallSpecificRules = async ({
  kbnClient,
  log,
  rules,
}: {
  kbnClient: KbnClient;
  log: ToolingLog;
  rules: Array<{ rule_id: string; version: number }>;
}): Promise<void> => {
  log.info(
    `Installing ${rules.length} prebuilt rule(s): ${rules.map((r) => r.rule_id).join(', ')}`
  );
  await kbnClient
    .request({
      path: PERFORM_RULE_INSTALLATION_URL,
      method: 'POST',
      headers: { [ELASTIC_HTTP_VERSION_HEADER]: INTERNAL_API_VERSION },
      body: { mode: 'SPECIFIC_RULES', rules },
    })
    .catch(catchAxiosErrorFormatAndThrow);
};

/** Patches an installed rule, which marks it as customized for the three-way diff. */
export const patchRule = async ({
  kbnClient,
  log,
  ruleId,
  patch,
}: {
  kbnClient: KbnClient;
  log: ToolingLog;
  ruleId: string;
  patch: Record<string, unknown>;
}): Promise<void> => {
  log.info(`Patching rule "${ruleId}" to mark it customized`);
  await kbnClient
    .request({
      path: DETECTION_ENGINE_RULES_URL,
      method: 'PATCH',
      headers: { [ELASTIC_HTTP_VERSION_HEADER]: PUBLIC_RULES_API_VERSION },
      body: { rule_id: ruleId, ...patch },
    })
    .catch(catchAxiosErrorFormatAndThrow);
};

/** Deletes an installed rule by rule_id. Tolerates a missing rule so teardown is idempotent. */
export const deleteRuleByRuleId = async ({
  kbnClient,
  log,
  ruleId,
}: {
  kbnClient: KbnClient;
  log: ToolingLog;
  ruleId: string;
}): Promise<void> => {
  try {
    await kbnClient.request({
      path: DETECTION_ENGINE_RULES_URL,
      method: 'DELETE',
      headers: { [ELASTIC_HTTP_VERSION_HEADER]: PUBLIC_RULES_API_VERSION },
      query: { rule_id: ruleId },
      ignoreErrors: [404],
    });
    log.info(`Deleted rule "${ruleId}" (if it existed)`);
  } catch (error) {
    log.warning(
      `Could not delete rule "${ruleId}": ${error instanceof Error ? error.message : String(error)}`
    );
  }
};
