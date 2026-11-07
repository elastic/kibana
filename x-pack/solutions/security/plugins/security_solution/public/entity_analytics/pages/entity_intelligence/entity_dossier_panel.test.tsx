/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EntityType } from '../../../../common/entity_analytics/types';
import type { IntelligenceEntity } from './common';
import type { SecurityFindingsResult } from './security_findings/types';
import { SecurityFindingsPanel } from './security_findings/security_findings_panel';
import { useSecurityFindings } from './security_findings/use_security_findings';
import { EntityDossierPanel } from './entity_dossier_panel';
import { EntityAgentActivity } from './entity_agent_activity';
import { useQuery } from '@kbn/react-query';

jest.mock('../../../common/hooks/use_space_id', () => ({ useSpaceId: () => 'default' }));
jest.mock('../../../common/lib/kibana', () => ({
  useKibana: () => ({ services: { agentBuilder: undefined } }),
}));
jest.mock('../../api/api', () => ({
  useEntityAnalyticsRoutes: () => ({ fetchRiskScoreHistory: jest.fn() }),
}));
jest.mock('@kbn/react-query', () => ({
  useQuery: jest.fn(() => ({ data: undefined, isLoading: false })),
}));
jest.mock('./entity_agent_activity', () => ({ EntityAgentActivity: jest.fn(() => null) }));
jest.mock('./hooks/use_converse_api', () => ({
  useConverseOnce: () => ({
    generate: jest.fn(),
    reset: jest.fn(),
    result: undefined,
    isGenerating: false,
    error: undefined,
    hasConnector: false,
  }),
}));
jest.mock('./animations', () => ({
  useCountUp: (score?: number) => score,
}));
jest.mock('./risk_dial', () => ({
  RiskDial: () => <div data-test-subj="riskDial" />,
  RiskSparkline: () => <div />,
}));
jest.mock('./security_findings/use_security_findings');
jest.mock('./security_findings/security_findings_panel', () => ({
  SecurityFindingsPanel: jest.fn(() => <div data-test-subj="renderedSecurityFindings" />),
}));

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

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useSecurityFindings).mockReturnValue(result);
});

it.each([true, false])(
  'keeps scoped findings visible for ordinary entities when compact=%s',
  (compact) => {
    render(<EntityDossierPanel entity={entity} compact={compact} />);
    expect(useSecurityFindings).toHaveBeenCalledWith({ type: 'entity', entity }, 'default');
    expect(jest.mocked(SecurityFindingsPanel).mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({
        scope: { type: 'entity', entity },
        result,
        compact: true,
        entityTargets: [entity],
      })
    );
    const path = screen.getByTestId('renderedSecurityFindings');
    expect(path).toBeVisible();
    if (compact) {
      expect(screen.queryByTestId('riskDial')).not.toBeInTheDocument();
      expect(screen.getByText('Risk 79.0 / 100')).toBeVisible();
    } else {
      const riskDial = screen.getByTestId('riskDial');
      expect(path.compareDocumentPosition(riskDial)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    }
  }
);

it('updates the canonical scope when inspecting another entity with the same name', () => {
  const { rerender } = render(<EntityDossierPanel entity={entity} compact />);
  const otherEntity = { ...entity, id: 'user:alex.chen@host-gen-8@local' };
  rerender(<EntityDossierPanel entity={otherEntity} compact />);
  expect(useSecurityFindings).toHaveBeenLastCalledWith(
    { type: 'entity', entity: otherEntity },
    'default'
  );
  expect(jest.mocked(SecurityFindingsPanel).mock.calls.at(-1)?.[0].scope).toEqual({
    type: 'entity',
    entity: otherEntity,
  });
});

it('loads risk inputs in the compact viewer when agent policy findings are present', () => {
  jest.mocked(useSecurityFindings).mockReturnValue({
    ...result,
    findings: [
      {
        id: 'alert',
        source: { id: 'alert', index: 'alerts' },
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
  });
  const onShowAgentActivity = jest.fn();
  render(<EntityDossierPanel entity={entity} compact onShowAgentActivity={onShowAgentActivity} />);
  expect(useQuery).toHaveBeenCalledWith(
    ['entityIntelligenceRiskHistory', 'default', entity.type, entity.id],
    expect.any(Function),
    expect.objectContaining({ enabled: true })
  );
  expect(jest.mocked(EntityAgentActivity).mock.calls.at(-1)?.[0]).toEqual(
    expect.objectContaining({ compact: true, onShowAgentActivity })
  );
  expect(screen.getByTestId('renderedSecurityFindings')).not.toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'All security findings' }));
  expect(screen.getByTestId('renderedSecurityFindings')).toBeVisible();
});
