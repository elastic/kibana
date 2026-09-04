/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import { type CPSProject, type ICPSManager, PROJECT_ROUTING } from '@kbn/cps-utils';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import { JobProjectScopes, type JobProjectScopeItem } from './job_project_scopes';

jest.mock('../../../hooks/use_kibana');

const useKibanaContextForPluginMock = useKibanaContextForPlugin as jest.MockedFunction<
  typeof useKibanaContextForPlugin
>;

const asProject = (id: string) => ({ _id: id } as CPSProject);

const createCpsManager = ({ hasLinkedProjects = true }: { hasLinkedProjects?: boolean } = {}) =>
  ({
    whenReady: jest.fn().mockResolvedValue(undefined),
    fetchProjects: jest
      .fn()
      .mockResolvedValue({ origin: asProject('origin'), linkedProjects: [asProject('linked')] }),
    getTotalProjectCount: jest.fn().mockReturnValue(3),
    hasLinkedProjects: jest.fn().mockReturnValue(hasLinkedProjects),
  } as unknown as ICPSManager);

const renderJobProjectScopes = (
  jobs: JobProjectScopeItem[],
  {
    cpsManager = createCpsManager(),
    isTierEligible = true,
  }: { cpsManager?: ICPSManager; isTierEligible?: boolean } = {}
) => {
  useKibanaContextForPluginMock.mockReturnValue({
    services: { cps: { isTierEligible, cpsManager } },
  } as unknown as ReturnType<typeof useKibanaContextForPlugin>);

  return renderWithKibanaRenderContext(<JobProjectScopes jobs={jobs} />);
};

describe('JobProjectScopes', () => {
  it('shows the scope on its own when a page describes a single job', async () => {
    renderJobProjectScopes([{ projectRouting: PROJECT_ROUTING.ALL }]);

    expect(await screen.findByText('All')).toBeInTheDocument();
  });

  it('names each job when a page describes more than one', async () => {
    renderJobProjectScopes([
      { name: 'Categorization', projectRouting: PROJECT_ROUTING.ALL },
      { name: 'Log rate', projectRouting: '_alias:linked' },
    ]);

    expect(await screen.findByText('Categorization: All')).toBeInTheDocument();
    expect(await screen.findByText('Log rate: 2/3 projects')).toBeInTheDocument();
  });

  it('leaves out a job that has no scope, such as one that is not set up', async () => {
    renderJobProjectScopes([
      { name: 'Categorization', projectRouting: undefined },
      { name: 'Log rate', projectRouting: PROJECT_ROUTING.ALL },
    ]);

    expect(await screen.findByText('Log rate: All')).toBeInTheDocument();
    expect(screen.queryByText(/Categorization/)).not.toBeInTheDocument();
  });

  it('renders nothing when no job has a scope', () => {
    const { container } = renderJobProjectScopes([{ projectRouting: undefined }]);

    expect(container).toBeEmptyDOMElement();
  });

  // The group renders while readiness is pending, so that the buttons can show they are loading,
  // and takes itself away once the manager confirms there is nothing to scope.
  it('takes itself away without linked projects, where every job covers the same project', async () => {
    renderJobProjectScopes([{ projectRouting: PROJECT_ROUTING.ALL }], {
      cpsManager: createCpsManager({ hasLinkedProjects: false }),
    });

    await waitForElementToBeRemoved(() => screen.queryByRole('button'));
  });

  it('renders nothing when the deployment is not eligible for cross-project search', () => {
    const { container } = renderJobProjectScopes([{ projectRouting: PROJECT_ROUTING.ALL }], {
      isTierEligible: false,
    });

    expect(container).toBeEmptyDOMElement();
  });
});
