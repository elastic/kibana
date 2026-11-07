/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { EntityType } from '../../../../common/entity_analytics/types';
import type { IntelligenceEntity } from './common';
import type { AlertEvidence } from './graph_state';
import { EMPTY_EDGE_CONTEXT, toEdgeContext } from './event_context';
import type { RelationshipEntity, RelationshipQueryParams } from './hooks/use_entity_relationships';
import { RelationshipGraph } from './relationship_graph';
import { FindingDetails } from './security_findings/security_findings_panel';
import type { SecurityFinding, SecurityFindingsResult } from './security_findings/types';
import type { EntityGraphSecurity } from './entity_investigation_canvas';

jest.mock('./use_entity_agent_session_titles', () => ({ useEntityAgentSessionTitles: () => [] }));
jest.mock('../../../common/lib/kibana', () => ({
  ...jest.requireActual('../../../common/lib/kibana'),
  useKibana: () => ({
    services: {
      application: {
        getUrlForApp: (app: string, { path }: { path: string }) => `/app/${app}${path}`,
      },
    },
  }),
}));

jest.mock('./security_findings/security_findings_panel', () => ({
  ...jest.requireActual('./security_findings/security_findings_panel'),
  FindingDetails: jest.fn(({ finding }: { finding: SecurityFinding }) => (
    <div data-test-subj="securityEventDetails">{finding.title}</div>
  )),
}));

const mockUseEntityRelationships = jest.fn();
const mockUseAlertEvidence = jest.fn();

jest.mock('./hooks/use_entity_relationships', () => ({
  ...jest.requireActual('./hooks/use_entity_relationships'),
  useEntityRelationships: (
    entity: RelationshipEntity | undefined,
    params: RelationshipQueryParams
  ) => mockUseEntityRelationships(entity, params),
}));

jest.mock('./hooks/use_alert_evidence', () => ({
  useAlertEvidence: (params: { enabled?: boolean; entities: readonly RelationshipEntity[] }) =>
    mockUseAlertEvidence(params),
}));

const rootEntity: IntelligenceEntity = {
  id: 'entity-id-1',
  name: 'a.rodriguez@jump-box-01',
  type: EntityType.user,
  identifierValue: 'a.rodriguez',
  riskScoreNorm: 72,
  riskLevel: 'High',
  criticality: undefined,
  source: undefined,
  lastSeen: undefined,
};

const rootRelationships = {
  related: [
    {
      id: 'host:jump-box-01',
      name: 'jump-box-01',
      kind: EntityType.host,
      alertCount: 4,
      worstSeverity: 'high' as const,
      context: EMPTY_EDGE_CONTEXT,
    },
  ],
  totalAlerts: 4,
};

const expandedRelationships = {
  related: [
    {
      id: 'user:b.rodriguez',
      name: 'b.rodriguez',
      kind: EntityType.user,
      alertCount: 2,
      worstSeverity: 'medium' as const,
      context: EMPTY_EDGE_CONTEXT,
    },
  ],
  totalAlerts: 2,
};

const alertEvidence: AlertEvidence = {
  id: 'alert-1',
  ruleName: 'Suspicious remote process',
  title: 'Suspicious remote process',
  severity: 'high',
  status: 'open',
  timestamp: '2026-07-16T12:00:00.000Z',
  eventKind: 'signal',
  eventCategory: ['process'],
  users: ['a.rodriguez'],
  hosts: ['jump-box-01'],
  services: [],
  sourceIps: [],
  destinationIps: [],
  processName: 'ssh',
  processExecutable: '/usr/bin/ssh',
};

const emptyEvidenceResult = {
  alerts: [],
  totalAlerts: 0,
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
};
const evidenceResult = {
  alerts: [alertEvidence],
  totalAlerts: 1,
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
};

const renderGraph = () =>
  render(
    <RelationshipGraph
      entity={rootEntity}
      onInspectEntity={jest.fn()}
      onEvidenceOpen={jest.fn()}
      isExternalDrawerOpen={false}
    />
  );

const renderGraphWithHunt = (onHuntEntity: jest.Mock) =>
  render(
    <RelationshipGraph
      entity={rootEntity}
      onInspectEntity={jest.fn()}
      onEvidenceOpen={jest.fn()}
      onHuntEntity={onHuntEntity}
      isExternalDrawerOpen={false}
    />
  );

