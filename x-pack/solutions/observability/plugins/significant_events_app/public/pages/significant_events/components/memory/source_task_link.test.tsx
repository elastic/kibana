/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { getSourceTaskPath, MemorySourceTaskLink } from './source_task_link';
import { useKibana } from '../../../../hooks/use_kibana';
import type { MemoryPage } from './types';

jest.mock('../../../../hooks/use_kibana');
const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

const page = (overrides: Partial<MemoryPage> = {}): MemoryPage => ({
  id: 'memory_kafka-lag',
  slug: 'kafka-lag',
  title: 'Kafka consumer lag',
  content: 'Scale the consumer.',
  tags: ['memory'],
  archived: false,
  categories: [],
  references: [],
  created_at: '',
  updated_at: '',
  created_by: '',
  updated_by: '',
  telemetry: { impressions: 1, conversions: 0, last_impression_time: '' },
  ...overrides,
});

const renderLink = (target: MemoryPage) =>
  render(
    <I18nProvider>
      <MemorySourceTaskLink page={target} />
    </I18nProvider>
  );

beforeEach(() => {
  jest.clearAllMocks();
  mockUseKibana.mockReturnValue({
    core: { http: { basePath: { prepend: (path: string) => `/base${path}` } } },
  } as unknown as ReturnType<typeof useKibana>);
});

describe('getSourceTaskPath', () => {
  it('uses the canonical agent-scoped route when both ids are known', () => {
    expect(getSourceTaskPath('conv-1', 'nightshift.investigation')).toBe(
      '/app/agent_builder/agents/nightshift.investigation/conversations/conv-1'
    );
  });

  it('falls back to the legacy unscoped route without an agent id', () => {
    expect(getSourceTaskPath('conv-1', undefined)).toBe('/app/agent_builder/conversations/conv-1');
    expect(getSourceTaskPath('conv-1', '')).toBe('/app/agent_builder/conversations/conv-1');
  });

  it('encodes the segments, so an id with a slash cannot address another route', () => {
    expect(getSourceTaskPath('a/b', 'c/d')).toBe(
      '/app/agent_builder/agents/c%2Fd/conversations/a%2Fb'
    );
  });
});

describe('MemorySourceTaskLink', () => {
  it('links to the conversation that produced the memory', () => {
    renderLink(page({ conversation_id: 'conv-1', agent_id: 'agent-1' }));

    expect(screen.getByTestId('nightshiftMemorySourceTaskLink')).toHaveAttribute(
      'href',
      '/base/app/agent_builder/agents/agent-1/conversations/conv-1'
    );
  });

  it('falls back to the legacy path for a memory written before agent_id existed', () => {
    renderLink(page({ conversation_id: 'conv-1' }));

    expect(screen.getByTestId('nightshiftMemorySourceTaskLink')).toHaveAttribute(
      'href',
      '/base/app/agent_builder/conversations/conv-1'
    );
  });

  it('renders nothing when the memory records no conversation', () => {
    renderLink(page());

    expect(screen.queryByTestId('nightshiftMemorySourceTaskLink')).not.toBeInTheDocument();
  });
});
