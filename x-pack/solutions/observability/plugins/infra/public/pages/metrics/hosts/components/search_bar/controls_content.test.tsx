/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { act, render } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { BehaviorSubject } from 'rxjs';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { ControlGroupRendererProps } from '@kbn/control-group-renderer';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { cpsPluginMock } from '@kbn/cps/public/mocks';
import { ControlsContent } from './controls_content';

const capturedProps: { current?: ControlGroupRendererProps } = {};

vi.mock('@kbn/control-group-renderer', () => {
  const mocked = {
    ControlGroupRenderer: vi.fn().mockImplementation((props) => {
      capturedProps.current = props;
      return <div data-test-subj="control-group-renderer" />;
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('@kbn/kibana-react-plugin/public', () => {
  const mocked = {
    useKibana: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('@kbn/observability-shared-plugin/public', () => {
  const mocked = {
    useControlPanels: vi.fn(() => [{}, vi.fn()]),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../hooks/use_unified_search', () => {
  const mocked = {
    useUnifiedSearchContext: vi.fn(() => ({ onPreferredSchemaChange: vi.fn() })),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../../../hooks/use_time_range_metadata', () => {
  const mocked = {
    useTimeRangeMetadataContext: vi.fn(() => ({ status: 'success' })),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../../../components/schema_selector', () => {
  const mocked = {
    SchemaSelector: () => null,
  };
  return { ...mocked, default: mocked };
});

const useKibanaMock = useKibana as Mock;

const baseProps = {
  dataView: { id: 'infra-data-view' } as DataView,
  timeRange: { from: 'now-15m', to: 'now' },
  filters: [],
  query: { query: '', language: 'kuery' as const },
  schema: null,
  schemas: [],
  onFiltersChange: vi.fn(),
};

const renderControlsContent = () =>
  render(
    <EuiThemeProvider>
      <ControlsContent {...baseProps} />
    </EuiThemeProvider>
  );

describe('ControlsContent', () => {
  beforeEach(() => {
    capturedProps.current = undefined;
  });

  it('forwards the active CPS project routing to ControlGroupRenderer', () => {
    const projectRouting$ = new BehaviorSubject<string | undefined>('_alias:*');
    const cpsManager = {
      ...cpsPluginMock.createStartContract().cpsManager,
      getProjectRouting$: vi.fn(() => projectRouting$),
      getProjectRouting: vi.fn(() => projectRouting$.getValue()),
    };
    useKibanaMock.mockReturnValue({ services: { cps: { cpsManager } } });

    renderControlsContent();

    expect(capturedProps.current?.projectRouting).toBe('_alias:*');

    act(() => {
      projectRouting$.next('_alias:_origin');
    });

    expect(capturedProps.current?.projectRouting).toBe('_alias:_origin');
  });

  it('passes undefined projectRouting when the CPS plugin is unavailable', () => {
    useKibanaMock.mockReturnValue({ services: {} });

    renderControlsContent();

    expect(capturedProps.current).toBeDefined();
    expect(capturedProps.current?.projectRouting).toBeUndefined();
  });
});