describe('RelationshipGraph interactions', () => {
  beforeAll(() => {
    global.ResizeObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    }));
  });

  beforeEach(() => {
    mockUseEntityRelationships.mockImplementation((entity: RelationshipEntity | undefined) => ({
      relationships:
        entity?.identifierValue === rootEntity.identifierValue
          ? rootRelationships
          : entity?.identifierValue === 'jump-box-01'
          ? expandedRelationships
          : undefined,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    }));
    mockUseAlertEvidence.mockImplementation(({ enabled }: { enabled?: boolean }) =>
      enabled ? evidenceResult : emptyEvidenceResult
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('selects a node and keeps its actions clickable', async () => {
    renderGraph();
    const node = await screen.findByTestId('entityIntelligenceGraphNode-jump-box-01');

    fireEvent.click(node);
    const actions = screen.getByTestId('entityIntelligenceGraphNodeActions');
    const focus = screen.getByLabelText('Focus');
    fireEvent.pointerDown(focus, { pointerType: 'mouse', button: 0 });
    fireEvent.click(focus);

    expect(actions).toBeInTheDocument();
    expect(node).toHaveAttribute('data-selected', 'true');
    expect(node).toHaveAttribute('data-focused', 'true');
  });

  it('expands a selected entity using its raw identifier', async () => {
    renderGraph();
    const node = await screen.findByTestId('entityIntelligenceGraphNode-jump-box-01');
    fireEvent.click(node);
    fireEvent.click(screen.getByLabelText('Expand'));

    await waitFor(() =>
      expect(mockUseEntityRelationships).toHaveBeenCalledWith(
        expect.objectContaining({ identifierValue: 'jump-box-01' }),
        expect.any(Object)
      )
    );
    expect(
      await screen.findByTestId('entityIntelligenceGraphNode-b.rodriguez')
    ).toBeInTheDocument();
  });

  it('double-clicks and presses E to expand while Enter exposes actions', async () => {
    const { unmount } = renderGraph();
    const node = await screen.findByTestId('entityIntelligenceGraphNode-jump-box-01');
    fireEvent.doubleClick(node);
    await waitFor(() =>
      expect(mockUseEntityRelationships).toHaveBeenCalledWith(
        expect.objectContaining({ identifierValue: 'jump-box-01' }),
        expect.any(Object)
      )
    );

    unmount();
    jest.clearAllMocks();
    renderGraph();
    const keyboardNode = await screen.findByTestId('entityIntelligenceGraphNode-jump-box-01');
    fireEvent.keyDown(keyboardNode, { key: 'Enter' });
    expect(screen.getByTestId('entityIntelligenceGraphNodeActions')).toBeInTheDocument();
    fireEvent.keyDown(keyboardNode, { key: 'f' });
    expect(keyboardNode).toHaveAttribute('data-focused', 'true');
    fireEvent.keyDown(keyboardNode, { key: 'e' });
    await waitFor(() =>
      expect(mockUseEntityRelationships).toHaveBeenCalledWith(
        expect.objectContaining({ identifierValue: 'jump-box-01' }),
        expect.any(Object)
      )
    );
  });

  it('opens evidence from an alert cluster', async () => {
    renderGraph();
    const node = await screen.findByTestId('entityIntelligenceGraphNode-jump-box-01');
    fireEvent.click(node);
    fireEvent.click(screen.getByLabelText('Evidence'));
    const cluster = await screen.findByTestId('entityIntelligenceAlertCluster-host:jump-box-01');
    fireEvent.click(screen.getByLabelText('Close evidence details'));
    fireEvent.click(cluster);

    expect(screen.getByRole('complementary', { name: 'Evidence' })).toBeInTheDocument();
  });

  it('allows ordinary wheel scrolling and reserves zoom for modifiers', async () => {
    renderGraph();
    const canvas = await screen.findByTestId('entityIntelligenceGraphCanvas');
    const ordinaryWheel = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 40,
    });
    act(() => {
      canvas.dispatchEvent(ordinaryWheel);
    });
    expect(ordinaryWheel.defaultPrevented).toBe(false);

    const zoomWheel = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
      deltaY: -40,
    });
    act(() => {
      canvas.dispatchEvent(zoomWheel);
    });
    expect(zoomWheel.defaultPrevented).toBe(true);
  });

  it('folds a large neighborhood into a "show more" group node that reveals on click', async () => {
    const manyRelationships = {
      related: Array.from({ length: 9 }, (_, index) => ({
        id: `host:node-${index}`,
        name: `node-${index}`,
        kind: EntityType.host,
        alertCount: 9 - index,
        worstSeverity: 'medium' as const,
        context: EMPTY_EDGE_CONTEXT,
      })),
      totalAlerts: 40,
    };
    mockUseEntityRelationships.mockImplementation(() => ({
      relationships: manyRelationships,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    }));

    renderGraph();
    // The strongest six neighbors render directly...
    expect(await screen.findByTestId('entityIntelligenceGraphNode-node-0')).toBeInTheDocument();
    // ...and the overflow is folded behind a group node keyed by the root entity id.
    const group = await screen.findByTestId('entityIntelligenceGraphGroup-user:a.rodriguez');
    fireEvent.click(group);
    expect(await screen.findByTestId('entityIntelligenceGraphNode-node-6')).toBeInTheDocument();
  });

  it('copies a node value and invokes the hunt handler from the action strip', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    const onHuntEntity = jest.fn();
    renderGraphWithHunt(onHuntEntity);

    const node = await screen.findByTestId('entityIntelligenceGraphNode-jump-box-01');
    fireEvent.click(node);
    fireEvent.click(screen.getByLabelText('Copy value'));
    expect(writeText).toHaveBeenCalledWith('jump-box-01');

    fireEvent.click(screen.getByLabelText('Hunt this entity'));
    expect(onHuntEntity).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'host:jump-box-01', name: 'jump-box-01' })
    );
  });

  it('surfaces a widen-time-range affordance when the root has no relationships', async () => {
    mockUseEntityRelationships.mockImplementation(() => ({
      relationships: { related: [], totalAlerts: 0 },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    }));

    renderGraph();
    expect(await screen.findByTestId('entityIntelligenceGraphNoRelationships')).toBeInTheDocument();
    expect(screen.getByTestId('entityIntelligenceGraphWidenRange')).toBeInTheDocument();
  });

  it('walks entity nodes with arrow keys', async () => {
    renderGraph();
    const rootNode = await screen.findByTestId(
      'entityIntelligenceGraphNode-a.rodriguez@jump-box-01'
    );
    const neighbor = await screen.findByTestId('entityIntelligenceGraphNode-jump-box-01');
    expect(rootNode).toHaveAttribute('data-focused', 'true');

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(neighbor).toHaveAttribute('data-focused', 'true');
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(rootNode).toHaveAttribute('data-focused', 'true');
  });

  it('lights up edge relationship phrases when logs-* context arrives after the alert data', async () => {
    // The event-context query resolves after the alert-derived relationships,
    // so the graph first renders with empty context. The enriched result must
    // be re-merged onto the already-placed edge (regression guard).
    const enrichedContext = toEdgeContext({
      network_targets: { buckets: [{ key: '10.20.10.11:445', doc_count: 12 }] },
    });
    mockUseEntityRelationships.mockImplementation((entity: RelationshipEntity | undefined) =>
      entity?.identifierValue === rootEntity.identifierValue
        ? { relationships: rootRelationships, isLoading: false, isError: false, refetch: jest.fn() }
        : { relationships: undefined, isLoading: false, isError: false, refetch: jest.fn() }
    );

    const { rerender } = renderGraph();
    await screen.findByTestId('entityIntelligenceGraphNode-jump-box-01');

    // Now the enrichment lands: same neighbor, but the edge carries context.
    mockUseEntityRelationships.mockImplementation((entity: RelationshipEntity | undefined) =>
      entity?.identifierValue === rootEntity.identifierValue
        ? {
            relationships: {
              related: [{ ...rootRelationships.related[0], context: enrichedContext }],
              totalAlerts: rootRelationships.totalAlerts,
            },
            isLoading: false,
            isError: false,
            refetch: jest.fn(),
          }
        : { relationships: undefined, isLoading: false, isError: false, refetch: jest.fn() }
    );
    rerender(
      <RelationshipGraph
        entity={rootEntity}
        onInspectEntity={jest.fn()}
        onEvidenceOpen={jest.fn()}
        isExternalDrawerOpen={false}
      />
    );

    // The on-edge <title> now carries the real relationship phrase (regression:
    // previously the edge stayed at "N shared alerts" because the context query
    // was disabled once expansion cleared).
    await waitFor(() => {
      const titles = Array.from(document.querySelectorAll('title')).map((t) => t.textContent);
      expect(
        titles.some((title) => title?.includes('connected to 10.20.10.11:445 (12 flows)'))
      ).toBe(true);
    });
  });

  it('toggles alert evidence from an icon-only command-bar control with a labeled tooltip', () => {
    renderGraph();
    // Evidence starts on, so the toggle offers to hide it.
    const toggle = screen.getByTestId('entityIntelligenceGraphEvidenceToggle');
    expect(screen.getByLabelText('Hide alert evidence')).toBe(toggle);
    fireEvent.click(toggle);
    expect(screen.getByLabelText('Show alert evidence')).toBeInTheDocument();
  });

  it('expands into a populated legend with node types and edge semantics', () => {
    renderGraph();
    const legend = screen.getByTestId('entityIntelligenceGraphLegend');
    // Collapsed: header + the zoom chip are present.
    expect(legend).toHaveTextContent('Legend & controls');
    fireEvent.click(screen.getByText('Legend & controls'));
    // Populated sections after expanding.
    expect(legend).toHaveTextContent('Node types');
    expect(legend).toHaveTextContent('Thicker line = more shared alerts');
    expect(legend).toHaveTextContent('Green dot = branch already expanded');
    expect(legend).toHaveTextContent('"+N" reveals more related entities');
  });

  it('assembles a grounded prompt and opens the shared explain flyout on demand', () => {
    const onExplain = jest.fn();
    render(
      <RelationshipGraph
        entity={rootEntity}
        onInspectEntity={jest.fn()}
        onEvidenceOpen={jest.fn()}
        onExplain={onExplain}
        isExternalDrawerOpen={false}
      />
    );
    fireEvent.click(screen.getByTestId('entityIntelligenceGraphExplainButton'));
    expect(onExplain).toHaveBeenCalledTimes(1);
    const [prompt, subtitle] = onExplain.mock.calls[0];
    expect(prompt).toContain(`Focus entity: user "${rootEntity.name}"`);
    expect(prompt).toContain('Never invent entity names');
    expect(subtitle).toContain(rootEntity.name);
  });
});

