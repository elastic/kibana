/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validate as uuidValidate } from 'uuid';
import { mockRouter } from '@kbn/core-http-router-server-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import {
  DeriveConversationIdsResponse,
  PND_CONVERSATIONS_DERIVE_URL,
  deriveConversationIds,
} from '@kbn/pnd-common';

import {
  PND_API_PRIVILEGE_READ,
  PND_INCIDENT_AGENT_ID,
  PND_INVESTIGATION_AGENT_ID,
  PND_TUNING_AGENT_ID,
} from '../../../../common/constants';
import { PND_AGENTS } from '../../../agent_builder/pnd_agents';
import type { RouteDependencies } from '../../register_routes';
import { buildAttackDiscoveryMarkdown } from './helpers/build_attack_discovery_markdown';
import { findAttackDiscoveryAlerts } from './helpers/find_attack_discovery_alerts';
import { registerDeriveConversationIdsRoute } from './derive_conversation_ids';

jest.mock('./helpers/build_attack_discovery_markdown');
jest.mock('./helpers/find_attack_discovery_alerts');

const buildAttackDiscoveryMarkdownMock = buildAttackDiscoveryMarkdown as jest.Mock;
const findAttackDiscoveryAlertsMock = findAttackDiscoveryAlerts as jest.Mock;

const AD_ALERT_ID = 'ad-alert-1';
const AD_TITLE = 'Lateral movement on host-a';
const http = { id: 'http' };

const createAgentBuilder = () => {
  const ensure = jest.fn().mockResolvedValue(undefined);
  return { agentBuilder: { agents: { ensure } }, ensure };
};

const createDeps = ({
  agentBuilder,
  forceIncident = false,
}: { agentBuilder?: unknown; forceIncident?: boolean } = {}) => {
  const router = mockRouter.create();
  const deps = {
    config: { demo: { forceIncident }, enabled: true, ui: { useMockData: false } },
    getSpaceId: jest.fn().mockReturnValue('agent-3'),
    getStartServices: jest.fn().mockResolvedValue([{ http }, { agentBuilder }, {}]),
    getWatchProjection: jest.fn(),
    logger: loggerMock.create(),
    router,
  } as unknown as RouteDependencies & { router: ReturnType<typeof mockRouter.create> };

  return deps;
};

const getHandler = (router: ReturnType<typeof mockRouter.create>) =>
  router.versioned.getRoute('get', PND_CONVERSATIONS_DERIVE_URL).versions['1'].handler;

const invoke = async (handler: ReturnType<typeof getHandler>, correlationId: string) => {
  const request = httpServerMock.createKibanaRequest({ query: { correlationId } });
  const response = httpServerMock.createResponseFactory();
  const context = {} as unknown as Parameters<typeof handler>[0];

  await handler(context, request, response);

  return response;
};

const okBody = (response: ReturnType<typeof httpServerMock.createResponseFactory>) =>
  (response.ok as jest.Mock).mock.calls[0][0].body as DeriveConversationIdsResponse;

describe('registerDeriveConversationIdsRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    findAttackDiscoveryAlertsMock.mockResolvedValue([{ id: AD_ALERT_ID, title: AD_TITLE }]);
    buildAttackDiscoveryMarkdownMock.mockReturnValue('## rendered markdown');
  });

  it('gates the route on the low read privilege', () => {
    const deps = createDeps();

    registerDeriveConversationIdsRoute(deps);

    expect(
      deps.router.versioned.getRoute('get', PND_CONVERSATIONS_DERIVE_URL).config.security
    ).toEqual({ authz: { requiredPrivileges: [PND_API_PRIVILEGE_READ] } });
  });

  it('returns every field the orchestrator YAMLs template', async () => {
    const { agentBuilder } = createAgentBuilder();
    const deps = createDeps({ agentBuilder });
    registerDeriveConversationIdsRoute(deps);

    const response = await invoke(getHandler(deps.router), AD_ALERT_ID);

    expect(response.ok).toHaveBeenCalledWith({
      body: {
        attackDiscoveryMarkdown: '## rendered markdown',
        attackDiscoveryTitle: AD_TITLE,
        demoForceIncident: false,
        incidentAgentId: PND_INCIDENT_AGENT_ID,
        investigationAgentId: PND_INVESTIGATION_AGENT_ID,
        tuningAgentId: PND_TUNING_AGENT_ID,
        ...deriveConversationIds(AD_ALERT_ID),
      },
    });
  });

  it('returns a body the response contract accepts', async () => {
    const { agentBuilder } = createAgentBuilder();
    const deps = createDeps({ agentBuilder });
    registerDeriveConversationIdsRoute(deps);

    const response = await invoke(getHandler(deps.router), AD_ALERT_ID);

    expect(DeriveConversationIdsResponse.safeParse(okBody(response)).success).toBe(true);
  });

  it('derives an investigation id that is a valid UUID', async () => {
    const deps = createDeps();
    registerDeriveConversationIdsRoute(deps);

    const response = await invoke(getHandler(deps.router), AD_ALERT_ID);

    expect(uuidValidate(okBody(response).investigationConversationId)).toBe(true);
  });

  it('derives an incident id that is a valid UUID', async () => {
    const deps = createDeps();
    registerDeriveConversationIdsRoute(deps);

    const response = await invoke(getHandler(deps.router), AD_ALERT_ID);

    expect(uuidValidate(okBody(response).incidentConversationId)).toBe(true);
  });

  // Phase 4's conversation is only discoverable because this id comes back over the wire: the
  // Detection Watch derives nothing itself.
  it('derives a tuning id that is a valid UUID', async () => {
    const deps = createDeps();
    registerDeriveConversationIdsRoute(deps);

    const response = await invoke(getHandler(deps.router), AD_ALERT_ID);

    expect(uuidValidate(okBody(response).tuningConversationId ?? '')).toBe(true);
  });

  it('clips an over-long Attack Discovery title to the contract bound', async () => {
    findAttackDiscoveryAlertsMock.mockResolvedValue([{ id: AD_ALERT_ID, title: 'x'.repeat(5000) }]);
    const deps = createDeps();
    registerDeriveConversationIdsRoute(deps);

    const response = await invoke(getHandler(deps.router), AD_ALERT_ID);

    expect(okBody(response).attackDiscoveryTitle).toHaveLength(200);
  });

  it('mirrors an enabled demo switch', async () => {
    const deps = createDeps({ forceIncident: true });
    registerDeriveConversationIdsRoute(deps);

    const response = await invoke(getHandler(deps.router), AD_ALERT_ID);

    expect(okBody(response).demoForceIncident).toBe(true);
  });

  it('mirrors the shipped default demo switch', async () => {
    const deps = createDeps();
    registerDeriveConversationIdsRoute(deps);

    const response = await invoke(getHandler(deps.router), AD_ALERT_ID);

    expect(okBody(response).demoForceIncident).toBe(false);
  });

  // Host extraction moved into watch_deep.yaml, which resolves it from the attack or its
  // constituent alerts so the watch can skip forensics when no host is extractable. This
  // route no longer carries a host name at all.
  it('never returns a host name, because the YAML resolves the host itself', async () => {
    const deps = createDeps();
    registerDeriveConversationIdsRoute(deps);

    const response = await invoke(getHandler(deps.router), AD_ALERT_ID);

    expect(okBody(response)).not.toHaveProperty('hostName');
  });

  it('still returns conversation ids when host extraction finds nothing', async () => {
    const deps = createDeps();
    registerDeriveConversationIdsRoute(deps);

    const response = await invoke(getHandler(deps.router), AD_ALERT_ID);

    expect(response.ok).toHaveBeenCalledTimes(1);
    expect(okBody(response).investigationConversationId).toBe(
      deriveConversationIds(AD_ALERT_ID).investigationConversationId
    );
  });

  it('resolves the discovery as the calling user (S3)', async () => {
    const deps = createDeps();
    registerDeriveConversationIdsRoute(deps);

    await invoke(getHandler(deps.router), AD_ALERT_ID);

    expect(findAttackDiscoveryAlertsMock).toHaveBeenCalledWith(
      expect.objectContaining({ http, ids: [AD_ALERT_ID], spaceId: 'agent-3' })
    );
  });

  it('returns 404 when the caller cannot read the discovery (S3)', async () => {
    const deps = createDeps();
    findAttackDiscoveryAlertsMock.mockResolvedValue([]);
    registerDeriveConversationIdsRoute(deps);

    const response = await invoke(getHandler(deps.router), AD_ALERT_ID);

    expect(response.notFound).toHaveBeenCalledTimes(1);
  });

  it('does not return conversation ids when the discovery is not readable', async () => {
    const deps = createDeps();
    findAttackDiscoveryAlertsMock.mockResolvedValue([]);
    registerDeriveConversationIdsRoute(deps);

    const response = await invoke(getHandler(deps.router), AD_ALERT_ID);

    expect(response.ok).not.toHaveBeenCalled();
  });

  it('resolves the space from the request', async () => {
    const deps = createDeps();
    registerDeriveConversationIdsRoute(deps);

    await invoke(getHandler(deps.router), AD_ALERT_ID);

    expect(deps.getSpaceId).toHaveBeenCalledTimes(1);
  });

  it('returns 500 when resolving the discovery throws', async () => {
    const deps = createDeps();
    findAttackDiscoveryAlertsMock.mockRejectedValue(new Error('boom'));
    registerDeriveConversationIdsRoute(deps);

    const response = await invoke(getHandler(deps.router), AD_ALERT_ID);

    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
  });
});

