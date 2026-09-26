/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { InfraMetadata } from '../../../../common/http_api';
import { useIntegrationCheck } from './use_integration_check';
import { useMetadataStateContext } from './use_metadata_state';
import { INTEGRATIONS } from '../constants';

jest.mock('./use_metadata_state');

const useMetadataStateContextMock = useMetadataStateContext as jest.MockedFunction<
  typeof useMetadataStateContext
>;

const mockFeatures = (features?: Array<{ name: string }>) => {
  useMetadataStateContextMock.mockReturnValue({
    metadata: features ? ({ features } as InfraMetadata) : undefined,
    loading: false,
    error: null,
    refresh: jest.fn(),
  } as unknown as ReturnType<typeof useMetadataStateContext>);
};

const renderIntegrationCheck = (dependsOn: string): boolean =>
  renderHook(() => useIntegrationCheck({ dependsOn })).result.current;

describe('useIntegrationCheck', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('detects the integration when a feature name matches it exactly', () => {
    mockFeatures([{ name: INTEGRATIONS.kubernetesNode }]);

    expect(renderIntegrationCheck(INTEGRATIONS.kubernetesNode)).toBe(true);
  });

  it('detects the integration from a more specific feature name', () => {
    mockFeatures([{ name: `${INTEGRATIONS.kubernetesNode}.cpu` }]);

    expect(renderIntegrationCheck(INTEGRATIONS.kubernetesNode)).toBe(true);
  });

  it('does not detect the integration from an unrelated feature', () => {
    mockFeatures([{ name: INTEGRATIONS.docker }, { name: 'system.cpu' }]);

    expect(renderIntegrationCheck(INTEGRATIONS.kubernetesNode)).toBe(false);
  });

  it('does not confuse the container integration with the node one', () => {
    mockFeatures([{ name: INTEGRATIONS.kubernetesContainer }]);

    expect(renderIntegrationCheck(INTEGRATIONS.kubernetesNode)).toBe(false);
  });

  it('does not detect the integration when the entity reports no features', () => {
    mockFeatures([]);

    expect(renderIntegrationCheck(INTEGRATIONS.kubernetesNode)).toBe(false);
  });

  it('does not detect the integration before metadata has loaded', () => {
    mockFeatures(undefined);

    expect(renderIntegrationCheck(INTEGRATIONS.kubernetesNode)).toBe(false);
  });
});
