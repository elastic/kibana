/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { createMockStore, mockGlobalState, TestProviders } from '../../../../common/mock';

import { EmbeddedMapComponent } from './embedded_map';
import { useIsFieldInIndexPattern } from '../../../containers/fields';

import { setStubKibanaServices } from '@kbn/embeddable-plugin/public/mocks';

vi.mock('./map_config');
vi.mock('../../../containers/fields');
vi.mock('../../../../common/hooks/use_experimental_features');
vi.mock('./index_patterns_missing_prompt', () => {
      const mocked = {
      IndexPatternsMissingPrompt: vi.fn(() => <div data-test-subj="IndexPatternsMissingPrompt" />),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../../../common/lib/kibana', () => {
      const mocked = {
      useKibana: () => ({
        services: {
          docLinks: {
            ELASTIC_WEBSITE_URL: 'ELASTIC_WEBSITE_URL',
            links: {
              siem: { networkMap: '' },
            },
          },
          maps: {
            Map: () => <div data-test-subj="MapPanel">{'mockMap'}</div>,
          },
          storage: {
            get: mockGetStorage,
            set: mockSetStorage,
          },
        },
      }),
      useToasts: vi.fn().mockReturnValue({
        addError: vi.fn(),
        addSuccess: vi.fn(),
        addWarning: vi.fn(),
        addInfo: vi.fn(),
        remove: vi.fn(),
      }),
    };
      return { ...mocked, default: mocked };
    });

const mockUseIsFieldInIndexPattern = useIsFieldInIndexPattern as Mock;
const mockGetStorage = vi.fn();
const mockSetStorage = vi.fn();
const setQuery: Mock = vi.fn();
const defaultMockStore = createMockStore(mockGlobalState);
const testProps = {
  endDate: '2019-08-28T05:50:57.877Z',
  filters: [],
  query: { query: '', language: 'kuery' },
  setQuery,
  startDate: '2019-08-28T05:50:47.877Z',
};
describe('EmbeddedMapComponent', () => {
  beforeEach(() => {
    setQuery.mockClear();
    mockGetStorage.mockReturnValue(true);
    mockUseIsFieldInIndexPattern.mockReturnValue(() => true);

    // stub Kibana services for the embeddable plugin to ensure embeddable panel renders.
    setStubKibanaServices();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('renders', async () => {
    const { getByTestId } = render(
      <TestProviders store={defaultMockStore}>
        <EmbeddedMapComponent {...testProps} />
      </TestProviders>
    );
    await waitFor(() => {
      expect(getByTestId('EmbeddedMapComponent')).toBeInTheDocument();
    });
  });

  test('renders Map', async () => {
    const { getByTestId, queryByTestId } = render(
      <TestProviders store={defaultMockStore}>
        <EmbeddedMapComponent {...testProps} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(getByTestId('MapPanel')).toBeInTheDocument();
      expect(queryByTestId('IndexPatternsMissingPrompt')).not.toBeInTheDocument();
    });
  });

  test('map hidden on close', async () => {
    mockGetStorage.mockReturnValue(false);
    const { getByTestId, queryByTestId } = render(
      <TestProviders store={defaultMockStore}>
        <EmbeddedMapComponent {...testProps} />
      </TestProviders>
    );

    expect(queryByTestId('siemEmbeddable')).not.toBeInTheDocument();
    getByTestId('false-toggle-network-map').click();

    await waitFor(() => {
      expect(mockSetStorage).toHaveBeenNthCalledWith(1, 'network_map_visbile', true);
      expect(getByTestId('siemEmbeddable')).toBeInTheDocument();
    });
  });

  test('map visible on open', async () => {
    const { getByTestId, queryByTestId } = render(
      <TestProviders store={defaultMockStore}>
        <EmbeddedMapComponent {...testProps} />
      </TestProviders>
    );

    expect(getByTestId('siemEmbeddable')).toBeInTheDocument();
    getByTestId('true-toggle-network-map').click();

    await waitFor(() => {
      expect(mockSetStorage).toHaveBeenNthCalledWith(1, 'network_map_visbile', false);
      expect(queryByTestId('siemEmbeddable')).not.toBeInTheDocument();
    });
  });
});
