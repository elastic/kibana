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
  it('should render right section only', () => {
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
          showLeft={false}
          showPreview={false}
        />
      </TestProvider>
    );

    const rightSection = getByTestId(RESIZABLE_RIGHT_SECTION_TEST_ID);
    expect(rightSection).toBeInTheDocument();
    expect(rightSection.parentElement).toHaveStyle('inline-size: 100%; block-size: auto;');

    const resizeButton = getByTestId(RESIZABLE_BUTTON_TEST_ID);
    expect(resizeButton).toBeInTheDocument();
    expect(resizeButton).toBeDisabled();

    const leftSection = getByTestId(RESIZABLE_LEFT_SECTION_TEST_ID);
    expect(leftSection).toBeInTheDocument();
    expect(leftSection.parentElement).toHaveStyle('inline-size: 0%; block-size: auto;');
  });

  it('should render left and right components with resize button enabled', () => {
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
          showLeft={true}
          showPreview={false}
        />
      </TestProvider>
    );

    const rightSection = getByTestId(RESIZABLE_RIGHT_SECTION_TEST_ID);
    expect(rightSection).toBeInTheDocument();
    expect(rightSection.parentElement).toHaveStyle('inline-size: 50%; block-size: auto;');

    const resizeButton = getByTestId(RESIZABLE_BUTTON_TEST_ID);
    expect(resizeButton).toBeInTheDocument();
    expect(resizeButton).not.toBeDisabled();

    const leftSection = getByTestId(RESIZABLE_LEFT_SECTION_TEST_ID);
    expect(leftSection).toBeInTheDocument();
    expect(leftSection.parentElement).toHaveStyle('inline-size: 50%; block-size: auto;');
  });

  it('should disable the resize button if preview is rendered', () => {
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
          showLeft={true}
          showPreview={true}
        />
      </TestProvider>
    );

    const resizeButton = getByTestId(RESIZABLE_BUTTON_TEST_ID);
    expect(resizeButton).toBeInTheDocument();
    expect(resizeButton).toBeDisabled();
  });
});
