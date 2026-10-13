/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX } from '@kbn/elastic-assistant-common';
import { createLlmProxy, createToolCallMessage, type LlmProxy } from '@kbn/ftr-llm-proxy';
import type {
  ApiClientFixture,
  ApiServicesFixture,
  EsClient,
  ScoutLogger,
} from '@kbn/scout-security';
import type { Brief } from '../../../../common/entity_analytics/executive_brief/brief';
import { EXECUTIVE_BRIEF_INDEX } from '../../../../common/entity_analytics/executive_brief/constants';
import type {
  BriefResponse,
  BriefStatusResponse,
  GenerateBriefResponse,
} from '../../../../common/entity_analytics/executive_brief/api';
import type { BriefDocument } from '../../../../common/entity_analytics/executive_brief/document';
import {
  BRIEF_ROUTE,
  HIGH_RISK_ENTITY_BRIEF,
  INTERNAL_HEADERS,
  SEEDED_ENTITY,
  SUBMIT_BRIEF_TOOL_NAME,
  briefStatusRoute,
} from './constants';

type Headers = Record<string, string>;

const POLL_INTERVAL_MS = 500;
const JOB_TIMEOUT_MS = 60_000;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Creates an OpenAI connector pointed at the LLM proxy. Connectors are space-scoped, so a test that
 * generates in another space needs one there too.
 */
export const createProxyConnector = async ({
  apiServices,
  llmProxy,
  spaceId,
}: {
  apiServices: ApiServicesFixture;
  llmProxy: LlmProxy;
  spaceId?: string;
}): Promise<string> => {
  const connector = await apiServices.alerting.connectors.create(
    {
      name: 'executive-brief-llm-proxy',
      connectorTypeId: '.gen-ai',
      config: {
        apiProvider: 'OpenAI',
        apiUrl: `http://localhost:${llmProxy.getPort()}`,
        defaultModel: 'gpt-4o',
      },
      secrets: { apiKey: 'test-api-key' },
    },
    spaceId
  );
  return connector.id;
};

/** Starts a local LLM proxy and a connector for it, so no test talks to a real model. */
export const createBriefConnector = async ({
  apiServices,
  log,
}: {
  apiServices: ApiServicesFixture;
  log: ScoutLogger;
}): Promise<{ connectorId: string; llmProxy: LlmProxy }> => {
  const llmProxy = await createLlmProxy(log);
  const connectorId = await createProxyConnector({ apiServices, llmProxy });
  return { connectorId, llmProxy };
};

export const deleteBriefConnector = async ({
  apiServices,
  connectorId,
  llmProxy,
}: {
  apiServices: ApiServicesFixture;
  connectorId: string;
  llmProxy: LlmProxy;
}): Promise<void> => {
  llmProxy.close();
  await apiServices.alerting.connectors.delete(connectorId);
};

/**
 * Answers the next forced `submit_brief` call with `brief`. The returned promise settles once the
 * proxy has replied; a rejection (no call within 30 s) is only raised when it is awaited, so a
 * failed job is reported by `waitForBriefJob` with its own error instead.
 */
export const mockSubmitBrief = (llmProxy: LlmProxy, brief: Brief = HIGH_RISK_ENTITY_BRIEF) => {
  const call = llmProxy.interceptors.toolChoice({
    name: SUBMIT_BRIEF_TOOL_NAME,
    response: createToolCallMessage(SUBMIT_BRIEF_TOOL_NAME, brief),
  });
  call.catch(() => {});
  return call;
};

const getToolChoiceName = (toolChoice: unknown): string | undefined => {
  if (typeof toolChoice !== 'object' || toolChoice === null || !('function' in toolChoice)) {
    return undefined;
  }
  const { function: fn } = toolChoice;
  return typeof fn === 'object' && fn !== null && 'name' in fn && typeof fn.name === 'string'
    ? fn.name
    : undefined;
};

/**
 * Holds the next `submit_brief` call open until `release` is called, which then answers it with
 * `brief`. Keeps a job in flight for as long as a test needs.
 */
export const holdSubmitBrief = (llmProxy: LlmProxy, brief: Brief = HIGH_RISK_ENTITY_BRIEF) => {
  const interceptor = llmProxy.intercept({
    name: `${SUBMIT_BRIEF_TOOL_NAME} (held)`,
    when: (body) => getToolChoiceName(body.tool_choice) === SUBMIT_BRIEF_TOOL_NAME,
    responseMock: createToolCallMessage(SUBMIT_BRIEF_TOOL_NAME, brief),
  });
  return {
    /** Resolves once the run is waiting on the held call. */
    waitForCall: () => interceptor.waitForIntercept(),
    release: () => interceptor.completeAfterIntercept(),
  };
};

