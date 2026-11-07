/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { DirectiveHuntArtifact } from './hunt_directive_artifacts';
import { HuntDirectiveArtifactView } from './hunt_directive_views';

const renderArtifact = (artifact: DirectiveHuntArtifact) =>
  render(<HuntDirectiveArtifactView artifact={artifact} />);

describe('HuntDirectiveArtifactView', () => {
  it('renders an entity_card with grounded facts and provenance', () => {
    renderArtifact({
      id: 'a1',
      type: 'directive',
      directiveType: 'entity_card',
      provenance: 'Grounded in this hunt’s query results',
      data: {
        type: 'entity_card',
        title: 'svc-backup',
        name: 'svc-backup',
        entityType: 'user',
        riskLevel: 'High',
        riskScore: 78,
        alertCount: 3,
      },
    });
    expect(screen.getByTestId('entityIntelligenceHuntArtifact-entity_card')).toBeInTheDocument();
    // Name appears in both the card title and body.
    expect(screen.getAllByText('svc-backup').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('High (78)')).toBeInTheDocument();
    expect(screen.getByText(/Grounded in this hunt/)).toBeInTheDocument();
  });

  it('renders an alert_table with rows', () => {
    renderArtifact({
      id: 'a2',
      type: 'directive',
      directiveType: 'alert_table',
      provenance: 'Grounded in this hunt’s query results',
      data: {
        type: 'alert_table',
        title: 'Related alerts',
        rows: [{ rule: 'Brute force', severity: 'high', entity: 'bob', timestamp: undefined }],
      },
    });
    expect(screen.getByTestId('entityIntelligenceHuntArtifactAlertTable')).toBeInTheDocument();
    expect(screen.getByText('Brute force')).toBeInTheDocument();
  });

  it('renders a risk_gauge with the grounded score', () => {
    renderArtifact({
      id: 'a3',
      type: 'directive',
      directiveType: 'risk_gauge',
      provenance: 'Grounded in this hunt’s query results',
      data: {
        type: 'risk_gauge',
        title: 'alice risk',
        name: 'alice',
        score: 93,
        level: 'Critical',
      },
    });
    expect(screen.getByTestId('entityIntelligenceHuntArtifactRiskGauge')).toBeInTheDocument();
    expect(screen.getByText('93')).toBeInTheDocument();
  });

  it('renders a mitre_strip of techniques', () => {
    renderArtifact({
      id: 'a4',
      type: 'directive',
      directiveType: 'mitre_strip',
      provenance: 'Grounded in this hunt’s query results',
      data: {
        type: 'mitre_strip',
        title: 'Observed ATT&CK techniques',
        techniques: [{ id: 'T1078', name: 'Valid Accounts', count: 2 }],
      },
    });
    expect(screen.getByTestId('entityIntelligenceHuntArtifactMitreStrip')).toBeInTheDocument();
    expect(screen.getByText(/Valid Accounts/)).toBeInTheDocument();
  });

  it('renders an attack_path with ordered steps', () => {
    renderArtifact({
      id: 'a5',
      type: 'directive',
      directiveType: 'attack_path',
      provenance: 'Grounded in this hunt’s query results',
      data: {
        type: 'attack_path',
        title: 'Observed activity chain',
        steps: [
          { label: 'Initial access', severity: 'high' },
          { label: 'Lateral movement', severity: 'critical' },
        ],
      },
    });
    expect(screen.getByTestId('entityIntelligenceHuntArtifactAttackPath')).toBeInTheDocument();
    expect(screen.getByText('Initial access')).toBeInTheDocument();
    expect(screen.getByText('Lateral movement')).toBeInTheDocument();
  });

  it('renders a sankey of flows', () => {
    renderArtifact({
      id: 'a6',
      type: 'directive',
      directiveType: 'sankey',
      provenance: 'Grounded in this hunt’s query results',
      data: {
        type: 'sankey',
        title: 'Observed flows',
        links: [{ source: '10.0.0.1', target: '10.0.0.2', value: 4 }],
      },
    });
    expect(screen.getByTestId('entityIntelligenceHuntArtifactSankey')).toBeInTheDocument();
    expect(screen.getByText('10.0.0.1')).toBeInTheDocument();
  });

  it('renders a metric_row', () => {
    renderArtifact({
      id: 'a7',
      type: 'directive',
      directiveType: 'metric_row',
      provenance: 'Grounded in this hunt’s query results',
      data: {
        type: 'metric_row',
        title: 'At a glance',
        metrics: [
          { label: 'Alerts', value: '12' },
          { label: 'Users', value: '3' },
        ],
      },
    });
    expect(screen.getByTestId('entityIntelligenceHuntArtifactMetricRow')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('Alerts')).toBeInTheDocument();
  });
});
