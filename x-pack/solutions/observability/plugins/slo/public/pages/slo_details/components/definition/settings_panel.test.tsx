/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen } from '@testing-library/react';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
import { ALL_PROJECT_ROUTING, LOCAL_PROJECT_ROUTING } from '../../../../../common/project_routings';
import { buildSlo } from '../../../../data/slo/slo';
import { usePluginContext } from '../../../../hooks/use_plugin_context';
import { pluginContextDefaultValue, render } from '../../../../utils/test_helper';
import { SettingsPanel } from './settings_panel';

jest.mock('../../../../hooks/use_plugin_context');

const usePluginContextMock = usePluginContext as jest.Mock;

function mockServerless(isServerless: boolean) {
  usePluginContextMock.mockReturnValue({
    ...pluginContextDefaultValue,
    isServerless,
  });
}

function sloWithSettings(settings: SLOWithSummaryResponse['settings']): SLOWithSummaryResponse {
  const slo = buildSlo();
  return { ...slo, settings };
}

describe('SettingsPanel project scope', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockServerless(true);
  });

  it('hides the project scope row on stateful', () => {
    mockServerless(false);
    render(<SettingsPanel slo={buildSlo()} />);

    expect(screen.queryByText('Project scope')).toBeNull();
  });

  it('shows This project when neither routing field is stored', () => {
    const slo = buildSlo();
    render(
      <SettingsPanel
        slo={sloWithSettings({
          syncDelay: slo.settings.syncDelay,
          frequency: slo.settings.frequency,
          preventInitialBackfill: slo.settings.preventInitialBackfill,
        })}
      />
    );

    expect(screen.getByText('Project scope')).toBeTruthy();
    expect(screen.getByText('This project')).toBeTruthy();
  });

  it('shows This project for legacy preventCrossProjectSearch true', () => {
    const slo = buildSlo();
    render(
      <SettingsPanel
        slo={sloWithSettings({
          ...slo.settings,
          preventCrossProjectSearch: true,
        })}
      />
    );

    expect(screen.getByText('This project')).toBeTruthy();
  });

  it('shows This project for origin-only projectRoutings', () => {
    const slo = buildSlo();
    render(
      <SettingsPanel
        slo={sloWithSettings({
          ...slo.settings,
          projectRoutings: LOCAL_PROJECT_ROUTING,
        })}
      />
    );

    expect(screen.getByText('This project')).toBeTruthy();
  });

  it('shows All projects for legacy preventCrossProjectSearch false', () => {
    render(<SettingsPanel slo={buildSlo()} />);

    expect(screen.getByText('All projects')).toBeTruthy();
  });

  it('shows All projects for all-projects projectRoutings', () => {
    const slo = buildSlo();
    render(
      <SettingsPanel
        slo={sloWithSettings({
          ...slo.settings,
          projectRoutings: ALL_PROJECT_ROUTING,
        })}
      />
    );

    expect(screen.getByText('All projects')).toBeTruthy();
  });

  it('shows N projects for an explicit selected-id expression', () => {
    const slo = buildSlo();
    render(
      <SettingsPanel
        slo={sloWithSettings({
          ...slo.settings,
          projectRoutings: '_id:p1 OR _id:p2',
        })}
      />
    );

    expect(screen.getByText('2 projects')).toBeTruthy();
  });

  it('shows a custom label when selected project ids are empty', () => {
    const slo = buildSlo();
    render(
      <SettingsPanel
        slo={sloWithSettings({
          ...slo.settings,
          projectRoutings: 'env:prod',
        })}
      />
    );

    expect(screen.getByText('Custom')).toBeTruthy();
  });
});