/** Reads the full brief with GET; throws unless it answers 200. */
const readBrief = async ({
  apiClient,
  headers,
  route,
}: {
  apiClient: ApiClientFixture;
  headers: Headers;
  route: string;
}): Promise<BriefResponse> => {
  const response = await apiClient.get<BriefResponse>(route, {
    headers: { ...INTERNAL_HEADERS, ...headers },
    responseType: 'json',
  });
  if (response.statusCode !== 200) {
    throw new Error(
      `GET ${route} returned ${response.statusCode}: ${JSON.stringify(response.body)}`
    );
  }
  return response.body;
};

/** Polls the status route until the given job has finished, then returns the full GET response. */
export const waitForBriefJob = async ({
  apiClient,
  headers,
  jobId,
  route = BRIEF_ROUTE,
}: {
  apiClient: ApiClientFixture;
  headers: Headers;
  jobId: string;
  route?: string;
}): Promise<BriefResponse> => {
  const deadline = Date.now() + JOB_TIMEOUT_MS;
  let lastStatus = 'not found';

  while (Date.now() < deadline) {
    const response = await apiClient.get<BriefStatusResponse>(briefStatusRoute(route), {
      headers: { ...INTERNAL_HEADERS, ...headers },
      responseType: 'json',
    });
    if (response.statusCode === 200) {
      const { id, status, stage } = response.body;
      lastStatus = `${id}: ${status}${stage ? ` (${stage})` : ''}`;
      if (id === jobId && (status === 'succeeded' || status === 'failed')) {
        return readBrief({ apiClient, headers, route });
      }
    }
    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(
    `Executive brief job ${jobId} did not finish within ${JOB_TIMEOUT_MS} ms (last: ${lastStatus})`
  );
};

/**
 * Starts a brief and waits for the job to succeed. The test cluster has no findings, so the job
 * completes without an LLM call. Returns the job id from POST and the GET response.
 */
export const generateBrief = async ({
  apiClient,
  headers,
  connectorId,
  route = BRIEF_ROUTE,
}: {
  apiClient: ApiClientFixture;
  headers: Headers;
  connectorId: string;
  route?: string;
}): Promise<{ jobId: string; document: BriefResponse }> => {
  const response = await apiClient.post<GenerateBriefResponse>(route, {
    headers: { ...INTERNAL_HEADERS, ...headers },
    responseType: 'json',
    body: { range: '7d', connectorId },
  });
  if (response.statusCode !== 202) {
    throw new Error(
      `POST ${route} returned ${response.statusCode}: ${JSON.stringify(response.body)}`
    );
  }

  const jobId = response.body.id;
  const document = await waitForBriefJob({ apiClient, headers, jobId, route });
  if (document.job.status !== 'succeeded') {
    throw new Error(`Executive brief job ${jobId} failed: ${JSON.stringify(document.job.error)}`);
  }
  return { jobId, document };
};

/** Entity Store v2 latest index for the default space, and the alias the high-risk signal reads. */
const ENTITIES_LATEST_INDEX = '.entities.v2.latest.default-00001';
const ENTITIES_LATEST_ALIAS = 'entities-latest-default';

/** Writes one golden entity at High risk, so a brief has a finding to compose from. */
export const seedHighRiskEntity = async (esClient: EsClient): Promise<void> => {
  const keyword = { type: 'keyword' } as const;
  await esClient.indices.create({
    index: ENTITIES_LATEST_INDEX,
    aliases: { [ENTITIES_LATEST_ALIAS]: {} },
    mappings: {
      properties: {
        entity: {
          properties: {
            id: keyword,
            name: keyword,
            type: keyword,
            risk: {
              properties: { calculated_level: keyword, calculated_score_norm: { type: 'float' } },
            },
          },
        },
      },
    },
  });
  await esClient.index({
    index: ENTITIES_LATEST_ALIAS,
    refresh: true,
    document: {
      entity: {
        id: SEEDED_ENTITY.id,
        name: SEEDED_ENTITY.name,
        type: 'user',
        risk: {
          calculated_level: SEEDED_ENTITY.riskLevel,
          calculated_score_norm: SEEDED_ENTITY.riskScore,
        },
      },
    },
  });
};

export const deleteSeededEntities = async (esClient: EsClient): Promise<void> => {
  await esClient.indices.delete({ index: ENTITIES_LATEST_INDEX, ignore_unavailable: true });
};

/** Scheduled Attack Discovery alerts for the default space: the alias the signal reads, and its index. */
const ATTACK_DISCOVERY_ALIAS = `${ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX}-default`;
const ATTACK_DISCOVERY_INDEX = `.internal${ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX}-default-000001`;

export interface SeededDiscovery {
  id: string;
  title: string;
  alertIds: string[];
  /** 0..100; the signal derives the fact severity from it. */
  riskScore: number;
  /** Owners of a private discovery; a discovery without users is shared. */
  users?: string[];
}

/**
 * Creates the Attack Discovery alerts index with explicit mappings for the fields the signal
 * queries, unless the alerting framework has already created it.
 */
export const createAttackDiscoveryIndex = async (esClient: EsClient): Promise<void> => {
  if (await esClient.indices.exists({ index: ATTACK_DISCOVERY_ALIAS })) {
    return;
  }
  const keyword = { type: 'keyword' } as const;
  await esClient.indices.create({
    index: ATTACK_DISCOVERY_INDEX,
    aliases: { [ATTACK_DISCOVERY_ALIAS]: { is_write_index: true } },
    mappings: {
      properties: {
        '@timestamp': { type: 'date' },
        kibana: {
          properties: {
            alert: {
              properties: {
                risk_score: { type: 'float' },
                workflow_status: keyword,
                attack_discovery: {
                  properties: {
                    alert_ids: keyword,
                    title: { type: 'text' },
                    mitre_attack_tactics: keyword,
                    users: { type: 'nested', properties: { id: keyword, name: keyword } },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
};

/** Writes open Attack Discovery alerts from an hour ago, inside every brief range. */
export const seedAttackDiscoveries = async (
  esClient: EsClient,
  discoveries: readonly SeededDiscovery[]
): Promise<void> => {
  const timestamp = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  await esClient.bulk({
    refresh: true,
    operations: discoveries.flatMap(({ id, title, alertIds, riskScore, users }) => [
      { index: { _index: ATTACK_DISCOVERY_ALIAS, _id: id } },
      {
        '@timestamp': timestamp,
        'kibana.alert.risk_score': riskScore,
        'kibana.alert.workflow_status': 'open',
        'kibana.alert.attack_discovery.alert_ids': alertIds,
        'kibana.alert.attack_discovery.title': title,
        'kibana.alert.attack_discovery.mitre_attack_tactics': ['Initial Access'],
        ...(users
          ? { 'kibana.alert.attack_discovery.users': users.map((name) => ({ name })) }
          : {}),
      },
    ]),
  });
};

/** Removes every seeded Attack Discovery alert, so each test starts without one. */
export const deleteAttackDiscoveries = async (esClient: EsClient): Promise<void> => {
  await esClient.deleteByQuery({
    index: ATTACK_DISCOVERY_ALIAS,
    query: { match_all: {} },
    conflicts: 'proceed',
    refresh: true,
    ignore_unavailable: true,
    allow_no_indices: true,
  });
};

export const deleteAttackDiscoveryIndex = async (esClient: EsClient): Promise<void> => {
  await esClient.indices.delete({ index: ATTACK_DISCOVERY_INDEX, ignore_unavailable: true });
};

interface CurrentUser {
  username: string;
  profile_uid?: string;
  authentication_realm: { type: string; name: string };
}

/** The caller, as the security plugin reports it. */
export const getCurrentUser = async ({
  apiClient,
  headers,
}: {
  apiClient: ApiClientFixture;
  headers: Headers;
}): Promise<CurrentUser> => {
  const { body } = await apiClient.get<CurrentUser>('internal/security/me', {
    headers: { ...INTERNAL_HEADERS, ...headers },
    responseType: 'json',
  });
  return body;
};

/**
 * The stored document id for the caller's brief in a space. Mirrors the server: the owner is the
 * profile uid (or `realm:[type,name,username]`), and the id is `sha256("<owner>:<space>")`.
 */
export const getBriefDocId = async ({
  apiClient,
  headers,
  spaceId,
}: {
  apiClient: ApiClientFixture;
  headers: Headers;
  spaceId: string;
}): Promise<{ docId: string; ownerId: string }> => {
  const {
    username,
    profile_uid: profileUid,
    authentication_realm: realm,
  } = await getCurrentUser({ apiClient, headers });
  const ownerId = profileUid ?? `realm:${JSON.stringify([realm.type, realm.name, username])}`;
  const docId = createHash('sha256').update(`${ownerId}:${spaceId}`).digest('hex');
  return { docId, ownerId };
};

/** Reads a stored brief document directly from the index, bypassing the owner filter. */
export const readStoredBrief = async (
  esClient: EsClient,
  docId: string
): Promise<BriefDocument | undefined> => {
  const response = await esClient.search<BriefDocument>({
    index: EXECUTIVE_BRIEF_INDEX,
    query: { ids: { values: [docId] } },
    ignore_unavailable: true,
  });
  return response.hits.hits[0]?._source;
};

export const countStoredBriefs = async (esClient: EsClient, ownerId: string): Promise<number> => {
  const response = await esClient.count({
    index: EXECUTIVE_BRIEF_INDEX,
    query: { term: { 'owner.id': ownerId } },
    ignore_unavailable: true,
  });
  return response.count;
};

/** Removes every stored brief, so each test starts without one. */
export const deleteAllBriefs = async (esClient: EsClient): Promise<void> => {
  await esClient.deleteByQuery({
    index: EXECUTIVE_BRIEF_INDEX,
    query: { match_all: {} },
    conflicts: 'proceed',
    refresh: true,
    ignore_unavailable: true,
    allow_no_indices: true,
  });
};
