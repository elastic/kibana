/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

jest.mock('@kbn/control-group-renderer', () => ({
  ControlGroupRenderer: jest.fn().mockImplementation((props) => {
    capturedProps.current = props;
    return <div data-test-subj="control-group-renderer" />;
  }),
}));

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(),
}));

jest.mock('@kbn/observability-shared-plugin/public', () => ({
  useControlPanels: jest.fn(() => [{}, jest.fn()]),
}));

jest.mock('../../hooks/use_unified_search', () => ({
  useUnifiedSearchContext: jest.fn(() => ({ onPreferredSchemaChange: jest.fn() })),
}));

jest.mock('../../../../../hooks/use_time_range_metadata', () => ({
  useTimeRangeMetadataContext: jest.fn(() => ({ status: 'success' })),
}));

jest.mock('../../../../../components/schema_selector', () => ({
  SchemaSelector: () => null,
}));

const useKibanaMock = useKibana as jest.Mock;

const baseProps = {
  dataView: { id: 'infra-data-view' } as DataView,
  timeRange: { from: 'now-15m', to: 'now' },
  filters: [],
  query: { query: '', language: 'kuery' as const },
  schema: null,
  schemas: [],
  onFiltersChange: jest.fn(),
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
      getProjectRouting$: jest.fn(() => projectRouting$),
      getProjectRouting: jest.fn(() => projectRouting$.getValue()),
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
