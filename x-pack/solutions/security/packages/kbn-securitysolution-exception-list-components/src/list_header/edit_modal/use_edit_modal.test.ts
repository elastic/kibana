/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ChangeEvent, SyntheticEvent } from 'react';
import { renderHook, act } from '@testing-library/react';
import { useEditModal } from './use_edit_modal';

const listDetails = { name: 'test-name', description: 'test-description' };
const onSave = jest.fn();
describe('useEditModal', () => {
  it('should return default values based on input', () => {
    const { result } = renderHook(() => useEditModal({ listDetails, onSave }));
    const { error, newListDetails, showProgress } = result.current;
    expect(error).toBeFalsy();
    expect(newListDetails).toStrictEqual({ name: 'test-name', description: 'test-description' });
    expect(showProgress).toBeFalsy();
  });
  it('should set error when required field is empty', () => {
    const { result } = renderHook(() => useEditModal({ listDetails: { name: 'name' }, onSave }));
    const { showProgress, onBlur } = result.current;

    act(() =>
      onBlur({ target: { name: 'name', value: '' } } as unknown as ChangeEvent<HTMLInputElement>)
    );
    expect(showProgress).toBeFalsy();
    expect(result.current.newListDetails).toStrictEqual({ name: '' });
    expect(result.current.error).toBeTruthy();
  });
  it('should call onSubmit if no errors and stop the event default', () => {
    const { result } = renderHook(() => useEditModal({ listDetails, onSave }));
    const { error, onSubmit } = result.current;

    const preventDefault = jest.fn();
    act(() => onSubmit({ preventDefault } as unknown as SyntheticEvent));
    expect(error).toBeFalsy();
    expect(onSave).toBeCalled();
    expect(preventDefault).toBeCalled();
  });
});
