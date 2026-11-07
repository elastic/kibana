/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { useQuery } from '@kbn/react-query';
import type { RiskScoreHistoryResponse } from '../../../../common/api/entity_analytics';
import { EntityType } from '../../../../common/entity_analytics/types';
import type { IntelligenceEntity } from './common';
import type { SecurityFindingsResult } from './security_findings/types';
import { useSecurityFindings } from './security_findings/use_security_findings';
import { EntityInvestigationCanvas } from './entity_investigation_canvas';
import type { EntityGraphSecurity } from './entity_investigation_canvas';
import { useEntityAgentRiskInputs } from './use_entity_agent_risk_inputs';

jest.mock('../../../common/hooks/use_space_id');
jest.mock('./security_findings/use_security_findings');
const mockFetchRiskScoreHistory = jest.fn();
jest.mock('../../api/api', () => ({
  useEntityAnalyticsRoutes: () => ({ fetchRiskScoreHistory: mockFetchRiskScoreHistory }),
}));
jest.mock('@kbn/react-query', () => ({ useQuery: jest.fn() }));
jest.mock('./use_entity_agent_risk_inputs', () => ({ useEntityAgentRiskInputs: jest.fn() }));

const entity: IntelligenceEntity = {
  id: 'user:alex.chen@host-laptop-fin03@local',
  name: 'alex.chen',
  type: EntityType.user,
  identifierValue: 'alex.chen',
  riskScoreNorm: 79,
  riskLevel: 'High',
  criticality: undefined,
  source: undefined,
  lastSeen: undefined,
};
const result: SecurityFindingsResult = {
  findings: [],
  isLoading: false,
  isRefreshing: false,
  unavailable: false,
  partial: false,
  total: 0,
  refetch: jest.fn(),
};
const agentResult: SecurityFindingsResult = {
  ...result,
  findings: [
    {
      id: 'alert',
      source: { id: 'alert', index: '.internal.alerts-security.alerts-default-000001' },
      ancestors: [],
      entityIds: [entity.id],
      timestamp: '2026-10-14T12:00:00Z',
      title: 'Protected lookup',
      severity: 'high',
      status: 'open',
      kind: 'detection',
      outcome: 'unknown',
      rule: { name: 'Lookup rule' },
      agent: { id: 'google', provider: 'google_adk', sessionId: 'run' },
      policy: {
        id: 'policy',
        name: 'Customer access',
        mode: 'monitor',
        decision: 'deny',
        engine: 'monitor',
      },
    },
  ],
};
const history: RiskScoreHistoryResponse = {
  entity_id: entity.id,
  entity_type: 'user',
  interval: '1h',
  entries: [
    {
      '@timestamp': '2026-10-14T13:00:00Z',
      calculated_score_norm: 58.2,
      calculated_level: 'Moderate',
      inputs: [
        {
          id: 'alert',
          index: '.alerts-security.alerts-default',
          description: 'Protected lookup',
          category: 'category_1',
        },
      ],
    },
  ],
};
const resolution = {
  complete: true,
  alias: '.alerts-security.alerts-default',
  references: [agentResult.findings[0].source],
  isLoading: false,
};
const StatefulGraph: React.FC = () => {
  const [expanded, setExpanded] = useState(false);
  return (
    <button type="button" onClick={() => setExpanded(true)}>
      {expanded ? 'Host expanded' : 'Expand host'}
    </button>
  );
};
const renderGraph = jest.fn((_security: EntityGraphSecurity) => <StatefulGraph />);

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useSpaceId).mockReturnValue('default');
  jest.mocked(useSecurityFindings).mockReturnValue(result);
  jest
    .mocked(useQuery)
    .mockReturnValue({ data: undefined, isFetching: false, isError: false } as ReturnType<
      typeof useQuery
    >);
  jest.mocked(useEntityAgentRiskInputs).mockReturnValue(resolution);
});

it('supplies exact entity and space evidence to the original graph', () => {
  const investigate = jest.fn();
  render(
    <EntityInvestigationCanvas
      entity={entity}
      entityTargets={[entity]}
      onInvestigateEntity={investigate}
    >
      {renderGraph}
    </EntityInvestigationCanvas>
  );
  expect(useSecurityFindings).toHaveBeenCalledWith({ type: 'entity', entity }, 'default');
  expect(renderGraph).toHaveBeenCalledWith({
    scope: { type: 'entity', entity },
    result,
    spaceId: 'default',
    entityTargets: [entity],
    onInvestigateEntity: investigate,
    riskHistory: undefined,
    riskInputResolution: undefined,
  });
  expect(screen.getByRole('button', { name: 'Expand host' })).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Security path' })).not.toBeInTheDocument();
});

