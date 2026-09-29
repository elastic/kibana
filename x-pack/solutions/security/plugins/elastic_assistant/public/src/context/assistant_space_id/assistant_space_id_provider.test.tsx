/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { MockedFunction } from 'vitest';

import React from 'react';
import { render } from '@testing-library/react';
import { AssistantSpaceIdProvider } from './assistant_space_id_provider';
import { useSpaceId } from '../../hooks/space_id/use_space_id';
vi.mock('../../hooks/space_id/use_space_id');
const mockUseSpaceId = useSpaceId as MockedFunction<typeof useSpaceId>;
vi.mock('@kbn/elastic-assistant', () => {
  const mocked = {
    AssistantSpaceIdProvider: vi.fn(({ children }) => (
      <div data-test-subj="elastic-assistant-provider">{children}</div>
    )),
  };
  return { ...mocked, default: mocked };
});

describe('AssistantSpaceIdProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render children when spaceId is undefined', () => {
    mockUseSpaceId.mockReturnValue(undefined);

    const { container, queryByText, queryByTestId } = render(
      <AssistantSpaceIdProvider>
        <div data-test-subj="child-component">{'Child Component'}</div>
      </AssistantSpaceIdProvider>
    );

    expect(container.firstChild).toBeNull();
    expect(queryByText('Child Component')).not.toBeInTheDocument();
    expect(queryByTestId('elastic-assistant-provider')).not.toBeInTheDocument();
    expect(queryByTestId('child-component')).not.toBeInTheDocument();
  });

  it('should render ElasticAssistantSpaceIdProvider with children when spaceId is defined', () => {
    const testSpaceId = 'test-space';
    mockUseSpaceId.mockReturnValue(testSpaceId);

    const { getByTestId, getByText } = render(
      <AssistantSpaceIdProvider>
        <div data-test-subj="child-component">{'Child Component'}</div>
      </AssistantSpaceIdProvider>
    );

    expect(getByTestId('elastic-assistant-provider')).toBeInTheDocument();

    expect(getByText('Child Component')).toBeInTheDocument();
  });
});
