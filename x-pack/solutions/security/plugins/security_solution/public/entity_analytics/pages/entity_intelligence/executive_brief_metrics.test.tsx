/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EntityType } from '../../../../common/entity_analytics/types';
import type { ExecutiveBriefCoverage } from './executive_brief_agents';
import { ExecutiveBriefMetrics } from './executive_brief_metrics';
import type { ExecutiveBriefMetricsProps } from './executive_brief_metrics';

const coverage: ExecutiveBriefCoverage = {
  entityStore: 'available',
  entities: 'available',
  detections: 'available',
  anomalies: 'available',
  huntingLeads: 'available',
};
const emptyMetrics: ExecutiveBriefMetricsProps = {
  kpis: [],
  riskBands: [],
  riskTypes: [],
  topRisks: [],
  killChain: { steps: [], totalTactics: 15, observedTacticCount: 0, observedTechniqueCount: 0 },
};

it('distinguishes unavailable sources from a successfully observed empty snapshot', () => {
  render(
    <ExecutiveBriefMetrics
      {...emptyMetrics}
      coverage={{
        ...coverage,
        entityStore: 'unavailable',
        entities: 'unavailable',
        detections: 'unavailable',
      }}
    />
  );
  expect(screen.getAllByText('Evidence unavailable for this snapshot.')).toHaveLength(4);
  expect(
    screen.queryByText('No material-risk entities in the current snapshot.')
  ).not.toBeInTheDocument();
  expect(
    screen.queryByText('No MITRE tactics observed in material-risk alerts.')
  ).not.toBeInTheDocument();
  expect(screen.queryByText('No scored entities to rank.')).not.toBeInTheDocument();
});

it('keeps successfully queried zero results explicit', () => {
  render(<ExecutiveBriefMetrics {...emptyMetrics} coverage={coverage} />);
  expect(screen.getAllByText('No material-risk entities in the current snapshot.')).toHaveLength(2);
  expect(
    screen.getByText('No MITRE tactics observed in material-risk alerts.')
  ).toBeInTheDocument();
  expect(screen.getByText('No scored entities to rank.')).toBeInTheDocument();
  expect(screen.queryByText('Evidence unavailable for this snapshot.')).not.toBeInTheDocument();
});

it('hides stale details and KPIs independently while preserving readable entity evidence', () => {
  render(
    <ExecutiveBriefMetrics
      {...emptyMetrics}
      coverage={{ ...coverage, entityStore: 'unavailable', detections: 'unavailable' }}
      kpis={[
        { id: 'materialRisk', value: 938, format: 'count', delta: undefined },
        { id: 'tacticsObserved', value: 936, format: 'count', delta: undefined },
      ]}
      riskBands={[{ level: 'High', count: 938, percentage: 100 }]}
      riskTypes={[{ type: EntityType.host, count: 938, percentage: 100 }]}
      topRisks={[
        {
          id: 'host:one',
          name: 'Readable host',
          type: EntityType.host,
          score: 75,
          level: 'High',
          criticality: undefined,
        },
      ]}
      killChain={{
        steps: [
          {
            tacticId: 'TA0008',
            tacticName: 'Stale tactic',
            alertCount: 936,
            topTechnique: undefined,
          },
        ],
        totalTactics: 15,
        observedTacticCount: 1,
        observedTechniqueCount: 0,
      }}
    />
  );
  expect(screen.queryByText('938')).not.toBeInTheDocument();
  expect(screen.queryByText('936')).not.toBeInTheDocument();
  expect(screen.queryByText('Stale tactic')).not.toBeInTheDocument();
  expect(screen.getByText('Readable host')).toBeInTheDocument();
  expect(screen.getAllByText('Evidence unavailable for this snapshot.')).toHaveLength(3);
});

it('does not render clean-risk empty states for partial sources', () => {
  render(
    <ExecutiveBriefMetrics
      {...emptyMetrics}
      coverage={{ ...coverage, entityStore: 'partial', entities: 'partial', detections: 'partial' }}
    />
  );
  expect(screen.getAllByText('Evidence is incomplete for this snapshot.')).toHaveLength(4);
  expect(
    screen.queryByText('No material-risk entities in the current snapshot.')
  ).not.toBeInTheDocument();
  expect(
    screen.queryByText('No MITRE tactics observed in material-risk alerts.')
  ).not.toBeInTheDocument();
});