it.each(['isLoading', 'isRefreshing', 'unavailable'] as const)(
  'keeps the graph mounted during %s',
  (state) => {
    const { rerender } = render(
      <EntityInvestigationCanvas entity={entity}>{renderGraph}</EntityInvestigationCanvas>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Expand host' }));
    const next = { ...result, [state]: true };
    jest.mocked(useSecurityFindings).mockReturnValue(next);
    rerender(<EntityInvestigationCanvas entity={entity}>{renderGraph}</EntityInvestigationCanvas>);
    expect(screen.getByRole('button', { name: 'Host expanded' })).toBeVisible();
    expect(renderGraph.mock.calls.at(-1)?.[0].result).toBe(next);
  }
);

it('updates canonical identity and space independently of a shared display name', () => {
  const { rerender } = render(
    <EntityInvestigationCanvas entity={entity}>{renderGraph}</EntityInvestigationCanvas>
  );
  const other = { ...entity, id: 'user:alex.chen@host-gen-8@local' };
  jest.mocked(useSpaceId).mockReturnValue('other');
  rerender(<EntityInvestigationCanvas entity={other}>{renderGraph}</EntityInvestigationCanvas>);
  expect(useSecurityFindings).toHaveBeenLastCalledWith({ type: 'entity', entity: other }, 'other');
  expect(useQuery).toHaveBeenLastCalledWith(
    ['entityIntelligenceRiskHistory', 'other', other.type, other.id],
    expect.any(Function),
    expect.objectContaining({ enabled: false, refetchOnWindowFocus: false })
  );
});

it('shares the dossier history request and resolves exact native inputs for the graph', async () => {
  jest.mocked(useSecurityFindings).mockReturnValue(agentResult);
  jest
    .mocked(useQuery)
    .mockReturnValue({ data: history, isFetching: false, isError: false } as ReturnType<
      typeof useQuery
    >);
  render(<EntityInvestigationCanvas entity={entity}>{renderGraph}</EntityInvestigationCanvas>);
  expect(useQuery).toHaveBeenCalledWith(
    ['entityIntelligenceRiskHistory', 'default', entity.type, entity.id],
    expect.any(Function),
    expect.objectContaining({ enabled: true, refetchOnWindowFocus: false })
  );
  expect(useEntityAgentRiskInputs).toHaveBeenCalledWith(
    entity,
    agentResult.findings,
    history,
    'default'
  );
  expect(renderGraph.mock.calls.at(-1)?.[0]).toEqual(
    expect.objectContaining({
      riskHistory: history,
      riskInputResolution: resolution,
    })
  );
  const fetcher = jest.mocked(useQuery).mock.calls.at(-1)?.[1];
  const signal = new AbortController().signal;
  if (typeof fetcher !== 'function') throw new Error('Expected a history query function.');
  await fetcher({ signal, queryKey: ['entityIntelligenceRiskHistory'], meta: undefined });
  expect(mockFetchRiskScoreHistory).toHaveBeenCalledWith({
    signal,
    params: { entityType: entity.type, entityId: entity.id, includeContributions: true },
  });
});

it.each(['isLoading', 'isRefreshing', 'unavailable'] as const)(
  'withholds native risk joins when finding evidence is %s',
  (state) => {
    jest.mocked(useSecurityFindings).mockReturnValue({ ...agentResult, [state]: true });
    jest
      .mocked(useQuery)
      .mockReturnValue({ data: history, isFetching: false, isError: false } as ReturnType<
        typeof useQuery
      >);
    render(<EntityInvestigationCanvas entity={entity}>{renderGraph}</EntityInvestigationCanvas>);
    expect(renderGraph.mock.calls.at(-1)?.[0].riskHistory).toBeUndefined();
    expect(renderGraph.mock.calls.at(-1)?.[0].riskInputResolution).toBeUndefined();
    expect(useEntityAgentRiskInputs).toHaveBeenCalledWith(entity, [], undefined, 'default');
  }
);

it.each(['fetching', 'error', 'entity', 'type', 'space'])(
  'rejects %s history before showing risk on the graph',
  (state) => {
    jest.mocked(useSecurityFindings).mockReturnValue(agentResult);
    if (state === 'space') jest.mocked(useSpaceId).mockReturnValue(undefined);
    const data =
      state === 'entity'
        ? { ...history, entity_id: 'other' }
        : state === 'type'
        ? { ...history, entity_type: 'host' }
        : history;
    jest.mocked(useQuery).mockReturnValue({
      data,
      isFetching: state === 'fetching',
      isError: state === 'error',
    } as ReturnType<typeof useQuery>);
    render(<EntityInvestigationCanvas entity={entity}>{renderGraph}</EntityInvestigationCanvas>);
    expect(renderGraph.mock.calls.at(-1)?.[0].riskHistory).toBeUndefined();
    expect(renderGraph.mock.calls.at(-1)?.[0].riskInputResolution).toBeUndefined();
  }
);

it('withholds resolution while its exact backing-alert lookup is loading', () => {
  jest.mocked(useSecurityFindings).mockReturnValue(agentResult);
  jest
    .mocked(useQuery)
    .mockReturnValue({ data: history, isFetching: false, isError: false } as ReturnType<
      typeof useQuery
    >);
  jest
    .mocked(useEntityAgentRiskInputs)
    .mockReturnValue({ ...resolution, isLoading: true, complete: false, references: [] });
  render(<EntityInvestigationCanvas entity={entity}>{renderGraph}</EntityInvestigationCanvas>);
  expect(renderGraph.mock.calls.at(-1)?.[0].riskHistory).toBeUndefined();
  expect(renderGraph.mock.calls.at(-1)?.[0].riskInputResolution).toBeUndefined();
});
