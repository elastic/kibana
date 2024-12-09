/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockKibanaValues, setMockValues } from '../../__mocks__/kea_logic';

import React from 'react';

import { mount, shallow } from 'enzyme';

import { act } from 'react-dom/test-utils';

import { FormulaPublicApi } from '@kbn/lens-plugin/public';

import { findOrCreateDataView } from '../utils/find_or_create_data_view';

import { withLensData } from './with_lens_data';

interface MockComponentProps {
  name: string;
}

interface MockComponentLensProps {
  data: string;
}

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

const mockCollection = {
  event_retention_day_length: 180,
  events_datastream: 'analytics-events-example2',
  id: 'example2',
  name: 'example2',
};
const mockDataView = { id: 'test-data-view-id' };

jest.mock('../utils/find_or_create_data_view', () => {
  return {
    findOrCreateDataView: jest.fn(),
  };
});

describe('withLensData', () => {
  const MockComponent: React.FC<MockComponentProps> = ({ name }) => <div>{name}</div>;

  beforeEach(() => {
    setMockValues({});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render the wrapped component with the data prop', () => {
    const WrappedComponent = withLensData<MockComponentProps, MockComponentLensProps>(
      MockComponent,
      {
        dataLoadTransform: jest.fn(() => {
          return { data: 'initial data' };
        }),
        getAttributes: jest.fn(),
        initialValues: { data: 'initial data' },
      }
    );

    const props = { collection: mockCollection, name: 'John Doe' };
    const wrapper = shallow(
      <WrappedComponent id={'id'} timeRange={{ from: 'now-10d', to: 'now' }} {...props} />
    );
    expect(wrapper.find(MockComponent).prop('data')).toEqual('initial data');
  });

  it('should call findOrCreateDataView with collection', async () => {
    const WrappedComponent = withLensData<MockComponentProps, MockComponentLensProps>(
      MockComponent,
      {
        dataLoadTransform: jest.fn(),
        getAttributes: jest.fn(),
        initialValues: { data: 'initial data' },
      }
    );

    const props = {
      collection: mockCollection,
      id: 'id',
      name: 'John Doe',
      timeRange: { from: 'now-10d', to: 'now' },
    };
    mount(<WrappedComponent {...props} />);
    await act(async () => {
      await flushPromises();
    });

    expect(findOrCreateDataView).toHaveBeenCalledWith(mockCollection);
  });

  it('should call getAttributes with the correct arguments when dataView and formula are available', async () => {
    const getAttributes = jest.fn();
    const formula = {} as FormulaPublicApi;
    mockKibanaValues.lens.stateHelperApi = jest.fn().mockResolvedValueOnce({ formula });
    (findOrCreateDataView as jest.Mock).mockResolvedValueOnce(mockDataView);

    const WrappedComponent = withLensData<MockComponentProps, MockComponentLensProps>(
      MockComponent,
      {
        dataLoadTransform: jest.fn(),
        getAttributes,
        initialValues: { data: 'initial data' },
      }
    );

    const props = {
      collection: mockCollection,
      id: 'id',
      name: 'John Doe',
      timeRange: { from: 'now-10d', to: 'now' },
    };
    mount(<WrappedComponent {...props} />);
    await act(async () => {
      await flushPromises();
    });

    expect(getAttributes).toHaveBeenCalledWith(mockDataView, formula, props);
  });

  it('should not call getAttributes when dataView is not available', async () => {
    const getAttributes = jest.fn();
    const formula = {} as FormulaPublicApi;
    mockKibanaValues.lens.stateHelperApi = jest.fn().mockResolvedValueOnce({ formula });
    (findOrCreateDataView as jest.Mock).mockResolvedValueOnce(undefined);

    const WrappedComponent = withLensData<MockComponentProps, MockComponentLensProps>(
      MockComponent,
      {
        dataLoadTransform: jest.fn(),
        getAttributes,
        initialValues: { data: 'initial data' },
      }
    );

    const props = {
      collection: mockCollection,
      id: 'id',
      name: 'John Doe',
      timeRange: { from: 'now-10d', to: 'now' },
    };
    mount(<WrappedComponent {...props} />);
    await act(async () => {
      await flushPromises();
    });

    expect(getAttributes).not.toHaveBeenCalled();
  });
});