const securityFinding: SecurityFinding = {
  id: 'security-alert',
  timestamp: '2026-10-13T20:00:00Z',
  title: 'Protected file read blocked',
  severity: 'high',
  status: 'open',
  kind: 'guardrail',
  outcome: 'blocked',
  action: 'protected_file_access',
  target: 'Protected fixture',
  rule: { name: 'Protected file read blocked' },
  source: { index: 'alerts', id: 'security-alert' },
  ancestors: [],
  entityIds: [rootEntity.id],
  scenario: { id: 'recorded-story', kind: 'generated', step: 1 },
};
const securityResult: SecurityFindingsResult = {
  findings: [securityFinding],
  isLoading: false,
  isRefreshing: false,
  unavailable: false,
  partial: true,
  total: 19,
  refetch: jest.fn(),
};
const security: EntityGraphSecurity = {
  scope: { type: 'entity', entity: rootEntity },
  result: securityResult,
  spaceId: 'default',
  entityTargets: [rootEntity],
};

const graphProps = {
  entity: rootEntity,
  onInspectEntity: jest.fn(),
  onEvidenceOpen: jest.fn(),
  isExternalDrawerOpen: false,
};

describe('native security event nodes', () => {
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-14T00:00:00Z'));
    mockUseEntityRelationships.mockReturnValue({
      relationships: rootRelationships,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });
    mockUseAlertEvidence.mockReturnValue(emptyEvidenceResult);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('keeps relationships and clickable security events in the same SVG canvas', async () => {
    render(<RelationshipGraph {...graphProps} security={security} />);
    expect(
      await screen.findByTestId('entityIntelligenceGraphNode-jump-box-01')
    ).toBeInTheDocument();
    const event = screen.getByTestId('entityGraphSecurityEvent');
    expect(event.closest('svg')).toBe(screen.getByTestId('entityIntelligenceGraphCanvas'));
    expect(screen.queryByRole('tab', { name: 'Security path' })).not.toBeInTheDocument();
    fireEvent.click(event);
    expect(screen.getByTestId('securityEventDetails')).toHaveTextContent(
      'Protected file read blocked'
    );
    expect(jest.mocked(FindingDetails).mock.calls.at(-1)?.[0].finding).toEqual(securityFinding);
    expect(screen.queryByTestId('entityIntelligenceGraphNodeActions')).not.toBeInTheDocument();
  });

  it.each(['isLoading', 'isRefreshing', 'unavailable'] as const)(
    'hides security events and details during %s without replacing relationships',
    async (state) => {
      const { rerender } = render(<RelationshipGraph {...graphProps} security={security} />);
      fireEvent.click(screen.getByTestId('entityGraphSecurityEvent'));
      rerender(
        <RelationshipGraph
          {...graphProps}
          security={{ ...security, result: { ...securityResult, [state]: true } }}
        />
      );
      expect(screen.queryByTestId('entityGraphSecurityEvent')).not.toBeInTheDocument();
      expect(screen.queryByTestId('securityEventDetails')).not.toBeInTheDocument();
      expect(
        await screen.findByTestId('entityIntelligenceGraphNode-jump-box-01')
      ).toBeInTheDocument();
    }
  );

  it('does not attach findings for another canonical entity with the same display name', () => {
    render(
      <RelationshipGraph
        {...graphProps}
        security={{
          ...security,
          scope: { type: 'entity', entity: { ...rootEntity, id: 'other-entity' } },
        }}
      />
    );
    expect(screen.queryByTestId('entityGraphSecurityEvent')).not.toBeInTheDocument();
  });

  it('filters native findings by the graph time and severity controls and closes excluded details', async () => {
    const older: SecurityFinding = {
      ...securityFinding,
      id: 'older-alert',
      title: 'Older protected read',
      timestamp: '2026-10-11T20:00:00Z',
      source: { index: 'alerts', id: 'older-alert' },
    };
    const recent: SecurityFinding = {
      ...securityFinding,
      severity: 'medium',
      scenario: { id: 'recorded-story', kind: 'generated', step: 2 },
    };
    render(
      <RelationshipGraph
        {...graphProps}
        security={{
          ...security,
          result: { ...securityResult, findings: [recent, older] },
        }}
      />
    );
    expect(screen.getAllByTestId('entityGraphSecurityEvent')).toHaveLength(2);
    fireEvent.click(screen.getAllByTestId('entityGraphSecurityEvent')[0]);
    expect(screen.getByTestId('securityEventDetails')).toHaveTextContent(older.title);

    fireEvent.change(screen.getByLabelText('Graph time range'), { target: { value: '24h' } });
    expect(screen.getAllByTestId('entityGraphSecurityEvent')).toHaveLength(1);
    expect(screen.queryByTestId('securityEventDetails')).not.toBeInTheDocument();
    expect(screen.getByTestId('entityGraphSecuritySummary')).toHaveTextContent(
      '1 security finding'
    );

    fireEvent.change(screen.getByLabelText('Graph time range'), { target: { value: '30d' } });
    expect(screen.getAllByTestId('entityGraphSecurityEvent')).toHaveLength(2);
    expect(screen.queryByTestId('securityEventDetails')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Graph time range'), { target: { value: '24h' } });
    fireEvent.click(screen.getByTestId('entityGraphSecurityEvent'));
    expect(screen.getByTestId('securityEventDetails')).toHaveTextContent(recent.title);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('checkbox', { name: 'medium' }));
      fireEvent.click(screen.getByRole('button', { name: /^Filters/ }));
    });
    expect(screen.queryByTestId('entityGraphSecurityEvent')).not.toBeInTheDocument();
    expect(screen.queryByTestId('securityEventDetails')).not.toBeInTheDocument();
    const filteredSummary = screen.getByText('No security findings match graph filters');
    expect(filteredSummary).toBeInTheDocument();
    expect(
      await screen.findByTestId('entityIntelligenceGraphNode-jump-box-01')
    ).toBeInTheDocument();
    fireEvent.mouseOver(filteredSummary);
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      '0 structured findings shown; 0 match the graph time and severity filters. Security coverage is limited to 2 loaded alerts from the last 30 days.'
    );

    fireEvent.mouseOut(filteredSummary);
    await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^Filters/ }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('checkbox', { name: 'medium' }));
      fireEvent.click(screen.getByRole('button', { name: /^Filters/ }));
    });
    expect(screen.getAllByTestId('entityGraphSecurityEvent')).toHaveLength(1);
    expect(screen.queryByTestId('securityEventDetails')).not.toBeInTheDocument();
  });

  it('opens all findings for the exact selected root through its graph identity', () => {
    const onInspectEntity = jest.fn();
    render(
      <RelationshipGraph {...graphProps} security={security} onInspectEntity={onInspectEntity} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'All findings' }));
    expect(onInspectEntity).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'user:a.rodriguez',
        name: rootEntity.name,
        kind: EntityType.user,
      })
    );
  });
});

