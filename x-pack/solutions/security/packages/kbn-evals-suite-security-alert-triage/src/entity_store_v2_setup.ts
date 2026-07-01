/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import { getEntitiesAlias, ENTITY_LATEST } from '@kbn/entity-store/common';
import { hashEuid } from '@kbn/entity-store/common/domain/euid';
import type { ToolingLog } from '@kbn/tooling-log';
import type supertest from 'supertest';

export const WEB_SERVER_01_EUID = 'host:web-server-01';

export async function installEntityStoreV2({
  supertest: agent,
  log,
}: {
  supertest: supertest.Agent;
  log: ToolingLog;
}): Promise<void> {
  log.info('[alert-triage] Installing Entity Store V2');
  const installRes = await agent
    .post('/api/security/entity_store/install')
    .set('kbn-xsrf', 'true')
    .set('x-elastic-internal-origin', 'Kibana')
    .set('elastic-api-version', '2023-10-31')
    .send({ entityTypes: ['user', 'host'] });

  if (installRes.status !== 200 && installRes.status !== 201) {
    throw new Error(
      `Entity Store V2 install failed (${installRes.status}): ${JSON.stringify(installRes.body)}`
    );
  }

  await waitForCondition(
    async () => {
      const res = await agent
        .get('/api/security/entity_store/status')
        .set('elastic-api-version', '2023-10-31');
      if (res.status !== 200) {
        return false;
      }
      const status = (res.body as { status?: string }).status;
      if (status === 'error') {
        throw new Error(`Entity Store V2 is in error state: ${JSON.stringify(res.body)}`);
      }
      return status === 'running';
    },
    { label: 'entity store v2 status=running', timeoutMs: 120_000, log }
  );
}

export async function seedWebServer01Entity({
  esClient,
  log,
}: {
  esClient: EsClient;
  log: ToolingLog;
}): Promise<void> {
  const latestAlias = getEntitiesAlias(ENTITY_LATEST, 'default');
  const now = new Date().toISOString();
  log.info(`[alert-triage] Seeding ${WEB_SERVER_01_EUID} into ${latestAlias}`);

  const response = await esClient.bulk({
    refresh: 'wait_for',
    operations: [
      { index: { _index: latestAlias, _id: hashEuid(WEB_SERVER_01_EUID) } },
      {
        '@timestamp': now,
        entity: { id: WEB_SERVER_01_EUID, EngineMetadata: { Type: 'host' } },
        host: { name: 'web-server-01' },
        asset: { criticality: 'high_impact' },
      },
    ],
  });

  if (response.errors) {
    throw new Error(
      `Failed to seed web-server-01 entity: ${JSON.stringify(
        response.items?.filter((item) => item.index?.error)
      )}`
    );
  }
}

export async function teardownEntityStoreV2({
  supertest: agent,
  log,
}: {
  supertest: supertest.Agent;
  log: ToolingLog;
}): Promise<void> {
  try {
    const res = await agent
      .delete('/api/entity_store/engines')
      .set('kbn-xsrf', 'true')
      .set('x-elastic-internal-origin', 'Kibana')
      .set('elastic-api-version', '2023-10-31')
      .query({ delete_data: true });

    if (res.status >= 400) {
      log.warning(
        `deleteEntityEngines failed during teardown (${res.status}): ${JSON.stringify(res.body)}`
      );
    }
  } catch (err) {
    log.warning(`deleteEntityEngines failed during teardown: ${(err as Error).message}`);
  }
}

async function waitForCondition(
  check: () => Promise<boolean>,
  {
    label,
    timeoutMs,
    intervalMs = 2000,
    log,
  }: {
    label: string;
    timeoutMs: number;
    intervalMs?: number;
    log: ToolingLog;
  }
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      if (await check()) {
        return;
      }
    } catch (err) {
      log.warning(`${label} check threw: ${(err as Error).message}`);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`Timed out waiting for: ${label}`);
}
