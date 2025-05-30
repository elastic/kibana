/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { TestProviders } from '../../../../common/mock';

import { ArrowBody, ArrowHead } from '.';

describe('arrows', () => {
  describe('ArrowBody', () => {
    test('renders correctly against snapshot', () => {
      const { container } = render(
        <TestProviders>
          <ArrowBody height={3} />
        </TestProviders>
      );
      expect(container.children[0]).toMatchSnapshot();
    });
  });

  describe('ArrowHead', () => {
    test('it renders an arrow head icon', () => {
      render(
        <TestProviders>
          <ArrowHead direction={'arrowLeft'} />
        </TestProviders>
      );

      expect(screen.getByTestId('arrow-icon')).toBeInTheDocument();
    });
  });
});
