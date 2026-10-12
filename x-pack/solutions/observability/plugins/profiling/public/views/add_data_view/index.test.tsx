/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { AppHeaderTab } from '@kbn/app-header';
import type { EnabledProfilingStatus } from '@kbn/profiling-utils';
import { ProfilingSchema } from '@kbn/profiling-utils';

const mockPageTemplate = jest.fn();
let mockQuery: { selectedTab?: string; schema?: ProfilingSchema };

jest.mock('../../components/contexts/profiling_status/use_profiling_status');
jest.mock('../../components/profiling_app_page_template', () => ({
  ProfilingAppPageTemplate: ({
    children,
    ...props
  }: {
    children: React.ReactElement;
    tabs: AppHeaderTab[];
    suppressMenu: boolean;
  }) => {
    mockPageTemplate(props);
    return children;
  },
}));
jest.mock('../../hooks/use_profiling_params', () => ({
  useProfilingParams: () => ({ path: {}, query: mockQuery }),
}));
jest.mock('../../hooks/use_profiling_router', () => ({
  useProfilingRouter: () => ({
    // Like the actual router, leaves out undefined params
    link: (path: string, { query }: { query: Record<string, string | undefined> }) =>
      `${path}?${new URLSearchParams(
        Object.entries(query).flatMap(([key, value]) => (value === undefined ? [] : [[key, value]]))
      )}`,
  }),
}));
jest.mock('./otel/otel_add_data_instructions', () => ({
  OtelAddDataInstructions: () => <div data-test-subj="otelAddDataInstructions" />,
}));
jest.mock('./universal_profiling/universal_profiling_add_data', () => ({
  UniversalProfilingAddData: () => <div data-test-subj="universalProfilingAddData" />,
}));

import { AsyncStatus } from '../../hooks/use_async';
import { useProfilingStatus } from '../../components/contexts/profiling_status/use_profiling_status';
import { AddDataView, OTEL_TAB_LABEL, UNIVERSAL_PROFILING_TAB_LABEL } from '.';

const makeStatus = ({
  otel,
  universalProfiling,
}: {
  otel?: Partial<EnabledProfilingStatus['otel']>;
  universalProfiling?: Partial<EnabledProfilingStatus['universalProfiling']>;
}): EnabledProfilingStatus => ({
  isEnabled: true,
  otel: { isAvailable: true, hasData: false, ...otel },
  universalProfiling: {
    isAvailable: true,
    hasSetup: true,
    hasData: false,
    hasLegacyData: false,
    canSetup: true,
    ...universalProfiling,
  },
});

const unavailableUniversalProfiling = makeStatus({
  universalProfiling: { isAvailable: false, hasSetup: false, canSetup: false },
});

describe('AddDataView', () => {
  const renderView = ({
    schema,
    selectedTab,
    status = makeStatus({}),
  }: {
    schema?: ProfilingSchema;
    selectedTab?: string;
    status?: EnabledProfilingStatus;
  }) => {
    mockQuery = { selectedTab, schema };
    (useProfilingStatus as jest.Mock).mockReturnValue({
      status: AsyncStatus.Settled,
      data: status,
      refresh: jest.fn(),
    });
    render(<AddDataView />);
  };

  const getPageTemplateProps = () => mockPageTemplate.mock.calls[0][0];

  const getSelectedTabLabels = () =>
    getPageTemplateProps()
      .tabs.filter(({ isSelected }: AppHeaderTab) => isSelected)
      .map(({ label }: AppHeaderTab) => label);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows a tab per schema, OpenTelemetry first, keeping the selected Universal Profiling sub-tab', () => {
    renderView({ schema: ProfilingSchema.ECS, selectedTab: 'docker' });

    expect(getPageTemplateProps().tabs).toEqual([
      expect.objectContaining({
        label: OTEL_TAB_LABEL,
        href: '/add-data-instructions?schema=otel',
      }),
      expect.objectContaining({
        label: UNIVERSAL_PROFILING_TAB_LABEL,
        href: '/add-data-instructions?schema=ecs&selectedTab=docker',
      }),
    ]);
  });

  it('links to the Universal Profiling tab without a sub-tab when none is selected', () => {
    renderView({});

    expect(getPageTemplateProps().tabs).toEqual([
      expect.objectContaining({ href: '/add-data-instructions?schema=otel' }),
      expect.objectContaining({ href: '/add-data-instructions?schema=ecs' }),
    ]);
  });

  it.each([
    ['no schema', undefined],
    ['the OpenTelemetry schema', ProfilingSchema.OTEL],
  ])('shows the OpenTelemetry instructions with %s', (_name, schema) => {
    renderView({ schema });

    expect(getSelectedTabLabels()).toEqual([OTEL_TAB_LABEL]);
    expect(screen.getByTestId('otelAddDataInstructions')).toBeInTheDocument();
    expect(screen.queryByTestId('universalProfilingAddData')).not.toBeInTheDocument();
  });

  it('shows the Universal Profiling content with the Universal Profiling schema', () => {
    renderView({ schema: ProfilingSchema.ECS });

    expect(getSelectedTabLabels()).toEqual([UNIVERSAL_PROFILING_TAB_LABEL]);
    expect(screen.getByTestId('universalProfilingAddData')).toBeInTheDocument();
    expect(screen.queryByTestId('otelAddDataInstructions')).not.toBeInTheDocument();
  });

  it.each([
    ['no schema', undefined],
    ['the Universal Profiling schema', ProfilingSchema.ECS],
  ])(
    'only shows the OpenTelemetry instructions, without tabs, with %s when Universal Profiling is unavailable',
    (_name, schema) => {
      renderView({ schema, status: unavailableUniversalProfiling });

      expect(getPageTemplateProps().tabs).toEqual([]);
      expect(screen.getByTestId('otelAddDataInstructions')).toBeInTheDocument();
      expect(screen.queryByTestId('universalProfilingAddData')).not.toBeInTheDocument();
    }
  );

  it.each([
    ['there is no data', makeStatus({})],
    [
      'there is data from before 8.9.1',
      makeStatus({ otel: { hasData: true }, universalProfiling: { hasLegacyData: true } }),
    ],
  ])('hides the menu when %s', (_name, status) => {
    renderView({ status });

    expect(getPageTemplateProps().suppressMenu).toBe(true);
  });

  it('shows the menu when there is data', () => {
    renderView({ status: makeStatus({ otel: { hasData: true } }) });

    expect(getPageTemplateProps().suppressMenu).toBe(false);
  });
});
