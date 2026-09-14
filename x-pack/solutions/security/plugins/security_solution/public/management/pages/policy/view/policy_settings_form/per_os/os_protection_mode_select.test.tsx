/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppContextTestRender } from '../../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../../common/mock/endpoint';
import React from 'react';
import userEvent from '@testing-library/user-event';
import { ProtectionModes } from '../../../../../../../common/endpoint/types';
import { OS_CONTROL_WIDTH } from './os_control_layout';
import type { OsProtectionModeSelectProps } from './os_protection_mode_select';
import { OsProtectionModeSelect } from './os_protection_mode_select';

describe('OsProtectionModeSelect', () => {
  const testSubj = 'osProtectionModeSelect';

  let formProps: OsProtectionModeSelectProps;
  let render: (
    props?: Partial<OsProtectionModeSelectProps>
  ) => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;

  beforeEach(() => {
    const mockedContext = createAppRootMockRenderer();

    formProps = {
      mode: ProtectionModes.prevent,
      onModeChange: jest.fn(),
      'data-test-subj': testSubj,
    };

    render = (props = {}) =>
      (renderResult = mockedContext.render(<OsProtectionModeSelect {...formProps} {...props} />));
  });

  it('renders all three protection mode options with translated labels in severity order', async () => {
    render();

    await userEvent.click(renderResult.getByTestId(testSubj));

    const optionLabels = renderResult.getAllByRole('option').map((option) => option.textContent);
    expect(optionLabels).toEqual(['Disable', 'Detect', 'Detect & prevent']);

    const disableOption = renderResult.getByRole('option', { name: /^Disable$/ });
    expect(disableOption.querySelector('[color="danger"]')).toBeInTheDocument();
  });

  it.each([
    [ProtectionModes.prevent, 'Detect & prevent'],
    [ProtectionModes.detect, 'Detect'],
    [ProtectionModes.off, 'Disable'],
  ])('displays the selected %s mode', (mode, label) => {
    render({ mode });

    expect(renderResult.getByTestId(testSubj).textContent).toBe(label);
  });

  it('keeps a constant responsive width for every selected label', () => {
    // The invariant is that the control does not resize with its selection. Both the shortest
    // ("Disable") and longest ("Detect & prevent") labels must keep the shared OS_CONTROL_WIDTH
    // so a design tweak to that constant cannot leave a stale literal behind here.
    render({ mode: ProtectionModes.off });

    const fixedWidthWrapper = renderResult.getByTestId(`${testSubj}-fixedWidth`);

    expect(fixedWidthWrapper).toHaveStyleRule('inline-size', OS_CONTROL_WIDTH);
    expect(fixedWidthWrapper).toHaveStyleRule('max-inline-size', '100%');

    renderResult.rerender(<OsProtectionModeSelect {...formProps} mode={ProtectionModes.prevent} />);

    expect(renderResult.getByTestId(`${testSubj}-fixedWidth`)).toHaveStyleRule(
      'inline-size',
      OS_CONTROL_WIDTH
    );
  });

  it('fires onModeChange once with the selected ProtectionModes value', async () => {
    render({ mode: ProtectionModes.prevent });

    await userEvent.click(renderResult.getByTestId(testSubj));
    await userEvent.click(renderResult.getByRole('option', { name: /^Detect$/ }));

    expect(formProps.onModeChange).toHaveBeenCalledTimes(1);
    expect(formProps.onModeChange).toHaveBeenCalledWith(ProtectionModes.detect);
  });

  it('renders disabled when disabled is true', () => {
    render({ disabled: true });

    expect(renderResult.getByTestId(testSubj)).toBeDisabled();
  });
});
