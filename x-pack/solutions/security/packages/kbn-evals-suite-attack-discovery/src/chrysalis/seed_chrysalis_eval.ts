/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs/promises';
import Path from 'path';
import type { Client as EsClient } from '@elastic/elasticsearch';
import type { HttpHandler } from '@kbn/core/public';
import {
  CHRYSALIS_CHRYSALIS_AGENT_ID,
  CHRYSALIS_ESQL_TOOL_NAMES,
  CHRYSALIS_INSIGHTS_ALERTS_INDEX,
  CHRYSALIS_INSIGHTS_SEED_LABEL,
  CHRYSALIS_WORKFLOW_TEMPLATE_NAMES,
} from './constants';

export interface SeedChrysalisChrysalisEvalOptions {
  readonly insightsNdjsonPath?: string;
  readonly virustotalApiKey?: string;
  readonly slackConnectorId?: string;
  readonly oncallEmail?: string;
  readonly skipInsightsAlerts?: boolean;
}

export interface SeedChrysalisChrysalisEvalSummary {
  readonly agentId: string;
  readonly workflowsUpserted: string[];
  readonly esqlToolsUpserted: string[];
  readonly insightsAlertsIndexed: number;
  readonly warnings: string[];
}

const DATA_DIR = Path.resolve(__dirname, '../../data/chrysalis');
const DEFAULT_INSIGHTS_NDJSON = Path.resolve(
  __dirname,
  '../../data/chrysalis/insights_alerts_deduped_gold.ndjson'
);

const asResponse = (response: unknown): Response => {
  if (response instanceof Response) {
    return response;
  }
  throw new Error('Expected HttpHandler fetch to return a Response');
};

const substituteWorkflowTemplate = (
  yaml: string,
  {
    virustotalApiKey,
    slackConnectorId,
    oncallEmail,
  }: Required<
    Pick<SeedChrysalisChrysalisEvalOptions, 'virustotalApiKey' | 'slackConnectorId' | 'oncallEmail'>
  >
): string =>
  yaml
    .replaceAll('__VIRUSTOTAL_API_KEY__', virustotalApiKey)
    .replaceAll('__CHRYSALIS_SLACK_CONNECTOR_ID__', slackConnectorId)
    .replaceAll('__CHRYSALIS_ONCALL_EMAIL__', oncallEmail);

const loadWorkflowYaml = async (
  name: string,
  options: Required<
    Pick<SeedChrysalisChrysalisEvalOptions, 'virustotalApiKey' | 'slackConnectorId' | 'oncallEmail'>
  >
): Promise<string> => {
  const templatePath = Path.join(DATA_DIR, 'workflows', `${name}.yaml.template`);
  const raw = await Fs.readFile(templatePath, 'utf8');
  return substituteWorkflowTemplate(raw, options);
};

