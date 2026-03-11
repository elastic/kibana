/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, fireEvent, render } from '@testing-library/react';
import React from 'react';
import { FlowDirection } from '../../../../../common/search_strategy';

import { FlowDirectionSelect } from './flow_direction_select';

describe('Select Flow Direction', () => {
  const mockOnChange = jest.fn();

  describe('rendering', () => {
    test('it renders the basic group button for uni-direction and bi-direction', () => {
      const { container } = render(
        <FlowDirectionSelect
          selectedDirection={FlowDirection.uniDirectional}
          onChangeDirection={mockOnChange}
        />
      );

      expect(container.children[0]).toMatchSnapshot();
    });
  });

  describe('Functionality work as expected', () => {
    test('when you click on bi-directional, you trigger onChange function', () => {
      render(
        <FlowDirectionSelect
          selectedDirection={FlowDirection.uniDirectional}
          onChangeDirection={mockOnChange}
        />
      );

      fireEvent.click(screen.getByTestId(FlowDirection.biDirectional));

      expect(mockOnChange.mock.calls[0]).toEqual(['biDirectional']);
    });
  });
});
