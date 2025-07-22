/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

import { TestProviders } from '../../../../common/mock';
import { FlowTargetSelectConnectedComponent } from '.';
import { FlowTarget } from '../../../../../common/search_strategy';
import { FlowTargetSelect } from '../flow_controls/flow_target_select';

jest.mock('../flow_controls/flow_target_select', () => ({
  ...jest.requireActual('../flow_controls/flow_target_select'),
  FlowTargetSelect: jest.fn(() => <div data-test-subj="flow-target-select-mock" />),
}));

const FlowTargetSelectMocked = FlowTargetSelect as jest.MockedFunction<typeof FlowTargetSelect>;

describe('Flow Target Select Connected', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  test('renders correctly against snapshot flowTarget source', () => {
    render(
      <TestProviders>
        <MemoryRouter>
          <FlowTargetSelectConnectedComponent flowTarget={FlowTarget.source} />
        </MemoryRouter>
      </TestProviders>
    );
    expect(FlowTargetSelectMocked.mock.calls[0][0].selectedTarget).toEqual(FlowTarget.source);
  });

  test('renders correctly against snapshot flowTarget destination', () => {
    render(
      <TestProviders>
        <MemoryRouter>
          <FlowTargetSelectConnectedComponent flowTarget={FlowTarget.destination} />
        </MemoryRouter>
      </TestProviders>
    );

    expect(FlowTargetSelectMocked.mock.calls[0][0].selectedTarget).toEqual(FlowTarget.destination);
  });
});
