/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { InferenceConnectorType } from '@kbn/inference-common';
import { TestProviders } from '../../../../common/mock';
import { useInferenceConnectorAccess } from './use_inference_connector_access';

const mockHttpFetch = jest.fn();

jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: {
      http: {
        fetch: mockHttpFetch,
      },
    },
  }),
}));

describe('useInferenceConnectorAccess', () => {
  const genAiConnector = {
    id: 'connector-1',
    name: 'OpenAI',
    actionTypeId: InferenceConnectorType.OpenAI,
  };
  const inferenceConnector = {
    id: 'connector-2',
    name: 'Elastic Managed LLM',
    actionTypeId: InferenceConnectorType.Inference,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockHttpFetch.mockResolvedValue({ has_all_required: true });
  });

  it('skips the privilege check for BYO connectors', () => {
    const { result } = renderHook(
      () =>
        useInferenceConnectorAccess({
          connectors: [genAiConnector],
          selectedConnectorId: 'connector-1',
        }),
      { wrapper: TestProviders }
    );

    expect(result.current.canUseSelectedConnector).toBe(true);
    expect(result.current.missingInferencePrivilege).toBe(false);
    expect(result.current.isCheckingPrivileges).toBe(false);
    expect(mockHttpFetch).not.toHaveBeenCalled();
  });

  it('allows .inference connectors when monitor_inference is granted', async () => {
    const { result } = renderHook(
      () =>
        useInferenceConnectorAccess({
          connectors: [inferenceConnector],
          selectedConnectorId: 'connector-2',
        }),
      { wrapper: TestProviders }
    );

    await waitFor(() => {
      expect(result.current.canUseSelectedConnector).toBe(true);
    });

    expect(mockHttpFetch).toHaveBeenCalledWith(
      '/internal/inference_connector/privileges',
      expect.objectContaining({ method: 'GET' })
    );
    expect(result.current.missingInferencePrivilege).toBe(false);
  });

  it('marks the inference connector as unusable when monitor_inference is missing', async () => {
    mockHttpFetch.mockResolvedValue({ has_all_required: false });

    const { result } = renderHook(
      () =>
        useInferenceConnectorAccess({
          connectors: [inferenceConnector],
          selectedConnectorId: 'connector-2',
        }),
      { wrapper: TestProviders }
    );

    await waitFor(() => {
      expect(result.current.missingInferencePrivilege).toBe(true);
    });

    expect(result.current.canUseSelectedConnector).toBe(false);
  });

  it('does not treat a failed privilege check as a missing privilege', async () => {
    mockHttpFetch.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(
      () =>
        useInferenceConnectorAccess({
          connectors: [inferenceConnector],
          selectedConnectorId: 'connector-2',
        }),
      { wrapper: TestProviders }
    );

    await waitFor(() => {
      expect(result.current.canUseSelectedConnector).toBe(true);
    });

    expect(result.current.missingInferencePrivilege).toBe(false);
    expect(result.current.isCheckingPrivileges).toBe(false);
  });
});
