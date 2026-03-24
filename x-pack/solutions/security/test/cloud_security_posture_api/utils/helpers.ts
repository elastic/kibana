/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { RetryService } from '@kbn/ftr-common-functional-services';
import type { Agent } from 'supertest';
import type { ToolingLog } from '@kbn/tooling-log';
import type { CallbackHandler, Response } from 'superagent';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import expect from '@kbn/expect';

/**
 * Checks if plugin initialization was done
 * Required before indexing findings
 */
export const waitForPluginInitialized = ({
  retry,
  logger,
  supertest,
}: {
  retry: RetryService;
  logger: ToolingLog;
  supertest: Pick<Agent, 'get'>;
}): Promise<void> =>
  retry.try(async () => {
    logger.debug('Check CSP plugin is initialized');
    const response = await supertest
      .get('/internal/cloud_security_posture/status?check=init')
      .set(ELASTIC_HTTP_VERSION_HEADER, '1')
      .expect(200);
    expect(response.body).to.eql({ isPluginInitialized: true });
    logger.debug('CSP plugin is initialized');
  });

export function result(status: number, logger?: ToolingLog): CallbackHandler {
  return (err: any, res: Response) => {
    if ((res?.status || err.status) !== status) {
      throw new Error(
        `Expected ${status} ,got ${res?.status || err.status} resp: ${
          res?.body ? JSON.stringify(res.body) : err.text
        }`
      );
    } else if (err) {
      logger?.warning(`Error result ${err.text}`);
    }
  };
}

/**
 * Loads a security alerts esArchiver archive, handling the race condition where
 * Kibana's alerting framework auto-recreates the internal alerts index after deletion.
 *
 * The archive defines `.internal.alerts-security.alerts-default-000001` with
 * `is_write_index: true` on the `.alerts-security.alerts-default` alias. Kibana also
 * creates such an index on startup. When esArchiver deletes the existing index and
 * recreates it, Kibana may simultaneously create a new index (e.g. -000002) with the
 * same alias and `is_write_index: true`, causing an `illegal_state_exception`.
 *
 * This function handles the conflict by:
 * 1. Attempting a normal load
 * 2. On failure: cleaning up any Kibana-recreated duplicate indices, fixing aliases
 *    on the archive-created index, and loading data only
 */
export const loadAlertArchive = async ({
  es,
  esArchiver,
  logger,
  archivePath,
}: {
  es: Client;
  esArchiver: { load: (path: string, options?: { docsOnly?: boolean }) => Promise<unknown> };
  logger: ToolingLog;
  archivePath: string;
}): Promise<void> => {
  const archiveIndex = '.internal.alerts-security.alerts-default-000001';

  // Delete only the specific archive index if it exists from a previous test suite.
  // We avoid a broad wildcard delete (e.g., -default-*) to prevent interfering
  // with other test suites that may have created their own alert indices.
  try {
    await es.indices.delete({
      index: archiveIndex,
      expand_wildcards: ['open', 'closed', 'hidden'],
    });
  } catch (e) {
    // Ignore if index doesn't exist
  }

  try {
    await esArchiver.load(archivePath);
    return;
  } catch (firstError) {
    logger.debug(
      `Alert archive load failed (likely race condition with alerting framework): ${
        (firstError as Error).message
      }`
    );
  }

  // After the failed load, esArchiver may have created the archive index (without aliases)
  // while Kibana simultaneously created another index with the alias is_write_index: true.
  // Fix: atomically transfer the alias to the archive index, delete duplicates, then load data.

  // Find all alert indices that have the alias
  const kibanaCreatedIndices: string[] = [];
  try {
    const aliasInfo = await es.indices.getAlias({
      name: '.alerts-security.alerts-default',
      expand_wildcards: ['open', 'closed', 'hidden'],
    });

    for (const idxName of Object.keys(aliasInfo)) {
      if (idxName !== archiveIndex) {
        kibanaCreatedIndices.push(idxName);
      }
    }
  } catch (e) {
    // Alias might not exist yet
  }

  // Atomically remove alias from Kibana-created indices and add to archive index
  if (kibanaCreatedIndices.length > 0) {
    const actions: Array<Record<string, unknown>> = kibanaCreatedIndices.map((idxName) => ({
      remove: { index: idxName, alias: '.alerts-security.alerts-default' },
    }));
    actions.push({
      add: {
        index: archiveIndex,
        alias: '.alerts-security.alerts-default',
        is_write_index: true,
      },
    });
    actions.push({
      add: {
        index: archiveIndex,
        alias: '.siem-signals-default',
        is_write_index: false,
      },
    });

    try {
      await es.indices.updateAliases({ actions });
    } catch (e) {
      logger.debug(`Alias update failed: ${(e as Error).message}`);
    }

    // Delete Kibana-created duplicate indices
    for (const idxName of kibanaCreatedIndices) {
      try {
        await es.indices.delete({
          index: idxName,
          expand_wildcards: ['open', 'closed', 'hidden'],
        });
      } catch (e) {
        // Ignore
      }
    }
  }

  // Load data only (the index was already created by the first attempt)
  await esArchiver.load(archivePath, { docsOnly: true });
};
