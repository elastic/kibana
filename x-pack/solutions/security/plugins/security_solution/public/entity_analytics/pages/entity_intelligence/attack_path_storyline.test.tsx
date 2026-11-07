/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { EntityType } from '../../../../common/entity_analytics/types';
import type { IntelligenceEntity } from './common';
import type { AttackPath } from './attack_path_model';
import { AttackPathStoryline } from './attack_path_storyline';

const mockUseAttackPath = jest.fn();

jest.mock('./hooks/use_attack_path', () => ({
  useAttackPath: (params: unknown) => mockUseAttackPath(params),
}));

const entity: IntelligenceEntity = {
  id: 'host-docker',
  name: 'docker-host-prod-01',
  type: EntityType.host,
  identifierValue: 'docker-host-prod-01',
  riskScoreNorm: 91,
  riskLevel: 'Critical',
  criticality: 'high_impact',
  source: undefined,
  lastSeen: undefined,
};

const path: AttackPath = {
  spine: [
    {
      id: 'origin',
      name: 'Internet',
      kind: 'origin',
      identifierValue: 'origin',
      alertCount: 0,
      worstSeverity: undefined,
      stage: undefined,
      transition: undefined,
    },
    {
      id: `${EntityType.host}:docker-host-prod-01`,
      name: 'docker-host-prod-01',
      kind: EntityType.host,
      identifierValue: 'docker-host-prod-01',
      alertCount: 11,
      worstSeverity: 'critical',
      stage: 'initial-access',
      transition: undefined,
    },
    {
      id: `${EntityType.user}:a.rodriguez`,
      name: 'a.rodriguez',
      kind: EntityType.user,
      identifierValue: 'a.rodriguez',
      alertCount: 5,
      worstSeverity: 'critical',
      stage: 'execution',
      transition: 'spawned process docker',
    },
  ],
  stages: [
    {
      stage: 'initial-access',
      label: 'Initial Access',
      nodeIds: [`${EntityType.host}:docker-host-prod-01`],
    },
    { stage: 'execution', label: 'Execution', nodeIds: [`${EntityType.user}:a.rodriguez`] },
  ],
  annotations: [
    {
      id: 'annotation:a1',
      nodeId: `${EntityType.host}:docker-host-prod-01`,
      kind: 'alert',
      text: 'Untrusted Container Image Deployed on Production Host',
      severity: 'critical',
      above: true,
    },
  ],
  crownJewels: [
    {
      id: 'jewel:crit:docker',
      nodeId: `${EntityType.host}:docker-host-prod-01`,
      name: 'docker-host-prod-01',
      kind: 'sensitive-host',
      reason: 'Asset criticality: high impact',
      severity: 'critical',
      reachedFrom: 'docker-host-prod-01',
      alertCount: 11,
    },
  ],
  isSparse: false,
};

const baseProps = {
  entity,
  onInspectEntity: jest.fn(),
  onEvidenceOpen: jest.fn(),
  isExternalDrawerOpen: false,
};

const mockPath = (over: Partial<ReturnType<typeof mockUseAttackPath>> = {}) =>
  mockUseAttackPath.mockReturnValue({
    path,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
    ...over,
  });

const renderStoryline = (props: Partial<React.ComponentProps<typeof AttackPathStoryline>> = {}) =>
  render(
    <I18nProvider>
      <AttackPathStoryline {...baseProps} {...props} />
    </I18nProvider>
  );