const upsertWorkflows = async (
  fetch: HttpHandler,
  options: Required<
    Pick<SeedChrysalisChrysalisEvalOptions, 'virustotalApiKey' | 'slackConnectorId' | 'oncallEmail'>
  >
): Promise<string[]> => {
  const yamls = await Promise.all(
    CHRYSALIS_WORKFLOW_TEMPLATE_NAMES.map((name) => loadWorkflowYaml(name, options))
  );

  const response = asResponse(
    await fetch('/api/workflows', {
      method: 'POST',
      version: AB_API_VERSION,
      headers: { 'kbn-xsrf': 'true', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workflows: yamls.map((yaml) => ({ yaml })),
      }),
    })
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to upsert Chrysalis workflows: ${response.status} ${text}`);
  }

  return [...CHRYSALIS_WORKFLOW_TEMPLATE_NAMES];
};

const AB_API_VERSION = '2023-10-31';

const upsertChrysalisAgent = async (fetch: HttpHandler): Promise<void> => {
  const agentPath = Path.join(DATA_DIR, 'chrysalis_hunting_agent.json');
  const agentBody = JSON.parse(await Fs.readFile(agentPath, 'utf8'));

  const putResponse = asResponse(
    await fetch(`/api/agent_builder/agents/${encodeURIComponent(CHRYSALIS_CHRYSALIS_AGENT_ID)}`, {
      method: 'PUT',
      version: AB_API_VERSION,
      headers: { 'kbn-xsrf': 'true', 'Content-Type': 'application/json' },
      body: JSON.stringify(agentBody),
    })
  );

  if (putResponse.status === 404) {
    const postResponse = asResponse(
      await fetch('/api/agent_builder/agents', {
        method: 'POST',
        version: AB_API_VERSION,
        headers: { 'kbn-xsrf': 'true', 'Content-Type': 'application/json' },
        body: JSON.stringify(agentBody),
      })
    );
    if (!postResponse.ok) {
      const text = await postResponse.text();
      throw new Error(`Failed to create Chrysalis agent: ${postResponse.status} ${text}`);
    }
    return;
  }

  if (!putResponse.ok) {
    const text = await putResponse.text();
    throw new Error(`Failed to update Chrysalis agent: ${putResponse.status} ${text}`);
  }
};

const upsertEsqlTools = async (fetch: HttpHandler): Promise<string[]> => {
  const upserted: string[] = [];

  for (const toolId of CHRYSALIS_ESQL_TOOL_NAMES) {
    const toolPath = Path.join(DATA_DIR, 'tools', `${toolId}.json`);
    const rawBody = JSON.parse(await Fs.readFile(toolPath, 'utf8')) as Record<string, unknown>;

    // The create/update APIs reject server-managed fields (readonly, experimental, schema).
    const { readonly: _r, experimental: _e, schema: _s, ...toolBody } = rawBody;

    const putResponse = asResponse(
      await fetch(`/api/agent_builder/tools/${encodeURIComponent(toolId)}`, {
        method: 'PUT',
        version: AB_API_VERSION,
        headers: { 'kbn-xsrf': 'true', 'Content-Type': 'application/json' },
        body: JSON.stringify(toolBody),
      })
    );

    if (putResponse.status === 404) {
      const postResponse = asResponse(
        await fetch('/api/agent_builder/tools', {
          method: 'POST',
          version: AB_API_VERSION,
          headers: { 'kbn-xsrf': 'true', 'Content-Type': 'application/json' },
          body: JSON.stringify(toolBody),
        })
      );
      if (!postResponse.ok) {
        const text = await postResponse.text();
        throw new Error(`Failed to create tool ${toolId}: ${postResponse.status} ${text}`);
      }
    } else if (!putResponse.ok) {
      const text = await putResponse.text();
      throw new Error(`Failed to update tool ${toolId}: ${putResponse.status} ${text}`);
    }

    upserted.push(toolId);
  }

  return upserted;
};

const parseNdjsonBulkLines = (
  ndjson: string
): Array<Record<string, unknown> | Record<string, unknown>> => {
  const lines = ndjson.split('\n').filter((line) => line.trim().length > 0);
  const operations: Array<Record<string, unknown>> = [];
  for (let i = 0; i < lines.length; i += 2) {
    const meta = JSON.parse(lines[i]) as { index: { _index: string; _id: string } };
    const source = JSON.parse(lines[i + 1]) as Record<string, unknown>;
    operations.push({ index: { _index: meta.index._index, _id: meta.index._id } });
    operations.push(source);
  }
  return operations;
};

const indexInsightsAlerts = async (esClient: EsClient, ndjsonPath: string): Promise<number> => {
  const ndjson = await Fs.readFile(ndjsonPath, 'utf8');
  const operations = parseNdjsonBulkLines(ndjson);
  if (operations.length === 0) return 0;

  await esClient.bulk({ refresh: 'wait_for', operations });
  return operations.length / 2;
};

export const seedChrysalisChrysalisEvalStack = async (
  esClient: EsClient,
  fetch: HttpHandler,
  options: SeedChrysalisChrysalisEvalOptions = {}
): Promise<SeedChrysalisChrysalisEvalSummary> => {
  const warnings: string[] = [];

  const virustotalApiKey = options.virustotalApiKey ?? process.env.VIRUSTOTAL_API_KEY;
  const slackConnectorId =
    options.slackConnectorId ?? process.env.CHRYSALIS_SLACK_CONNECTOR_ID ?? '';
  const oncallEmail =
    options.oncallEmail ?? process.env.CHRYSALIS_ONCALL_EMAIL ?? 'patryk.kopycinski@elastic.co';

  if (!virustotalApiKey) {
    throw new Error('VIRUSTOTAL_API_KEY is required to seed vt-hash-lookup workflow');
  }
  if (!slackConnectorId) {
    warnings.push(
      'CHRYSALIS_SLACK_CONNECTOR_ID not set — create-channel workflow may fail at runtime'
    );
  }

  await fetch('/api/detection_engine/index', { method: 'POST', version: '1' });

  const workflowOptions = { virustotalApiKey, slackConnectorId, oncallEmail };
  const workflowsUpserted = await upsertWorkflows(fetch, workflowOptions);
  const esqlToolsUpserted = await upsertEsqlTools(fetch);
  await upsertChrysalisAgent(fetch);

  let insightsAlertsIndexed = 0;
  if (!options.skipInsightsAlerts) {
    const ndjsonPath = options.insightsNdjsonPath ?? DEFAULT_INSIGHTS_NDJSON;
    try {
      insightsAlertsIndexed = await indexInsightsAlerts(esClient, ndjsonPath);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      warnings.push(
        `Insights alerts not indexed (${ndjsonPath}): ${message}. Run scripts/dedup_insights_alerts.mjs first.`
      );
    }
  }

  return {
    agentId: CHRYSALIS_CHRYSALIS_AGENT_ID,
    workflowsUpserted,
    esqlToolsUpserted,
    insightsAlertsIndexed,
    warnings,
  };
};

export const cleanupChrysalisChrysalisEvalStack = async (esClient: EsClient): Promise<void> => {
  await esClient.deleteByQuery({
    index: CHRYSALIS_INSIGHTS_ALERTS_INDEX,
    query: { term: { 'labels.chrysalis_insights_eval': CHRYSALIS_INSIGHTS_SEED_LABEL } },
    conflicts: 'proceed',
    refresh: true,
  });
};
