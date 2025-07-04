/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
// Necessary until components being tested are migrated of styled-components https://github.com/elastic/kibana/issues/219037
import 'jest-styled-components';
import { screen, render } from '@testing-library/react';

import { Title } from './title';

jest.mock('../../lib/kibana');

describe('Title', () => {
  test('it renders title', () => {
    const { container } = render(<Title title="Test title" />);

    expect(container.children[0]).toMatchSnapshot();
  });

  describe('given badgeOptions', () => {
    test('it renders beta badge', () => {
      render(
        <Title
          title="Test title"
          badgeOptions={{
            beta: true,
            text: 'Beta',
            tooltip: 'Beta tooltip',
            size: 's',
          }}
        />
      );

      expect(screen.getByTestId('header-page-title-beta-badge')).toBeInTheDocument();
    });

    test('it renders badge', () => {
      render(
        <Title
          title="Test title"
          badgeOptions={{
            text: 'Badge',
            tooltip: 'Badge tooltip',
            color: 'hollow',
          }}
        />
      );

      expect(screen.getByTestId('header-page-title-badge')).toBeInTheDocument();
    });
  });
});
