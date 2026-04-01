/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';

import { useWorkflowHealthCheck } from '.';
import { useListWorkflows } from '../../workflow_configuration/hooks/use_list_workflows';
import type { WorkflowConfiguration } from '../../workflow_configuration/types';
import * as workflowI18n from '../../workflow_configuration/translations';

jest.mock('../../workflow_configuration/hooks/use_list_workflows');

const mockUseListWorkflows = useListWorkflows as jest.MockedFunction<typeof useListWorkflows>;

const defaultWorkflowConfiguration: WorkflowConfiguration = {
  alertRetrievalWorkflowIds: [],
  defaultAlertRetrievalMode: 'custom_query',
  validationWorkflowId: 'default',
};

const mockWorkflows = [
  {
    description: 'Retrieves alerts',
    enabled: true,
    id: 'wf-retrieval-1',
    name: 'Alert Retrieval 1',
  },
  {
    description: 'Retrieves alerts v2',
    enabled: false,
    id: 'wf-retrieval-2',
    name: 'Alert Retrieval 2',
  },
  { description: 'Validates findings', enabled: true, id: 'wf-validation-1', name: 'Validation 1' },
  {
    description: 'Validates findings v2',
    enabled: false,
    id: 'wf-validation-2',
    name: 'Validation 2',
  },
];

