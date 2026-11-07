/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BehaviorPanel } from './behavior_panel';
import { analyzeAgentBehavior } from './behavior';
import type { BehaviorUnit } from './behavior_types';

jest.mock('../../../../common/components/formatted_date', () => ({
  PreferenceFormattedDate: ({ value }: { value: Date }) => <time>{value.toISOString()}</time>,
}));
const source = { index: 'index', id: 'document' };
const unit = (id: string, startedAt: string): BehaviorUnit => ({
  id,
  agentId: 'agent',
  startedAt,
  source,
  toolsComplete: true,
  toolCalls: [],
  toolCallsComplete: false,
  toolSummary: {
    tools: [{ toolName: 'shell', count: 10, successCount: 10, failureCount: 0, unknownCount: 0 }],
  },
});
const analysis = () =>
  analyzeAgentBehavior({
    agentId: 'agent',
    unitKind: 'session',
    baseline: {
      start: '2026-10-01T00:00:00Z',
      end: '2026-10-10T00:00:00Z',
      coverage: 'complete',
      units: Array.from({ length: 5 }, (_, index) =>
        unit(`prior-${index}`, `2026-10-0${index + 1}T10:00:00Z`)
      ),
    },
    current: {
      start: '2026-10-10T00:00:00Z',
      end: '2026-10-11T00:00:00Z',
      coverage: 'complete',
      units: [
        {
          ...unit('current', '2026-10-10T00:00:00Z'),
          toolSummary: undefined,
          toolCallsComplete: true,
          toolCalls: Array.from({ length: 3 }, (_, index) => ({
            id: `call-${index}`,
            toolName: 'new_tool',
            timestamp: `2026-10-10T00:00:0${index}Z`,
            outcome: 'failure' as const,
            source: { ...source, id: `doc-${index}` },
          })),
        },
      ],
    },
  });

it('shows source evidence for an actual finding and filters reliability separately from tool novelty', () => {
  const onInspect = jest.fn();
  const result = analysis();
  render(<BehaviorPanel analysis={result} onInspect={onInspect} />);
  expect(screen.getByText('Repeated tool failures', { selector: 'strong' })).toBeInTheDocument();
  expect(screen.getByText('New tool in this baseline', { selector: 'strong' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Reliability' }));
  expect(
    screen.queryByText('New tool in this baseline', { selector: 'strong' })
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Inspect evidence' }));
  expect(onInspect).toHaveBeenCalledWith(
    result.findings.find((finding) => finding.kind === 'repeated_tool_failures')
  );
});

it('links tool mix to exact tool filtering without synthesizing a finding', () => {
  const onSelectTool = jest.fn();
  render(<BehaviorPanel analysis={analysis()} onInspect={jest.fn()} onSelectTool={onSelectTool} />);
  fireEvent.click(screen.getByRole('button', { name: 'new_tool' }));
  expect(onSelectTool).toHaveBeenCalledWith('new_tool');
});
