/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockRouter } from '@kbn/core-http-router-server-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import {
  GetCandidateRulesResponse,
  PND_DISCOVERY_CONTEXT_MAX_ALERT_IDS,
  PND_TUNING_CANDIDATE_RULES_MAX,
  PND_TUNING_CANDIDATE_RULES_URL,
} from '@kbn/pnd-common';

import { PND_API_PRIVILEGE_READ } from '../../../../common/constants';
import type { RouteDependencies } from '../../register_routes';
import { fetchDetectionRule } from '../../helpers/fetch_detection_rule';
import { findAttackDiscoveryAlerts } from '../conversations/helpers/find_attack_discovery_alerts';
import { registerGetTuningCandidateRulesRoute } from './get_tuning_candidate_rules';

jest.mock('../conversations/helpers/find_attack_discovery_alerts');
jest.mock('../../helpers/fetch_detection_rule');

const findAttackDiscoveryAlertsMock = findAttackDiscoveryAlerts as jest.Mock;
const fetchDetectionRuleMock = fetchDetectionRule as jest.Mock;

const REQUEST_SPACE = 'agent-3';
const ATTACK_DISCOVERY_ALERT_ID = 'ad-1';

const endpointRule = {
  from: 'now-360s',
  id: '4aa5ddf7-6ed3-4528-a1eb-43e363f46cf8',
  index: ['logs-endpoint.alerts-*'],
  interval: '5m',
  language: 'kuery',
  name: 'Endpoint Security [Insights]',
  query: 'event.kind : "alert"',
  risk_score: 47,
  rule_id: '61e90241-c8f2-47bc-8e47-238420a34fb6',
  severity: 'high',
  to: 'now',
  type: 'query',
};

const oktaRule = {
  id: 'b1c2d3e4-0000-0000-0000-000000000000',
  name: 'Okta impossible travel',
  rule_id: 'okta-impossible-travel',
  type: 'query',
};

const aggregationsFor = (ruleIds: string[]) => ({
  aggregations: { by_rule: { buckets: ruleIds.map((key) => ({ doc_count: 1, key })) } },
});

type PndCandidateRulesRouteDependencies = RouteDependencies & {
  router: ReturnType<typeof mockRouter.create>;
};

const createDeps = ({ search }: { search?: jest.Mock } = {}) => {
  const searchMock = search ?? jest.fn().mockResolvedValue(aggregationsFor([endpointRule.id]));
  const asCurrentUser = { search: searchMock };
  const asInternalUser = { search: jest.fn() };
  const router = mockRouter.create();

  const deps = {
    config: { enabled: true, ui: { useMockData: false } },
    getEsClient: jest.fn().mockResolvedValue({ asCurrentUser, asInternalUser }),
    getSpaceId: jest.fn().mockReturnValue(REQUEST_SPACE),
    getStartServices: jest.fn().mockResolvedValue([{ http: {} }, {}]),
    getWatchesService: jest.fn(),
    getWorkflowsManagementClient: jest.fn(),
    logger: loggerMock.create(),
    router,
  } as unknown as PndCandidateRulesRouteDependencies;

  return { asInternalUser, deps, searchMock };
};

const invoke = async (
  deps: PndCandidateRulesRouteDependencies,
  query: { correlationId: string; ruleRef?: string } = {
    correlationId: ATTACK_DISCOVERY_ALERT_ID,
  }
) => {
  registerGetTuningCandidateRulesRoute(deps);

  const handler = deps.router.versioned.getRoute('get', PND_TUNING_CANDIDATE_RULES_URL).versions[
    '1'
  ].handler as unknown as (...args: unknown[]) => Promise<unknown>;

  const response = httpServerMock.createResponseFactory();
  await handler({} as unknown, httpServerMock.createKibanaRequest({ query }), response);

  return response;
};

const body = (
  response: ReturnType<typeof httpServerMock.createResponseFactory>
): GetCandidateRulesResponse => {
  const [call] = response.ok.mock.calls;

  if (call?.[0] == null) {
    throw new Error('expected the route to have responded with a candidate rule menu');
  }

  return call[0].body as GetCandidateRulesResponse;
};

describe('registerGetTuningCandidateRulesRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    findAttackDiscoveryAlertsMock.mockResolvedValue([
      { alert_ids: ['alert-1', 'alert-2'], id: ATTACK_DISCOVERY_ALERT_ID },
    ]);
    fetchDetectionRuleMock.mockResolvedValue({ rule: endpointRule, status: 200 });
  });

  it('requires the PND read privilege', () => {
    const { deps } = createDeps();

    registerGetTuningCandidateRulesRoute(deps);

    expect(
      deps.router.versioned.getRoute('get', PND_TUNING_CANDIDATE_RULES_URL).config.security
    ).toEqual({ authz: { requiredPrivileges: [PND_API_PRIVILEGE_READ] } });
  });

  it('registers as an internal route, because only the watch and the tuning dialog read it', () => {
    const { deps } = createDeps();

    registerGetTuningCandidateRulesRoute(deps);

    expect(
      deps.router.versioned.getRoute('get', PND_TUNING_CANDIDATE_RULES_URL).config.access
    ).toBe('internal');
  });

  it('resolves the discovery as the calling user, in the request space (S3)', async () => {
    const { deps } = createDeps();

    await invoke(deps);

    expect(findAttackDiscoveryAlertsMock).toHaveBeenCalledWith(
      expect.objectContaining({ ids: [ATTACK_DISCOVERY_ALERT_ID], spaceId: REQUEST_SPACE })
    );
  });

  /**
   * A 404 rather than an empty menu: `rules: []` is a real answer here, so returning it for a
   * discovery the caller cannot read would both hide the authorization failure and tell the drafting
   * step that no rule is tunable.
   */
  it('returns not found for a discovery the caller cannot read (S3)', async () => {
    findAttackDiscoveryAlertsMock.mockResolvedValue([]);
    const { deps } = createDeps();

    const response = await invoke(deps);

    expect(response.notFound).toHaveBeenCalledTimes(1);
  });

  it('never reads the alerts index for a discovery the caller cannot read (S3)', async () => {
    findAttackDiscoveryAlertsMock.mockResolvedValue([]);
    const { deps, searchMock } = createDeps();

    await invoke(deps);

    expect(searchMock).not.toHaveBeenCalled();
  });

  it('never reads a rule for a discovery the caller cannot read (S3)', async () => {
    findAttackDiscoveryAlertsMock.mockResolvedValue([]);
    const { deps } = createDeps();

    await invoke(deps);

    expect(fetchDetectionRuleMock).not.toHaveBeenCalled();
  });

  /**
   * `asCurrentUser` is what preserves S3 on the alerts index by construction — the internal user
   * would see every alert in the space regardless of the caller's privileges.
   */
  it('never reads the alerts index as the internal user', async () => {
    const { asInternalUser, deps } = createDeps();

    await invoke(deps);

    expect(asInternalUser.search).not.toHaveBeenCalled();
  });

  it('returns an empty menu for a discovery that correlates no constituent alerts', async () => {
    findAttackDiscoveryAlertsMock.mockResolvedValue([
      { alert_ids: [], id: ATTACK_DISCOVERY_ALERT_ID },
    ]);
    const { deps } = createDeps();

    expect(body(await invoke(deps)).rules).toEqual([]);
  });

  it('reads nothing for a discovery that correlates no constituent alerts', async () => {
    findAttackDiscoveryAlertsMock.mockResolvedValue([
      { alert_ids: [], id: ATTACK_DISCOVERY_ALERT_ID },
    ]);
    const { deps, searchMock } = createDeps();

    await invoke(deps);

    expect(searchMock).not.toHaveBeenCalled();
  });

  /**
   * The bound is the route's to enforce rather than the codec's: the count comes from the
   * discovery's server-derived `alert_ids`, which never appear in the request at all.
   */
  it('rejects a discovery correlating more alerts than the aggregation is bounded at', async () => {
    findAttackDiscoveryAlertsMock.mockResolvedValue([
      {
        alert_ids: Array.from(
          { length: PND_DISCOVERY_CONTEXT_MAX_ALERT_IDS + 1 },
          (_, i) => `alert-${i}`
        ),
        id: ATTACK_DISCOVERY_ALERT_ID,
      },
    ]);
    const { deps } = createDeps();

    const response = await invoke(deps);

    expect(response.badRequest).toHaveBeenCalledTimes(1);
  });

  it('never reaches Elasticsearch for an over-limit discovery', async () => {
    findAttackDiscoveryAlertsMock.mockResolvedValue([
      {
        alert_ids: Array.from(
          { length: PND_DISCOVERY_CONTEXT_MAX_ALERT_IDS + 1 },
          (_, i) => `alert-${i}`
        ),
        id: ATTACK_DISCOVERY_ALERT_ID,
      },
    ]);
    const { deps, searchMock } = createDeps();

    await invoke(deps);

    expect(searchMock).not.toHaveBeenCalled();
  });

  it('never reads a rule for an over-limit discovery', async () => {
    findAttackDiscoveryAlertsMock.mockResolvedValue([
      {
        alert_ids: Array.from(
          { length: PND_DISCOVERY_CONTEXT_MAX_ALERT_IDS + 1 },
          (_, i) => `alert-${i}`
        ),
        id: ATTACK_DISCOVERY_ALERT_ID,
      },
    ]);
    const { deps } = createDeps();

    await invoke(deps);

    expect(fetchDetectionRuleMock).not.toHaveBeenCalled();
  });

  it('names the cap in the rejection, so the caller can tell it from a validation failure', async () => {
    findAttackDiscoveryAlertsMock.mockResolvedValue([
      {
        alert_ids: Array.from(
          { length: PND_DISCOVERY_CONTEXT_MAX_ALERT_IDS + 1 },
          (_, i) => `alert-${i}`
        ),
        id: ATTACK_DISCOVERY_ALERT_ID,
      },
    ]);
    const { deps } = createDeps();

    const response = await invoke(deps);

    expect(response.badRequest.mock.calls[0][0]?.body).toEqual({
      message: expect.stringContaining(`${PND_DISCOVERY_CONTEXT_MAX_ALERT_IDS}`),
    });
  });

  it('accepts a discovery correlating exactly the bounded number of alerts', async () => {
    findAttackDiscoveryAlertsMock.mockResolvedValue([
      {
        alert_ids: Array.from(
          { length: PND_DISCOVERY_CONTEXT_MAX_ALERT_IDS },
          (_, i) => `alert-${i}`
        ),
        id: ATTACK_DISCOVERY_ALERT_ID,
      },
    ]);
    const { deps } = createDeps();

    const response = await invoke(deps);

    expect(response.badRequest).not.toHaveBeenCalled();
  });

  it('finds the distinct rules in one Elasticsearch round trip (D10)', async () => {
    const { deps, searchMock } = createDeps();

    await invoke(deps);

    expect(searchMock).toHaveBeenCalledTimes(1);
  });

  it('reads the alerts index of the request space, never every space (S9)', async () => {
    const { deps, searchMock } = createDeps();

    await invoke(deps);

    expect(searchMock.mock.calls[0][0].index).toBe(`.alerts-security.alerts-${REQUEST_SPACE}`);
  });

  it('reads each distinct rule by its saved-object id, as the caller in the request space', async () => {
    const { deps } = createDeps();

    await invoke(deps);

    expect(fetchDetectionRuleMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: endpointRule.id, spaceId: REQUEST_SPACE })
    );
  });

  it('reads one rule per aggregation bucket', async () => {
    const { deps } = createDeps({
      search: jest.fn().mockResolvedValue(aggregationsFor([endpointRule.id, oktaRule.id])),
    });

    await invoke(deps);

    expect(fetchDetectionRuleMock).toHaveBeenCalledTimes(2);
  });

  it('projects the rules the aggregation named into the candidate menu', async () => {
    const { deps } = createDeps();

    expect(body(await invoke(deps)).rules).toEqual([endpointRule]);
  });

  /**
   * Nothing validates the response on the way out, so the contract's bounds hold only if what the
   * route builds already satisfies them.
   */
  it('emits a body the response contract accepts', async () => {
    const { deps } = createDeps();

    const responseBody = body(await invoke(deps));

    expect(() => GetCandidateRulesResponse.parse(responseBody)).not.toThrow();
  });

  /**
   * Absent rather than an error: surfacing "you may not read this rule" would make rule existence
   * observable through a discovery the caller *can* read.
   */
  it('omits a rule the caller may not read rather than failing the request', async () => {
    fetchDetectionRuleMock.mockResolvedValue({ rule: undefined, status: 403 });
    const { deps } = createDeps();

    expect(body(await invoke(deps)).rules).toEqual([]);
  });

  it('omits a rule that no longer exists', async () => {
    fetchDetectionRuleMock.mockResolvedValue({ rule: undefined, status: 404 });
    const { deps } = createDeps();

    expect(body(await invoke(deps)).rules).toEqual([]);
  });

  it('keeps the readable rules when one of several could not be read', async () => {
    fetchDetectionRuleMock
      .mockResolvedValueOnce({ rule: undefined, status: 403 })
      .mockResolvedValueOnce({ rule: oktaRule, status: 200 });
    const { deps } = createDeps({
      search: jest.fn().mockResolvedValue(aggregationsFor([endpointRule.id, oktaRule.id])),
    });

    expect(body(await invoke(deps)).rules).toEqual([oktaRule]);
  });

  it('narrows the menu to a ruleRef the gate already names', async () => {
    fetchDetectionRuleMock
      .mockResolvedValueOnce({ rule: endpointRule, status: 200 })
      .mockResolvedValueOnce({ rule: oktaRule, status: 200 });
    const { deps } = createDeps({
      search: jest.fn().mockResolvedValue(aggregationsFor([endpointRule.id, oktaRule.id])),
    });

    expect(
      body(
        await invoke(deps, {
          correlationId: ATTACK_DISCOVERY_ALERT_ID,
          ruleRef: oktaRule.rule_id,
        })
      ).rules
    ).toEqual([oktaRule]);
  });

  it('returns an empty menu for an unmatched ruleRef rather than the unfiltered one', async () => {
    const { deps } = createDeps();

    expect(
      body(
        await invoke(deps, {
          correlationId: ATTACK_DISCOVERY_ALERT_ID,
          ruleRef: 'UNKNOWN',
        })
      ).rules
    ).toEqual([]);
  });

  it('returns an empty menu when the aggregation named no rule', async () => {
    const { deps } = createDeps({ search: jest.fn().mockResolvedValue(aggregationsFor([])) });

    expect(body(await invoke(deps)).rules).toEqual([]);
  });

  it('still responds when the aggregation is missing entirely', async () => {
    const { deps } = createDeps({ search: jest.fn().mockResolvedValue({}) });

    expect(body(await invoke(deps)).rules).toEqual([]);
  });

  /**
   * The opposite choice from `/discovery-context`, which degrades to an empty body: an empty list
   * there is an absent overlay, while an empty menu here is an affirmative claim that no rule is
   * tunable — which would send the drafting step back to training-data recall believing it had
   * seen the real rules.
   */
  it('surfaces a failed alerts read as an error rather than an empty menu', async () => {
    const { deps } = createDeps({ search: jest.fn().mockRejectedValue(new Error('boom')) });

    const response = await invoke(deps);

    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
  });

  it('does not answer a failed read with a menu', async () => {
    const { deps } = createDeps({ search: jest.fn().mockRejectedValue(new Error('boom')) });

    const response = await invoke(deps);

    expect(response.ok).not.toHaveBeenCalled();
  });

  it('logs a failed read through the PND logger', async () => {
    const { deps } = createDeps({ search: jest.fn().mockRejectedValue(new Error('boom')) });

    await invoke(deps);

    expect(deps.logger.error).toHaveBeenCalledTimes(1);
  });

  it('surfaces a failure to resolve the discovery as an error', async () => {
    findAttackDiscoveryAlertsMock.mockRejectedValue(new Error('boom'));
    const { deps } = createDeps();

    const response = await invoke(deps);

    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
  });

  it('surfaces a failure to read a rule as an error', async () => {
    fetchDetectionRuleMock.mockRejectedValue(new Error('boom'));
    const { deps } = createDeps();

    const response = await invoke(deps);

    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
  });

  it('bounds the distinct rules at the cap each scoped read is counted against', async () => {
    const { deps, searchMock } = createDeps();

    await invoke(deps);

    expect(searchMock.mock.calls[0][0].aggs.by_rule.terms.size).toBe(
      PND_TUNING_CANDIDATE_RULES_MAX
    );
  });
});
