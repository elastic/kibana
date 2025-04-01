/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { TestProviders, mockGlobalState, createMockStore } from '../../../../common/mock';

import { EmbeddedMapComponent } from './embedded_map';
import { getLayerList } from './map_config';
import { useIsFieldInIndexPattern } from '../../../containers/fields';

import { setStubKibanaServices } from '@kbn/embeddable-plugin/public/mocks';

jest.mock('./map_config');
jest.mock('../../../../sourcerer/containers');
jest.mock('../../../containers/fields');
jest.mock('./index_patterns_missing_prompt', () => ({
  IndexPatternsMissingPrompt: jest.fn(() => <div data-test-subj="IndexPatternsMissingPrompt" />),
}));
jest.mock('../../../../common/lib/kibana', () => ({
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
  useToasts: jest.fn().mockReturnValue({
    addError: jest.fn(),
    addSuccess: jest.fn(),
    addWarning: jest.fn(),
    remove: jest.fn(),
  }),
}));

const mockUseIsFieldInIndexPattern = useIsFieldInIndexPattern as jest.Mock;
const mockGetStorage = jest.fn();
const mockSetStorage = jest.fn();
const setQuery: jest.Mock = jest.fn();
const filebeatDataView = {
  id: '6f1eeb50-023d-11eb-bcb6-6ba0578012a9',
  title: 'filebeat-*',
  browserFields: {},
  fields: {},
  loading: false,
  patternList: ['filebeat-*'],
  dataView: {
    id: '6f1eeb50-023d-11eb-bcb6-6ba0578012a9',
    fields: {},
  },
  runtimeMappings: {},
  indexFields: [],
};
const packetbeatDataView = {
  id: '28995490-023d-11eb-bcb6-6ba0578012a9',
  title: 'packetbeat-*',
  browserFields: {},
  fields: {},
  loading: false,
  patternList: ['packetbeat-*'],
  dataView: {
    id: '28995490-023d-11eb-bcb6-6ba0578012a9',
    fields: {},
  },
  runtimeMappings: {},
  indexFields: [],
};
const mockState = {
  ...mockGlobalState,
  sourcerer: {
    ...mockGlobalState.sourcerer,
    kibanaDataViews: [filebeatDataView, packetbeatDataView],
  },
};
const defaultMockStore = createMockStore(mockState);
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
    jest.clearAllMocks();
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

  test('renders IndexPatternsMissingPrompt', async () => {
    const state = {
      ...mockGlobalState,
      sourcerer: {
        ...mockGlobalState.sourcerer,
        kibanaDataViews: [],
      },
    };
    const store = createMockStore(state);

    const { getByTestId, queryByTestId } = render(
      <TestProviders store={store}>
        <EmbeddedMapComponent {...testProps} />
      </TestProviders>
    );
    await waitFor(() => {
      expect(queryByTestId('MapPanel')).not.toBeInTheDocument();
      expect(getByTestId('IndexPatternsMissingPrompt')).toBeInTheDocument();
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

  test('On mount, selects existing Kibana data views that match any selected index pattern', async () => {
    const state = {
      ...mockGlobalState,
      sourcerer: {
        ...mockGlobalState.sourcerer,
        kibanaDataViews: [filebeatDataView],
      },
    };
    const store = createMockStore(state);
    render(
      <TestProviders store={store}>
        <EmbeddedMapComponent {...testProps} />
      </TestProviders>
    );
    await waitFor(() => {
      const dataViewArg = (getLayerList as jest.Mock).mock.calls[0][1];
      expect(dataViewArg).toEqual([filebeatDataView]);
    });
  });

  test('On rerender with new selected patterns, selects existing Kibana data views that match any selected index pattern', async () => {
    const state = {
      ...mockGlobalState,
      sourcerer: {
        ...mockGlobalState.sourcerer,
        kibanaDataViews: [filebeatDataView],
      },
    };
    const store = createMockStore(state);
    const { rerender } = render(
      <TestProviders store={store}>
        <EmbeddedMapComponent {...testProps} />
      </TestProviders>
    );
    await waitFor(() => {
      const dataViewArg = (getLayerList as jest.Mock).mock.calls[0][1];
      expect(dataViewArg).toEqual([filebeatDataView]);
    });
    rerender(
      <TestProviders store={defaultMockStore}>
        <EmbeddedMapComponent {...testProps} />
      </TestProviders>
    );
    await waitFor(() => {
      // data view is updated with the returned embeddable.setLayerList callback, which is passesd getLayerList(dataViews)
      const dataViewArg = (getLayerList as jest.Mock).mock.calls[1][1];
      expect(dataViewArg).toEqual([filebeatDataView, packetbeatDataView]);
    });
  });
});