describe('registerDeriveConversationIdsRoute — PND agent installation (A2)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    findAttackDiscoveryAlertsMock.mockResolvedValue([{ id: AD_ALERT_ID, title: AD_TITLE }]);
    buildAttackDiscoveryMarkdownMock.mockReturnValue('## rendered markdown');
  });

  it('ensures the three per-phase agents in the request space', async () => {
    const { agentBuilder, ensure } = createAgentBuilder();
    const deps = createDeps({ agentBuilder });
    registerDeriveConversationIdsRoute(deps);

    await invoke(getHandler(deps.router), AD_ALERT_ID);

    expect(ensure.mock.calls.map(([{ agent, spaceId }]) => [agent.id, spaceId])).toEqual(
      PND_AGENTS.map(({ id }) => [id, 'agent-3'])
    );
  });

  it('installs once per space however many times it is called', async () => {
    const { agentBuilder, ensure } = createAgentBuilder();
    const deps = createDeps({ agentBuilder });
    registerDeriveConversationIdsRoute(deps);

    await invoke(getHandler(deps.router), AD_ALERT_ID);
    await invoke(getHandler(deps.router), AD_ALERT_ID);

    expect(ensure).toHaveBeenCalledTimes(PND_AGENTS.length);
  });

  // A caller who cannot read the discovery must not be able to drive a write into the space.
  it('never installs for a caller who cannot read the discovery (S3)', async () => {
    const { agentBuilder, ensure } = createAgentBuilder();
    findAttackDiscoveryAlertsMock.mockResolvedValue([]);
    const deps = createDeps({ agentBuilder });
    registerDeriveConversationIdsRoute(deps);

    await invoke(getHandler(deps.router), AD_ALERT_ID);

    expect(ensure).not.toHaveBeenCalled();
  });

  it('is a no-op when Agent Builder is absent', async () => {
    const deps = createDeps();
    registerDeriveConversationIdsRoute(deps);

    const response = await invoke(getHandler(deps.router), AD_ALERT_ID);

    expect(response.ok).toHaveBeenCalledTimes(1);
  });

  // ADR-011: agent existence and agent-id availability degrade together, so the YAML falls back to
  // the default agent instead of naming an agent that was never ensured.
  it('omits the agent ids when Agent Builder is absent', async () => {
    const deps = createDeps();
    registerDeriveConversationIdsRoute(deps);

    const response = await invoke(getHandler(deps.router), AD_ALERT_ID);

    expect(okBody(response)).not.toHaveProperty('investigationAgentId');
  });

  it('still returns the conversation ids when Agent Builder is absent', async () => {
    const deps = createDeps();
    registerDeriveConversationIdsRoute(deps);

    const response = await invoke(getHandler(deps.router), AD_ALERT_ID);

    expect(okBody(response).investigationConversationId).toBe(
      deriveConversationIds(AD_ALERT_ID).investigationConversationId
    );
  });

  it('omits the agent ids when the install fails', async () => {
    const { agentBuilder, ensure } = createAgentBuilder();
    ensure.mockRejectedValue(new Error('boom'));
    const deps = createDeps({ agentBuilder });
    registerDeriveConversationIdsRoute(deps);

    const response = await invoke(getHandler(deps.router), AD_ALERT_ID);

    expect(okBody(response)).not.toHaveProperty('tuningAgentId');
  });

  it('does not fail the route when the install fails', async () => {
    const { agentBuilder, ensure } = createAgentBuilder();
    ensure.mockRejectedValue(new Error('boom'));
    const deps = createDeps({ agentBuilder });
    registerDeriveConversationIdsRoute(deps);

    const response = await invoke(getHandler(deps.router), AD_ALERT_ID);

    expect(response.ok).toHaveBeenCalledTimes(1);
  });
});
