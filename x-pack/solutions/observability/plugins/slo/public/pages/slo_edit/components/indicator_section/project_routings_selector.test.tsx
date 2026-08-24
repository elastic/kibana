/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { CPSProject } from '@kbn/cps-utils';
import { useFetchProjects } from '@kbn/cps-utils';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { ALL_PROJECT_ROUTING, LOCAL_PROJECT_ROUTING } from '../../../../../common/project_routings';
import { useKibana } from '../../../../hooks/use_kibana';
import { usePluginContext } from '../../../../hooks/use_plugin_context';
import { pluginContextDefaultValue, render } from '../../../../utils/test_helper';
import type { CreateSLOForm } from '../../types';
import { ProjectRoutingsSelector } from './project_routings_selector';

jest.mock('../../../../hooks/use_plugin_context');
jest.mock('../../../../hooks/use_kibana');
const mockProjectScopePickerSpy = jest.fn();

jest.mock('@kbn/cps-utils', () => {
  const actual = jest.requireActual('@kbn/cps-utils');
  const mockReact = jest.requireActual('react');
  return {
    ...actual,
    useFetchProjects: jest.fn(),
    ProjectScopePicker: (props: {
      onProjectRoutingChange: (projectRouting: string) => void;
      originProjectId?: string;
    }) => {
      mockProjectScopePickerSpy(props);
      const { onProjectRoutingChange, originProjectId } = props;
      return mockReact.createElement('button', {
        type: 'button',
        'data-test-subj': 'mockProjectScopePicker',
        onClick: () => {
          if (originProjectId) {
            onProjectRoutingChange(`_id:${originProjectId}`);
          }
        },
      });
    },
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

const defaultSettings: CreateSLOForm['settings'] = {
  preventInitialBackfill: false,
  syncDelay: 1,
  frequency: 1,
  syncField: null,
};

function renderSelector(settings: CreateSLOForm['settings'] = defaultSettings) {
  let latestProjectRoutings: string | null | undefined;

  function Wrapper() {
    const methods = useForm<CreateSLOForm>({
      defaultValues: { settings },
    });
    latestProjectRoutings = methods.watch('settings.projectRoutings');
    return (
      <FormProvider {...methods}>
        <ProjectRoutingsSelector />
      </FormProvider>
    );
  }

  render(<Wrapper />);

  return () => latestProjectRoutings;
}

function mockGate(options?: {
  isServerless?: boolean;
  isTierEligible?: boolean;
  hasManager?: boolean;
  defaultProjectRouting?: string;
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
                fetchProjects: jest.fn(),
                getDefaultProjectRouting: jest
                  .fn()
                  .mockReturnValue(options?.defaultProjectRouting ?? LOCAL_PROJECT_ROUTING),
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

describe('ProjectRoutingsSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGate();
    mockFetchProjects();
  });

  it('is hidden when not serverless', () => {
    mockGate({ isServerless: false });
    renderSelector();
    expect(screen.queryByTestId('sloProjectRoutingsSelector')).not.toBeInTheDocument();
  });

  it('is hidden when tier is not eligible for CPS', () => {
    mockGate({ isTierEligible: false });
    renderSelector();
    expect(screen.queryByTestId('sloProjectRoutingsSelector')).not.toBeInTheDocument();
  });

  it('is hidden when cpsManager is absent', () => {
    mockGate({ hasManager: false });
    renderSelector();
    expect(screen.queryByTestId('sloProjectRoutingsSelector')).not.toBeInTheDocument();
  });

  it('is hidden when there are zero linked projects', () => {
    mockFetchProjects({ linkedProjects: [] });
    renderSelector();
    expect(screen.queryByTestId('sloProjectRoutingsSelector')).not.toBeInTheDocument();
  });

  it('seeds the space default on create when the field is undefined', async () => {
    const getProjectRoutings = renderSelector();

    await waitFor(() => {
      expect(getProjectRoutings()).toBe(LOCAL_PROJECT_ROUTING);
    });
  });

  it('seeds ALL when the space default is ALL_PROJECT_ROUTING', async () => {
    mockGate({ defaultProjectRouting: ALL_PROJECT_ROUTING });
    const getProjectRoutings = renderSelector();

    await waitFor(() => {
      expect(getProjectRoutings()).toBe(ALL_PROJECT_ROUTING);
    });
  });

  it('shows This project for case 0 (origin only)', async () => {
    renderSelector();

    expect(await screen.findByTestId('sloProjectRoutingsSelector')).toHaveTextContent(
      'This project'
    );
  });

  it('shows All projects for case 3', async () => {
    renderSelector({ ...defaultSettings, projectRoutings: ALL_PROJECT_ROUTING });

    expect(await screen.findByTestId('sloProjectRoutingsSelector')).toHaveTextContent(
      'All projects'
    );
  });

  it('collapses origin-only picker output to LOCAL', async () => {
    const getProjectRoutings = renderSelector({
      ...defaultSettings,
      projectRoutings: ALL_PROJECT_ROUTING,
    });

    fireEvent.click(await screen.findByTestId('sloProjectRoutingsSelector'));
    fireEvent.click(await screen.findByTestId('mockProjectScopePicker'));

    await waitFor(() => {
      expect(getProjectRoutings()).toBe(LOCAL_PROJECT_ROUTING);
    });
  });

  it('hands the stored origin routing to the picker unmapped', async () => {
    renderSelector({ ...defaultSettings, projectRoutings: LOCAL_PROJECT_ROUTING });

    fireEvent.click(await screen.findByTestId('sloProjectRoutingsSelector'));

    await waitFor(() => {
      expect(mockProjectScopePickerSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          originProjectId: ORIGIN_PROJECT._id,
          projectRouting: LOCAL_PROJECT_ROUTING,
        })
      );
    });
  });

  it('pins the picker to the snapshot routing strategy', async () => {
    renderSelector({ ...defaultSettings, projectRoutings: ALL_PROJECT_ROUTING });

    fireEvent.click(await screen.findByTestId('sloProjectRoutingsSelector'));

    await waitFor(() => {
      expect(mockProjectScopePickerSpy).toHaveBeenCalledWith(
        expect.objectContaining({ projectRoutingStrategy: 'snapshot' })
      );
    });
  });

  it('shows a selected-over-total count for a multi-project selection', async () => {
    renderSelector({
      ...defaultSettings,
      projectRoutings: `_id:${ORIGIN_PROJECT._id} OR _id:${LINKED_PROJECT._id}`,
    });

    expect(await screen.findByTestId('sloProjectRoutingsSelector')).toHaveTextContent(
      '2/2 projects'
    );
  });
});
