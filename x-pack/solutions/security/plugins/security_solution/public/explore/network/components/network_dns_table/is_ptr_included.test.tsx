/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, fireEvent } from '@testing-library/react';
import React from 'react';

import { IsPtrIncluded } from './is_ptr_included';

describe('NetworkTopNFlow Select direction', () => {
  const mockOnChange = jest.fn();

  describe('rendering', () => {
    test('it renders the basic switch to include PTR in table', () => {
      const { container } = render(<IsPtrIncluded isPtrIncluded={true} onChange={mockOnChange} />);

      expect(container.children[0]).toMatchSnapshot();
    });
  });

  describe('Functionality work as expected', () => {
    test('when you click on bi-directional, you trigger onChange function', () => {
      const { container } = render(<IsPtrIncluded isPtrIncluded={false} onChange={mockOnChange} />);

      fireEvent.click(container.querySelector('button')!);

      expect(mockOnChange).toHaveBeenCalled();
    });
  });
});
