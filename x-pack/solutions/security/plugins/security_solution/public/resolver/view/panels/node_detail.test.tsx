/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import * as redux from 'react-redux';
import { render } from '@testing-library/react';
import { TestProviders } from '../../../common/mock';
import { NodeDetailView } from './node_detail';
import { useCubeAssets } from '../use_cube_assets';
import { useLinkProps } from '../use_link_props';

const mockUseCubeAssets = useCubeAssets as jest.Mock;
jest.mock('../use_cube_assets');

const mockUseLinkProps = useLinkProps as jest.Mock;
jest.mock('../use_link_props');

const processEvent = {
  _id: 'test_id',
  _index: '_index',
  '@timestamp': 1726589803115,
  event: {
    id: 'event id',
    kind: 'event',
    category: 'process',
  },
};

describe('<NodeDetailView />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLinkProps.mockReturnValue({ href: '#', onClick: jest.fn() });
    mockUseCubeAssets.mockReturnValue({
      descriptionText: 'test process',
    });
    jest.spyOn(redux, 'useSelector').mockReturnValueOnce('success');
    jest.spyOn(redux, 'useSelector').mockReturnValueOnce(1);
  });

  it('should render', () => {
    const { getByTestId, queryByTestId } = render(
      <TestProviders>
        <NodeDetailView id="test" nodeID="test" processEvent={processEvent} />
      </TestProviders>
    );
    expect(getByTestId('resolver:panel:node-detail')).toBeInTheDocument();
    expect(getByTestId('resolver:node-detail:title')).toBeInTheDocument();
    expect(getByTestId('resolver:node-detail:node-events-link')).toBeInTheDocument();
    expect(getByTestId('resolver:node-detail')).toBeInTheDocument();
    expect(queryByTestId('resolver:node-detail:title-link')).not.toBeInTheDocument();
  });

  it('should render process name as link when nodeEventOnClick is available', () => {
    const nodeEventOnClick = jest.fn();
    const { getByTestId } = render(
      <TestProviders>
        <NodeDetailView
          id="test"
          nodeID="test"
          nodeEventOnClick={nodeEventOnClick}
          processEvent={processEvent}
        />
      </TestProviders>
    );
    expect(getByTestId('resolver:node-detail:title-link')).toBeInTheDocument();
    getByTestId('resolver:node-detail:title-link').click();
    expect(nodeEventOnClick).toBeCalledWith({
      documentId: 'test_id',
      indexName: '_index',
      scopeId: 'test',
      isAlert: false,
    });
  });
});
