/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';

import { Empty } from './empty';
import { TestProviders } from '../../../../common/mock/test_providers';

describe('Empty', () => {
  describe('rendering', () => {
    test('renders the empty drop area', () => {
      const { container } = render(
        <TestProviders>
          <Empty timelineId="test" browserFields={{}} />
        </TestProviders>
      );
      expect(container.textContent).toContain('Drop');
    });

    const dropMessage = ['Drop', 'anything', 'highlighted', 'here'];

    test('it renders the expected message', () => {
      const { container } = render(
        <TestProviders>
          <Empty timelineId="test" browserFields={{}} />
        </TestProviders>
      );

      dropMessage.forEach((word) => expect(container.textContent).toContain(word));
    });
  });
});
