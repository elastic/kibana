/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import type { ProjectRouting } from '@kbn/es-query';
import { type CPSProject, type ICPSManager, PROJECT_ROUTING } from '@kbn/cps-utils';
import { useProjectScopeLabel } from './use_project_scope_label';

const asProject = (id: string) => ({ _id: id } as CPSProject);

const createCpsManager = ({
  totalProjectCount = 3,
  hasLinkedProjects = true,
  fetchProjects = jest
    .fn()
    .mockResolvedValue({ origin: asProject('origin'), linkedProjects: [asProject('linked')] }),
}: {
  totalProjectCount?: number;
  hasLinkedProjects?: boolean;
  fetchProjects?: jest.Mock;
} = {}) =>
  ({
    whenReady: jest.fn().mockResolvedValue(undefined),
    fetchProjects,
    getTotalProjectCount: jest.fn().mockReturnValue(totalProjectCount),
    hasLinkedProjects: jest.fn().mockReturnValue(hasLinkedProjects),
  } as unknown as ICPSManager);

const renderProjectScopeLabel = (cpsManager: ICPSManager, projectRouting: ProjectRouting) =>
  renderHook(() => useProjectScopeLabel({ cpsManager, projectRouting }));

describe('useProjectScopeLabel', () => {
  it('labels an all-projects scope without counting', async () => {
    const cpsManager = createCpsManager();

    const { result } = renderProjectScopeLabel(cpsManager, PROJECT_ROUTING.ALL);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.label).toBe('All');
  });

  it('counts the projects a narrower scope selects', async () => {
    const cpsManager = createCpsManager({ totalProjectCount: 3 });

    const { result } = renderProjectScopeLabel(cpsManager, '_alias:linked');

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.label).toBe('2/3 projects');
  });

  // The picker counts the origin project like any other, so an origin-only scope reads as a count
  // rather than getting a label of its own.
  it('counts an origin-only scope like any other', async () => {
    const cpsManager = createCpsManager({
      totalProjectCount: 3,
      fetchProjects: jest
        .fn()
        .mockResolvedValue({ origin: asProject('origin'), linkedProjects: [] }),
    });

    const { result } = renderProjectScopeLabel(cpsManager, PROJECT_ROUTING.ORIGIN);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.label).toBe('1/3 projects');
  });

  it('labels an unset routing as all projects', async () => {
    const cpsManager = createCpsManager();

    const { result } = renderProjectScopeLabel(cpsManager, undefined);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.label).toBe('All');
  });

  it('reports a single-project deployment so callers can hide themselves', async () => {
    const cpsManager = createCpsManager({ hasLinkedProjects: false, totalProjectCount: 1 });

    const { result } = renderProjectScopeLabel(cpsManager, PROJECT_ROUTING.ALL);

    await waitFor(() => expect(result.current.isCpsMultiProject).toBe(false));
  });

  it('surfaces a failed project fetch', async () => {
    const cpsManager = createCpsManager({
      fetchProjects: jest.fn().mockRejectedValue(new Error('boom')),
    });

    const { result } = renderProjectScopeLabel(cpsManager, '_alias:linked');

    await waitFor(() => expect(result.current.hasError).toBe(true));
  });
});
