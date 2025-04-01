/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';

import { Panel } from './types';
import { ExpandableFlyout } from '.';
import { useWindowWidth } from './hooks/use_window_width';
import { TestProvider } from './test/provider';
import { REDUX_ID_FOR_MEMORY_STORAGE } from './constants';
import { initialUiState } from './store/state';

jest.mock('./hooks/use_window_width');

const registeredPanels: Panel[] = [
  {
    key: 'key',
    component: () => <div>{'component'}</div>,
  },
];

describe('ExpandableFlyout', () => {
  it(`should not render flyout if window width is 0`, () => {
    (useWindowWidth as jest.Mock).mockReturnValue(0);

    const result = render(
      <TestProvider>
        <ExpandableFlyout registeredPanels={registeredPanels} />
      </TestProvider>
    );

    expect(result.asFragment()).toMatchInlineSnapshot(`<DocumentFragment />`);
  });

  it(`should render flyout`, () => {
    (useWindowWidth as jest.Mock).mockReturnValue(1000);

    const state = {
      panels: {
        byId: {
          [REDUX_ID_FOR_MEMORY_STORAGE]: {
            right: {
              id: 'key',
            },
            left: undefined,
            preview: undefined,
            history: [{ lastOpen: Date.now(), panel: { id: 'key' } }],
          },
        },
      },
      ui: initialUiState,
    };

    const { getByTestId } = render(
      <TestProvider state={state}>
        <ExpandableFlyout registeredPanels={registeredPanels} data-test-subj={'TEST'} />
      </TestProvider>
    );

    expect(getByTestId('TEST')).toBeInTheDocument();
  });
});
