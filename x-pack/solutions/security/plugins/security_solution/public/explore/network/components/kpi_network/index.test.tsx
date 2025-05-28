/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';

import { TestProviders, createMockStore } from '../../../../common/mock';
import { NetworkKpiComponent } from '.';

jest.mock('../../../../common/components/visualization_actions/lens_embeddable', () => ({
  LensEmbeddable: jest.fn(() => <div data-test-subj="mock-lens-embeddable" />),
}));

describe('NetworkKpiComponent', () => {
  const props = {
    filterQuery: '',
    from: '2019-06-15T06:00:00.000Z',
    indexNames: [],
    updateDateRange: jest.fn(),
    setQuery: jest.fn(),
    skip: true,
    to: '2019-06-18T06:00:00.000Z',
  };

  describe('rendering', () => {
    test('it renders the default widget', () => {
      const { container } = render(
        <TestProviders store={createMockStore()}>
          <NetworkKpiComponent {...props} />
        </TestProviders>
      );

      expect(container.children[0]).toMatchSnapshot();
    });
  });
});
