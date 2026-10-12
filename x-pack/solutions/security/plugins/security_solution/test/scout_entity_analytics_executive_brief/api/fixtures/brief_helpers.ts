/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
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
  BriefDocument,
  BriefResponse,
  GenerateBriefResponse,
} from '../../../../common/entity_analytics/executive_brief/document';
import {
  BRIEF_ROUTE,
  INTERNAL_HEADERS,
  QUIET_TENANT_BRIEF,
  SUBMIT_BRIEF_TOOL_NAME,
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
export const mockSubmitBrief = (llmProxy: LlmProxy, brief: Brief = QUIET_TENANT_BRIEF) => {
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
export const holdSubmitBrief = (llmProxy: LlmProxy, brief: Brief = QUIET_TENANT_BRIEF) => {
  const interceptor = llmProxy.intercept({
    name: `${SUBMIT_BRIEF_TOOL_NAME} (held)`,
    when: (body) => getToolChoiceName(body.tool_choice) === SUBMIT_BRIEF_TOOL_NAME,
    responseMock: createToolCallMessage(SUBMIT_BRIEF_TOOL_NAME, brief),
  });
  return { release: () => interceptor.completeAfterIntercept() };
};

/** Polls GET until the given job has finished, and returns the brief document. */
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
    const response = await apiClient.get<BriefResponse>(route, {
      headers: { ...INTERNAL_HEADERS, ...headers },
      responseType: 'json',
    });
    if (response.statusCode === 200) {
      const { job } = response.body;
      lastStatus = `${job.id}: ${job.status}${job.stage ? ` (${job.stage})` : ''}`;
      if (job.id === jobId && (job.status === 'succeeded' || job.status === 'failed')) {
        return response.body;
      }
    }
    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(
    `Executive brief job ${jobId} did not finish within ${JOB_TIMEOUT_MS} ms (last: ${lastStatus})`
  );
};

/**
 * Starts a brief with a mocked LLM answer and waits for the job to succeed. Returns the job id
 * from POST and the brief document from GET.
 */
export const generateBrief = async ({
  apiClient,
  headers,
  connectorId,
  llmProxy,
  brief,
  route = BRIEF_ROUTE,
}: {
  apiClient: ApiClientFixture;
  headers: Headers;
  connectorId: string;
  llmProxy: LlmProxy;
  brief?: Brief;
  route?: string;
}): Promise<{ jobId: string; document: BriefResponse }> => {
  const llmCall = mockSubmitBrief(llmProxy, brief);

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

  const jobId = response.body.job.id;
  const document = await waitForBriefJob({ apiClient, headers, jobId, route });
  if (document.job.status !== 'succeeded') {
    throw new Error(`Executive brief job ${jobId} failed: ${JSON.stringify(document.job.error)}`);
  }
  await llmCall;
  return { jobId, document };
};

interface CurrentUser {
  username: string;
  profile_uid?: string;
  authentication_realm: { type: string; name: string };
}

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
  const { body } = await apiClient.get<CurrentUser>('internal/security/me', {
    headers: { ...INTERNAL_HEADERS, ...headers },
    responseType: 'json',
  });
  const { username, profile_uid: profileUid, authentication_realm: realm } = body;
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
