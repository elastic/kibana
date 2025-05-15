/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { clone } from 'lodash/fp';
import React from 'react';

import { FlowDirection, FlowTarget } from '../../../../../common/search_strategy';
import { FlowTargetSelect } from './flow_target_select';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('FlowTargetSelect Component', () => {
  const TestFlowTargetId = 'TestFlowTargetId';

  const mockProps = {
    id: TestFlowTargetId,
    selectedDirection: FlowDirection.uniDirectional,
    isLoading: false,
    selectedTarget: FlowTarget.source,
    updateFlowTargetAction: jest.fn(),
  };

  test('it renders the FlowTargetSelect', () => {
    const { container } = render(<FlowTargetSelect {...mockProps} />);
    expect(container.children[0]).toMatchSnapshot();
  });

  test('selecting destination from the type drop down', async () => {
    render(<FlowTargetSelect {...mockProps} />);

    fireEvent.click(screen.getByText('Source'));

    fireEvent.click(
      document.querySelector(`button#${TestFlowTargetId}-select-flow-target-destination`)!
    );

    expect(mockProps.updateFlowTargetAction.mock.calls[0][0]).toEqual('destination');
  });

  test('when selectedDirection=unidirectional only source/destination are options', () => {
    render(<FlowTargetSelect {...mockProps} />);

    fireEvent.click(screen.getByText('Source'));

    expect(
      document.querySelector(`button#${TestFlowTargetId}-select-flow-target-source`)
    ).toBeInTheDocument();
    expect(
      document.querySelector(`button#${TestFlowTargetId}-select-flow-target-destination`)
    ).toBeInTheDocument();
    expect(
      document.querySelector(`button#${TestFlowTargetId}-select-flow-target-client`)
    ).not.toBeInTheDocument();
    expect(
      document.querySelector(`button#${TestFlowTargetId}-select-flow-target-server`)
    ).not.toBeInTheDocument();
  });

  test('when selectedDirection=bidirectional source/destination/client/server are options', () => {
    const bidirectionalMock = clone(mockProps);
    bidirectionalMock.selectedDirection = FlowDirection.biDirectional;

    render(<FlowTargetSelect {...bidirectionalMock} />);

    fireEvent.click(screen.getByText('Source'));

    expect(
      document.querySelector(`button#${TestFlowTargetId}-select-flow-target-source`)
    ).toBeInTheDocument();
    expect(
      document.querySelector(`button#${TestFlowTargetId}-select-flow-target-destination`)
    ).toBeInTheDocument();
    expect(
      document.querySelector(`button#${TestFlowTargetId}-select-flow-target-client`)
    ).toBeInTheDocument();
    expect(
      document.querySelector(`button#${TestFlowTargetId}-select-flow-target-server`)
    ).toBeInTheDocument();
  });
});
