/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ResizableContainer } from './resizable_container';
import {
  RESIZABLE_BUTTON_TEST_ID,
  RESIZABLE_LEFT_SECTION_TEST_ID,
  RESIZABLE_RIGHT_SECTION_TEST_ID,
} from './test_ids';
import { TestProvider } from '../test/provider';
import { initialState } from '../store/state';

const leftComponent = <div>{'left component'}</div>;
const rightComponent = <div>{'right component'}</div>;

describe('ResizableContainer', () => {
  it('should render left and right component as well as resize button', () => {
    const state = {
      ...initialState,
      ui: {
        ...initialState.ui,
        userSectionWidths: {
          leftPercentage: 50,
          rightPercentage: 50,
        },
      },
    };

    const { getByTestId } = render(
      <TestProvider state={state}>
        <ResizableContainer
          leftComponent={leftComponent}
          rightComponent={rightComponent}
          showPreview={false}
        />
      </TestProvider>
    );

    expect(getByTestId(RESIZABLE_LEFT_SECTION_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(RESIZABLE_BUTTON_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(RESIZABLE_RIGHT_SECTION_TEST_ID)).toBeInTheDocument();
  });
});
