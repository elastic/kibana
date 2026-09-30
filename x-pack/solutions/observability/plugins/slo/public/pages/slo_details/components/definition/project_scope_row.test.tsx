/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDescriptionList } from '@elastic/eui';
import type { CPSProject } from '@kbn/cps-utils';
import { useFetchProjects } from '@kbn/cps-utils';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { fireEvent, screen } from '@testing-library/react';
import React from 'react';
import { ALL_PROJECT_ROUTING, LOCAL_PROJECT_ROUTING } from '../../../../../common/project_routings';
import { buildSlo } from '../../../../data/slo/slo';
import { useKibana } from '../../../../hooks/use_kibana';
import { usePluginContext } from '../../../../hooks/use_plugin_context';
import { pluginContextDefaultValue, render } from '../../../../utils/test_helper';
import { ProjectScopeRow } from './project_scope_row';

jest.mock('../../../../hooks/use_plugin_context');
jest.mock('../../../../hooks/use_kibana');
jest.mock('@kbn/cps-utils', () => {
  const actual = jest.requireActual('@kbn/cps-utils');
  const mockReact = jest.requireActual('react');
  return {
    ...actual,
    useFetchProjects: jest.fn(),
    ProjectPickerContent: () =>
      mockReact.createElement('div', { 'data-test-subj': 'mockProjectPickerContent' }),
  };
});

const usePluginContextMock = usePluginContext as jest.Mock;
const useKibanaMock = useKibana as jest.Mock;
const useFetchProjectsMock = useFetchProjects as jest.Mock;

const ORIGIN_PROJECT: CPSProject = {
  _id: 'origin-1',
  _alias: 'origin-alias',
  _type: 'observability',
  _organisation: 'org',
};

const LINKED_PROJECT: CPSProject = {
  _id: 'linked-1',
  _alias: 'linked-alias',
  _type: 'observability',
  _organisation: 'org',
};

function mockGate(options?: {
  isServerless?: boolean;
  isTierEligible?: boolean;
  hasManager?: boolean;
  totalProjectCount?: number;
}) {
  usePluginContextMock.mockReturnValue({
    ...pluginContextDefaultValue,
    isServerless: options?.isServerless ?? true,
  });

  useKibanaMock.mockReturnValue({
    services: {
      cps: {
        isTierEligible: options?.isTierEligible ?? true,
        cpsManager:
          options?.hasManager === false
            ? undefined
            : {
                fetchProjects: jest.fn().mockResolvedValue(null),
                getTotalProjectCount: jest.fn().mockReturnValue(options?.totalProjectCount ?? 2),
              },
      },
    },
  });
}

function mockFetchProjects(options?: {
  originProject?: CPSProject | null;
  linkedProjects?: CPSProject[];
  isLoading?: boolean;
  error?: Error | null;
}) {
  useFetchProjectsMock.mockReturnValue({
    originProject: options?.originProject === undefined ? ORIGIN_PROJECT : options.originProject,
    linkedProjects: options?.linkedProjects ?? [LINKED_PROJECT],
    isLoading: options?.isLoading ?? false,
    error: options?.error ?? null,
  });
}

function renderRow(settings?: Partial<SLOWithSummaryResponse['settings']>) {
  const slo = buildSlo();
  const sloWithSettings: SLOWithSummaryResponse = settings
    ? { ...slo, settings: { ...slo.settings, ...settings } }
    : slo;

  render(
    <EuiDescriptionList>
      <ProjectScopeRow slo={sloWithSettings} />
    </EuiDescriptionList>
  );
}

describe('ProjectScopeRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGate();
    mockFetchProjects();
  });

  it('is hidden when not serverless', () => {
    mockGate({ isServerless: false });
    renderRow();

    expect(screen.queryByText('Project scope')).not.toBeInTheDocument();
  });

  it('is hidden when tier is not eligible for CPS', () => {
    mockGate({ isTierEligible: false });
    renderRow();

    expect(screen.queryByText('Project scope')).not.toBeInTheDocument();
  });

  it('is hidden when cpsManager is absent', () => {
    mockGate({ hasManager: false });
    renderRow();

    expect(screen.queryByText('Project scope')).not.toBeInTheDocument();
  });

  it('shows All projects when neither routing field is stored', () => {
    renderRow({ preventCrossProjectSearch: undefined });

    expect(screen.getByText('Project scope')).toBeInTheDocument();
    expect(screen.getByText('All projects')).toBeInTheDocument();
  });

  it('shows This project for legacy preventCrossProjectSearch true', () => {
    renderRow({ preventCrossProjectSearch: true });

    expect(screen.getByText('This project')).toBeInTheDocument();
  });

  it('shows This project for origin-only projectRoutings', () => {
    renderRow({ projectRoutings: LOCAL_PROJECT_ROUTING });

    expect(screen.getByText('This project')).toBeInTheDocument();
  });

  it('shows All projects for legacy preventCrossProjectSearch false', () => {
    renderRow();

    expect(screen.getByText('All projects')).toBeInTheDocument();
  });

  it('shows All projects for all-projects projectRoutings', () => {
    renderRow({ projectRoutings: ALL_PROJECT_ROUTING });

    expect(screen.getByText('All projects')).toBeInTheDocument();
  });

  it('resolves a custom routing to a server-side project count', () => {
    renderRow({ projectRoutings: '_id:origin-1 OR _id:linked-1' });

    expect(useFetchProjectsMock).toHaveBeenCalledWith(
      expect.any(Function),
      '_id:origin-1 OR _id:linked-1'
    );
    expect(screen.getByText('2/2 projects')).toBeInTheDocument();
  });

  it('reports an unresolvable custom routing as unavailable', () => {
    mockFetchProjects({ error: new Error('boom') });
    renderRow({ projectRoutings: '_id:origin-1 OR _id:linked-1' });

    expect(screen.getByText('Project scope unavailable')).toBeInTheDocument();
  });

  it('opens the shared read-only picker content in a popover', () => {
    renderRow({ projectRoutings: ALL_PROJECT_ROUTING });

    fireEvent.click(screen.getByTestId('sloDetailsProjectScopeButton'));

    expect(screen.getByTestId('mockProjectPickerContent')).toBeInTheDocument();
  });

  it('renders a plain label when there is only one project', () => {
    mockGate({ totalProjectCount: 1 });
    renderRow({ projectRoutings: ALL_PROJECT_ROUTING });

    expect(screen.getByTestId('sloDetailsProjectScope')).toBeInTheDocument();
    expect(screen.queryByTestId('sloDetailsProjectScopeButton')).not.toBeInTheDocument();
  });
});
