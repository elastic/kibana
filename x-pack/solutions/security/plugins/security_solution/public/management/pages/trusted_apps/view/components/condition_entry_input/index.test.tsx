/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ConditionEntryField, OperatingSystem } from '@kbn/securitysolution-utils';
import type { TrustedAppConditionEntry } from '../../../../../../../common/endpoint/types';

import type { ConditionEntryInputProps } from '.';
import { ConditionEntryInput } from '.';
import type { AppContextTestRender } from '../../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../../common/mock/endpoint';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import { OPERATOR_TITLES } from '../../translations';

let onRemoveMock: jest.Mock;
let onChangeMock: jest.Mock;
let onVisitedMock: jest.Mock;

const baseEntry: Readonly<TrustedAppConditionEntry> = {
  field: ConditionEntryField.HASH,
  type: 'match',
  operator: 'included',
  value: 'trustedApp',
};

describe('Condition entry input', () => {
  const formPrefix = 'condition-entry-input';
  let props: jest.Mocked<ConditionEntryInputProps>;
  let mockedContext: AppContextTestRender;
  let renderResult: ReturnType<AppContextTestRender['render']>;

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    onRemoveMock = jest.fn();
    onChangeMock = jest.fn();
    onVisitedMock = jest.fn();
    props = {
      os: OperatingSystem.WINDOWS,
      entry: baseEntry,
      showLabels: true,
      onRemove: onRemoveMock,
      onChange: onChangeMock,
      onVisited: onVisitedMock,
      'data-test-subj': formPrefix,
      isRemoveDisabled: false,
    };
  });

  afterEach(() => {
    cleanup();
  });

  const render = () => {
    return (renderResult = mockedContext.render(<ConditionEntryInput {...props} />));
  };

  it.each([
    { name: 'Hash md5, sha1, or sha256', expectedCall: ConditionEntryField.HASH },
    { name: 'Path The full path of the application', expectedCall: ConditionEntryField.PATH },
    { name: 'Signature The signer of the application', expectedCall: ConditionEntryField.SIGNER },
    {
      name: 'Signature The signer of the application',
      expectedCall: ConditionEntryField.SIGNER_MAC,
    },
  ])(
    'selecting `$name` should call onChange with `$expectedCall`',
    async ({ name, expectedCall }) => {
      if (expectedCall === ConditionEntryField.SIGNER_MAC) {
        props = { ...props, os: OperatingSystem.MAC };
      }
      render();
      expect(onChangeMock).toHaveBeenCalledTimes(0);
      const fieldOption = renderResult.getByTestId(`${formPrefix}-field`) as HTMLButtonElement;
      await userEvent.click(fieldOption);
      await waitForEuiPopoverOpen();
      await userEvent.click(screen.getByRole('option', { name }));
      expect(onChangeMock).toHaveBeenCalledTimes(1);
      expect(onChangeMock).toHaveBeenCalledWith({ ...baseEntry, field: expectedCall }, baseEntry);
    }
  );

  it('should call on remove for field input', async () => {
    render();
    expect(onRemoveMock).toHaveBeenCalledTimes(0);
    const removeButton = renderResult.getByTestId(`${formPrefix}-remove`) as HTMLButtonElement;
    await userEvent.click(removeButton);
    expect(onRemoveMock).toHaveBeenCalledTimes(1);
    expect(onRemoveMock).toHaveBeenCalledWith(baseEntry);
  });

  it('should not be able to call on remove for field input because disabled', async () => {
    props = { ...props, isRemoveDisabled: true };
    render();
    expect(onRemoveMock).toHaveBeenCalledTimes(0);
    const removeButton = renderResult.getByTestId(`${formPrefix}-remove`) as HTMLButtonElement;
    await userEvent.click(removeButton);
    expect(onRemoveMock).toHaveBeenCalledTimes(0);
  });

  it('should call on visited for field input', async () => {
    render();
    expect(onVisitedMock).toHaveBeenCalledTimes(0);
    const value = renderResult.getByTestId(`${formPrefix}-value`);
    await fireEvent.blur(value);
    expect(onVisitedMock).toHaveBeenCalledTimes(1);
    expect(onVisitedMock).toHaveBeenCalledWith(baseEntry);
  });

  it('should not call on visited for field change if value is empty', async () => {
    props = { ...props, entry: { ...baseEntry, value: '' } };
    render();
    expect(onVisitedMock).toHaveBeenCalledTimes(0);
    const field = renderResult.getByTestId(`${formPrefix}-field`);
    await fireEvent.change(field);
    await fireEvent.blur(field);
    expect(onVisitedMock).toHaveBeenCalledTimes(0);
  });

  it('should change value for field input', async () => {
    render();
    expect(onChangeMock).toHaveBeenCalledTimes(0);
    const value = renderResult.getByTestId(`${formPrefix}-value`);
    await fireEvent.change(value, { target: { value: 'new value' } });
    expect(onChangeMock).toHaveBeenCalledTimes(1);
    expect(onChangeMock).toHaveBeenCalledWith(
      {
        ...baseEntry,
        value: 'new value',
      },
      baseEntry
    );
  });

  it.each([
    { os: OperatingSystem.WINDOWS, expectedLength: 3 },
    { os: OperatingSystem.LINUX, expectedLength: 2 },
    { os: OperatingSystem.MAC, expectedLength: 3 },
  ])(
    `should be able to select $expectedLength options when OS is $os`,
    async ({ os, expectedLength }) => {
      props = { ...props, os };
      render();
      await userEvent.click(screen.getByTestId(`${formPrefix}-field`));
      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(expectedLength);
    }
  );

  it('should have operator value selected when field is HASH', () => {
    render();
    const operatorField = renderResult.getByTestId(`${formPrefix}-operator`);
    expect(operatorField).toHaveValue(OPERATOR_TITLES.is);
  });

  it('should show operator dropdown with two values when field is PATH', async () => {
    props = { ...props, entry: { ...baseEntry, field: ConditionEntryField.PATH } };
    render();
    await userEvent.click(screen.getByTestId(`${formPrefix}-operator`));
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(2);
  });
});
