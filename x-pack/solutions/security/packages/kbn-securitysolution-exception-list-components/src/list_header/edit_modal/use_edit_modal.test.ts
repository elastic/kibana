/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangeEvent, SyntheticEvent } from 'react';
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
  it('should call onSubmit if no errors and stop the event default', async () => {
    const { result } = renderHook(() => useEditModal({ listDetails, onSave }));
    const { error, onSubmit } = result.current;

    const preventDefault = jest.fn();
    await act(async () => onSubmit({ preventDefault } as unknown as SyntheticEvent));
    expect(error).toBeFalsy();
    expect(onSave).toHaveBeenCalled();
    expect(preventDefault).toHaveBeenCalled();
  });
  it('should show progress while saving and reset it once a failed save settles', async () => {
    let rejectSave: (error: Error) => void = () => {};
    const pendingSave = jest.fn(() => new Promise<void>((_, reject) => (rejectSave = reject)));
    const { result } = renderHook(() => useEditModal({ listDetails, onSave: pendingSave }));

    act(() => {
      result.current.onSubmit();
    });
    expect(result.current.showProgress).toBe(true);

    await act(async () => rejectSave(new Error('save failed')));
    expect(result.current.showProgress).toBe(false);
  });
});