describe('hybrid entity and agent graph', () => {
  const toolFinding: SecurityFinding = {
    ...securityFinding,
    scenario: undefined,
    agent: {
      provider: 'google_adk',
      id: 'agent-runtime',
      sessionId: 'session-1',
      name: 'Google ADK',
    },
    policy: {
      id: 'protect',
      name: 'Customer export policy',
      mode: 'monitor',
      decision: 'deny',
      engine: 'monitor',
    },
    invocation: {
      source: { index: 'native-tools', id: 'observation-1' },
      toolCallId: 'call-1',
      toolName: 'export_case_summary',
      input: '{"case_id":"CASE-001"}',
      inputRecordHash: 'hash-1',
      inputSource: 'native',
      correlation: 'exact_native_observation',
      inputRedacted: false,
      inputTruncated: false,
    },
  };
  const toolSecurity = { ...security, result: { ...securityResult, findings: [toolFinding] } };
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-14T00:00:00Z'));
    mockUseEntityRelationships.mockReturnValue({
      relationships: rootRelationships,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });
    mockUseAlertEvidence.mockReturnValue(emptyEvidenceResult);
  });
  afterEach(() => jest.restoreAllMocks());

  it('places the attributed agent and exact tool call beside ordinary entity relationships', async () => {
    render(<RelationshipGraph {...graphProps} security={toolSecurity} />);
    expect(await screen.findByTestId('entityIntelligenceGraphNode-jump-box-01')).toBeVisible();
    const canvas = screen.getByTestId('entityIntelligenceGraphCanvas');
    expect(within(canvas).getByTestId('entityGraphAgentNode')).toBeInTheDocument();
    expect(within(canvas).getByTestId('entityGraphAgentSession')).toBeInTheDocument();
    expect(within(canvas).getAllByTestId('entityGraphAgentTool')).toHaveLength(1);
    expect(within(canvas).getByTestId('entityGraphIdentityActivityLabel')).toHaveTextContent(
      'Account activity & relationships'
    );
    expect(within(canvas).getByText('Work performed by agents')).toBeInTheDocument();
    expect(screen.queryByTestId('entityGraphSecurityEvent')).not.toBeInTheDocument();
    expect(screen.getByTestId('entityGraphSecuritySummary')).toHaveTextContent(
      '1 security finding'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Inspect tool call export_case_summary' }));
    expect(jest.mocked(FindingDetails).mock.calls.at(-1)?.[0].finding).toEqual(toolFinding);
  });

  it('removes the misleading empty relationship message and supports focus from the compact dossier', () => {
    mockUseEntityRelationships.mockReturnValue({
      relationships: { related: [], totalAlerts: 0 },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });
    const { rerender } = render(<RelationshipGraph {...graphProps} security={toolSecurity} />);
    expect(screen.queryByText(/No related entities share/)).not.toBeInTheDocument();
    expect(screen.getByTestId('entityGraphIdentityActivityLabel')).toHaveTextContent(
      'User identity'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Hide agent activity' }));
    expect(screen.queryByTestId('entityGraphAgentActivity')).not.toBeInTheDocument();
    expect(screen.queryByTestId('entityGraphIdentityActivityLabel')).not.toBeInTheDocument();
    rerender(
      <RelationshipGraph
        {...graphProps}
        security={toolSecurity}
        agentActivityRequest={{ entityId: rootEntity.id, nonce: 1 }}
      />
    );
    expect(screen.getByTestId('entityGraphAgentActivity')).toBeInTheDocument();
  });

  it('uses all measured graph width when the parent has already reserved an external dossier', () => {
    const { rerender } = render(<RelationshipGraph {...graphProps} security={toolSecurity} />);
    const transform = () =>
      screen
        .getByTestId('entityIntelligenceGraphCanvas')
        .querySelector(':scope > g[transform]')
        ?.getAttribute('transform');
    const before = transform();
    rerender(<RelationshipGraph {...graphProps} security={toolSecurity} isExternalDrawerOpen />);
    expect(transform()).toEqual(before);
    fireEvent.click(screen.getByRole('button', { name: 'Hide agent activity' }));
    expect(transform()).not.toEqual(before);
  });

  it('offers unbound agent findings without inventing native tool nodes', () => {
    const unbound = { ...toolFinding, invocation: undefined };
    render(
      <RelationshipGraph
        {...graphProps}
        security={{ ...toolSecurity, result: { ...toolSecurity.result, findings: [unbound] } }}
      />
    );
    expect(screen.queryByTestId('entityGraphAgentTool')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '1 finding without a tool link' })
    ).toBeInTheDocument();
  });

  it('grounds Explain this in the visible native agent actions', () => {
    const onExplain = jest.fn();
    render(<RelationshipGraph {...graphProps} security={toolSecurity} onExplain={onExplain} />);
    fireEvent.click(screen.getByTestId('entityIntelligenceGraphExplainButton'));
    expect(onExplain.mock.calls[0][0]).toContain('export_case_summary');
    expect(onExplain.mock.calls[0][0]).toContain('observation-1');
    expect(onExplain.mock.calls[0][0]).not.toContain('CASE-001');
  });

  it('pages sessions without making other recorded actions disappear from the count', () => {
    const findings = Array.from(
      { length: 4 },
      (_, index): SecurityFinding => ({
        ...toolFinding,
        id: `alert-${index}`,
        source: { index: 'alerts', id: `alert-${index}` },
        agent: { provider: 'google_adk', id: 'agent-runtime', sessionId: `session-${index}` },
      })
    );
    render(
      <RelationshipGraph
        {...graphProps}
        security={{ ...security, result: { ...securityResult, findings } }}
      />
    );
    expect(screen.getAllByTestId('entityGraphAgentSession')).toHaveLength(3);
    expect(screen.getByText('Sessions 1–3 of 4')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next agent sessions' }));
    expect(screen.getAllByTestId('entityGraphAgentSession')).toHaveLength(1);
    expect(screen.getByText('Sessions 4–4 of 4')).toBeInTheDocument();
    expect(screen.getByTestId('entityGraphSecuritySummary')).toHaveTextContent(
      '4 security findings'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Previous agent sessions' }));
    expect(screen.getAllByTestId('entityGraphAgentSession')).toHaveLength(3);
  });

  it.each(['isLoading', 'isRefreshing', 'unavailable'] as const)(
    'withholds the agent branch while evidence is %s',
    (state) => {
      const { rerender } = render(<RelationshipGraph {...graphProps} security={toolSecurity} />);
      fireEvent.click(
        screen.getByRole('button', { name: 'Inspect tool call export_case_summary' })
      );
      rerender(
        <RelationshipGraph
          {...graphProps}
          security={{ ...toolSecurity, result: { ...toolSecurity.result, [state]: true } }}
        />
      );
      expect(screen.queryByTestId('entityGraphAgentActivity')).not.toBeInTheDocument();
      expect(screen.queryByTestId('securityEventDetails')).not.toBeInTheDocument();
    }
  );

  it('applies graph time filters to agent activity and closes excluded tool details', () => {
    const older: SecurityFinding = { ...toolFinding, timestamp: '2026-10-01T20:00:00Z' };
    render(
      <RelationshipGraph
        {...graphProps}
        security={{ ...toolSecurity, result: { ...toolSecurity.result, findings: [older] } }}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Inspect tool call export_case_summary' }));
    fireEvent.change(screen.getByLabelText('Graph time range'), { target: { value: '24h' } });
    expect(screen.queryByTestId('entityGraphAgentActivity')).not.toBeInTheDocument();
    expect(screen.queryByTestId('securityEventDetails')).not.toBeInTheDocument();
    expect(screen.getByText('No security findings match graph filters')).toBeInTheDocument();
  });
});