describe('AttackPathStoryline', () => {
  beforeEach(() => {
    mockUseAttackPath.mockReset();
    (global as unknown as { ResizeObserver: unknown }).ResizeObserver = jest
      .fn()
      .mockImplementation(() => ({
        observe: jest.fn(),
        disconnect: jest.fn(),
        unobserve: jest.fn(),
      }));
  });

  it('renders a loading spinner before the path resolves', () => {
    mockPath({ path: undefined, isLoading: true });
    renderStoryline();
    expect(screen.getByTestId('entityIntelligenceAttackPath')).toBeInTheDocument();
  });

  it('renders an error state with a retry', () => {
    const refetch = jest.fn();
    mockPath({ path: undefined, isError: true, refetch });
    renderStoryline();
    fireEvent.click(screen.getByText('Retry'));
    expect(refetch).toHaveBeenCalled();
  });

  it('renders the horizontal spine with origin, focus, and pivots', () => {
    mockPath();
    renderStoryline();
    expect(screen.getByTestId('entityIntelligenceAttackPathNode-Internet')).toBeInTheDocument();
    expect(
      screen.getByTestId('entityIntelligenceAttackPathNode-docker-host-prod-01')
    ).toBeInTheDocument();
    expect(screen.getByTestId('entityIntelligenceAttackPathNode-a.rodriguez')).toBeInTheDocument();
  });

  it('docks grounded findings on the node and renders crown-jewel resource nodes', () => {
    mockPath();
    renderStoryline();
    // Crown-jewel / resource leaf renders as its own node.
    expect(screen.getAllByTestId('entityIntelligenceAttackPathJewel').length).toBeGreaterThan(0);
    // The grounded alert rule name is docked to its node as a finding chip.
    expect(screen.getAllByText(/Untrusted Container Image Deployed/).length).toBeGreaterThan(0);
  });

  it('opens a spine entity in the dossier when a node is selected', () => {
    const onInspectEntity = jest.fn();
    const onEvidenceOpen = jest.fn();
    mockPath();
    renderStoryline({ onInspectEntity, onEvidenceOpen });
    fireEvent.click(screen.getByTestId('entityIntelligenceAttackPathNode-a.rodriguez'));
    expect(onInspectEntity).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'a.rodriguez', kind: EntityType.user })
    );
    expect(onEvidenceOpen).toHaveBeenCalled();
  });

  it('does not inspect the non-entity origin node', () => {
    const onInspectEntity = jest.fn();
    mockPath();
    renderStoryline({ onInspectEntity });
    fireEvent.click(screen.getByTestId('entityIntelligenceAttackPathNode-Internet'));
    expect(onInspectEntity).not.toHaveBeenCalled();
  });

  it('opens a lightweight grounded detail when a crown-jewel leaf is clicked', () => {
    mockPath();
    renderStoryline();
    expect(screen.queryByTestId('entityIntelligenceAttackPathLeafDetail')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('entityIntelligenceAttackPathJewel'));
    const detail = screen.getByTestId('entityIntelligenceAttackPathLeafDetail');
    expect(detail).toBeInTheDocument();
    // The detail is grounded in the leaf's real reason + parent linkage.
    expect(within(detail).getByText(/Asset criticality/)).toBeInTheDocument();
    expect(within(detail).getByText(/Associated with docker-host-prod-01/)).toBeInTheDocument();
  });

  it('assembles a grounded prompt and opens the explain flyout', () => {
    const onExplain = jest.fn();
    mockPath();
    renderStoryline({ onExplain });
    fireEvent.click(screen.getByTestId('entityIntelligenceAttackPathExplain'));
    expect(onExplain).toHaveBeenCalledTimes(1);
    const [prompt, subtitle] = onExplain.mock.calls[0];
    expect(prompt).toContain('Correlated entities: Internet, docker-host-prod-01, a.rodriguez');
    expect(prompt).toContain('not a causal sequence');
    expect(prompt).not.toContain('→');
    expect(prompt).toContain('never invent specifics');
    expect(subtitle).toContain('docker-host-prod-01');
  });

  it('shows a sparse fallback message when there is no correlated activity', () => {
    mockPath({
      path: {
        ...path,
        spine: path.spine.slice(0, 2),
        stages: [],
        annotations: [],
        crownJewels: [],
        isSparse: true,
      },
    });
    renderStoryline();
    expect(screen.getByTestId('entityIntelligenceAttackPathSparse')).toBeInTheDocument();
    expect(screen.getByText(/No correlated activity found/)).toBeInTheDocument();
  });
});
