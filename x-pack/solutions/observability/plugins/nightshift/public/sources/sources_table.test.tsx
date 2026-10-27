/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import {
  SignificantEventsWorkflowStatus,
  type SignificantEventsWorkflowStatusResult,
} from '@kbn/significant-events-schema';
import { SourcesTable } from './sources_table';

jest.mock('../hooks/use_kibana', () => ({ useKibana: () => ({ services: { cps: undefined } }) }));
jest.mock('@kbn/cps-utils', () => ({ useIsCpsMultiProject: () => false }));
jest.mock('./knowledge_indicators_column', () => ({ KnowledgeIndicatorsColumn: () => null }));
jest.mock('./queries_column', () => ({ QueriesColumn: () => null }));
jest.mock('./significant_events_column', () => ({ SignificantEventsColumn: () => null }));
jest.mock('./source_actions_column', () => ({ SourceActionsColumn: () => null }));

const source: NightshiftSource = {
  id: 'source-1',
  title: 'Nginx errors',
  tags: [],
  esql: 'FROM logs-nginx-*',
  type: 'logs',
  slug: 'nginx-errors',
  view_name: '$.nightshift.sources.default.nginx-errors',
  enabled: true,
  created_by: 'marco',
  created_at: '2026-09-01T00:00:00.000Z',
  updated_at: '2026-09-01T00:00:00.000Z',
  esql_updated_at: '2026-09-01T00:00:00.000Z',
};

const completedRun: SignificantEventsWorkflowStatusResult = {
  status: SignificantEventsWorkflowStatus.Completed,
  executionId: 'run-1',
};

const renderTable = (
  props: Partial<React.ComponentProps<typeof SourcesTable>> & {
    onboardingResultMap: Record<string, SignificantEventsWorkflowStatusResult>;
  }
) =>
  render(
    <SourcesTable
      sources={[source]}
      searchText=""
      canManage={false}
      onOpenSource={jest.fn()}
      onToggleSourceEnabled={jest.fn()}
      onOnboardSource={jest.fn()}
      onStopOnboarding={jest.fn()}
      onDeleteSource={jest.fn()}
      {...props}
    />
  );

describe('SourcesTable onboarding status', () => {
  it('shows a spinner while the source is generating', () => {
    renderTable({
      onboardingResultMap: { 'source-1': completedRun },
      generatingSourceIds: ['source-1'],
    });

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows no status, and no spinner, while a source waits for a run that may not come', () => {
    renderTable({
      onboardingResultMap: { 'source-1': completedRun },
      awaitingRunSourceIds: ['source-1'],
    });

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('shows the recorded status once nothing is awaited', () => {
    renderTable({ onboardingResultMap: { 'source-1': completedRun } });

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.queryByText('-')).not.toBeInTheDocument();
  });
});