describe('useWorkflowHealthCheck', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseListWorkflows.mockReturnValue({
      data: mockWorkflows,
      isLoading: false,
    } as unknown as ReturnType<typeof useListWorkflows>);
  });

  it('returns an empty array when workflows feature is disabled', () => {
    const { result } = renderHook(() =>
      useWorkflowHealthCheck({
        isWorkflowsEnabled: false,
        workflowConfiguration: {
          ...defaultWorkflowConfiguration,
          alertRetrievalWorkflowIds: ['nonexistent-id'],
        },
      })
    );

    expect(result.current).toEqual([]);
  });

  it('returns an empty array when workflows are loading', () => {
    mockUseListWorkflows.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as unknown as ReturnType<typeof useListWorkflows>);

    const { result } = renderHook(() =>
      useWorkflowHealthCheck({
        isWorkflowsEnabled: true,
        workflowConfiguration: {
          ...defaultWorkflowConfiguration,
          alertRetrievalWorkflowIds: ['nonexistent-id'],
        },
      })
    );

    expect(result.current).toEqual([]);
  });

  it('returns an empty array when workflow data is undefined', () => {
    mockUseListWorkflows.mockReturnValue({
      data: undefined,
      isLoading: false,
    } as unknown as ReturnType<typeof useListWorkflows>);

    const { result } = renderHook(() =>
      useWorkflowHealthCheck({
        isWorkflowsEnabled: true,
        workflowConfiguration: {
          ...defaultWorkflowConfiguration,
          alertRetrievalWorkflowIds: ['nonexistent-id'],
        },
      })
    );

    expect(result.current).toEqual([]);
  });

  it('returns an empty array when all selected workflows exist and are enabled', () => {
    const { result } = renderHook(() =>
      useWorkflowHealthCheck({
        isWorkflowsEnabled: true,
        workflowConfiguration: {
          ...defaultWorkflowConfiguration,
          alertRetrievalWorkflowIds: ['wf-retrieval-1'],
          validationWorkflowId: 'wf-validation-1',
        },
      })
    );

    expect(result.current).toEqual([]);
  });

  it('returns an empty array when no custom workflows are selected', () => {
    const { result } = renderHook(() =>
      useWorkflowHealthCheck({
        isWorkflowsEnabled: true,
        workflowConfiguration: defaultWorkflowConfiguration,
      })
    );

    expect(result.current).toEqual([]);
  });

  it('returns a warning when an alert retrieval workflow is not found', () => {
    const { result } = renderHook(() =>
      useWorkflowHealthCheck({
        isWorkflowsEnabled: true,
        workflowConfiguration: {
          ...defaultWorkflowConfiguration,
          alertRetrievalWorkflowIds: ['nonexistent-id'],
        },
      })
    );

    expect(result.current).toEqual([
      {
        level: 'warning',
        message: workflowI18n.ALERT_RETRIEVAL_WORKFLOW_NOT_FOUND('nonexistent-id'),
      },
    ]);
  });

  it('returns a warning when an alert retrieval workflow is disabled', () => {
    const { result } = renderHook(() =>
      useWorkflowHealthCheck({
        isWorkflowsEnabled: true,
        workflowConfiguration: {
          ...defaultWorkflowConfiguration,
          alertRetrievalWorkflowIds: ['wf-retrieval-2'],
        },
      })
    );

    expect(result.current).toEqual([
      {
        level: 'warning',
        message: workflowI18n.ALERT_RETRIEVAL_WORKFLOW_DISABLED('Alert Retrieval 2'),
      },
    ]);
  });

  it('returns a warning when the validation workflow is not found', () => {
    const { result } = renderHook(() =>
      useWorkflowHealthCheck({
        isWorkflowsEnabled: true,
        workflowConfiguration: {
          ...defaultWorkflowConfiguration,
          validationWorkflowId: 'nonexistent-validation',
        },
      })
    );

    expect(result.current).toEqual([
      {
        level: 'warning',
        message: workflowI18n.VALIDATION_WORKFLOW_NOT_FOUND,
      },
    ]);
  });

  it('returns a warning when the validation workflow is disabled', () => {
    const { result } = renderHook(() =>
      useWorkflowHealthCheck({
        isWorkflowsEnabled: true,
        workflowConfiguration: {
          ...defaultWorkflowConfiguration,
          validationWorkflowId: 'wf-validation-2',
        },
      })
    );

    expect(result.current).toEqual([
      {
        level: 'warning',
        message: workflowI18n.VALIDATION_WORKFLOW_DISABLED('Validation 2'),
      },
    ]);
  });

  it('does not check the validation workflow when it is "default"', () => {
    const { result } = renderHook(() =>
      useWorkflowHealthCheck({
        isWorkflowsEnabled: true,
        workflowConfiguration: {
          ...defaultWorkflowConfiguration,
          validationWorkflowId: 'default',
        },
      })
    );

    expect(result.current).toEqual([]);
  });

  it('does not check the validation workflow when it is empty', () => {
    const { result } = renderHook(() =>
      useWorkflowHealthCheck({
        isWorkflowsEnabled: true,
        workflowConfiguration: {
          ...defaultWorkflowConfiguration,
          validationWorkflowId: '',
        },
      })
    );

    expect(result.current).toEqual([]);
  });

  it('returns multiple warnings when multiple issues exist', () => {
    const { result } = renderHook(() =>
      useWorkflowHealthCheck({
        isWorkflowsEnabled: true,
        workflowConfiguration: {
          ...defaultWorkflowConfiguration,
          alertRetrievalWorkflowIds: ['nonexistent-id', 'wf-retrieval-2'],
          validationWorkflowId: 'wf-validation-2',
        },
      })
    );

    expect(result.current).toHaveLength(3);

    expect(result.current).toEqual([
      {
        level: 'warning',
        message: workflowI18n.ALERT_RETRIEVAL_WORKFLOW_NOT_FOUND('nonexistent-id'),
      },
      {
        level: 'warning',
        message: workflowI18n.ALERT_RETRIEVAL_WORKFLOW_DISABLED('Alert Retrieval 2'),
      },
      {
        level: 'warning',
        message: workflowI18n.VALIDATION_WORKFLOW_DISABLED('Validation 2'),
      },
    ]);
  });

  it('handles a mix of valid and invalid alert retrieval workflows', () => {
    const { result } = renderHook(() =>
      useWorkflowHealthCheck({
        isWorkflowsEnabled: true,
        workflowConfiguration: {
          ...defaultWorkflowConfiguration,
          alertRetrievalWorkflowIds: ['wf-retrieval-1', 'nonexistent-id'],
        },
      })
    );

    expect(result.current).toEqual([
      {
        level: 'warning',
        message: workflowI18n.ALERT_RETRIEVAL_WORKFLOW_NOT_FOUND('nonexistent-id'),
      },
    ]);
  });
});
