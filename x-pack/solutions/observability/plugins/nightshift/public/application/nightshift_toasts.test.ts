/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import type { Toast } from '@kbn/core/public';
import { createNightshiftToasts } from './nightshift_toasts';

const setup = (lifetimes: Record<string, number | string> = {}) => {
  const { notifications, uiSettings } = coreMock.createStart();
  const settings: Record<string, number | string> = {
    'notifications:lifetime:info': 5000,
    'notifications:lifetime:warning': 10000,
    'notifications:lifetime:error': 300000,
    ...lifetimes,
  };
  uiSettings.get.mockImplementation((key: string) => settings[key]);

  let nextId = 0;
  const createToast = (): Toast => ({ id: String(nextId++) });
  const { toasts } = notifications;
  [
    toasts.add,
    toasts.addInfo,
    toasts.addSuccess,
    toasts.addWarning,
    toasts.addDanger,
    toasts.addError,
  ].forEach((method) => (method as jest.Mock).mockImplementation(createToast));

  return { coreToasts: toasts, nightshiftToasts: createNightshiftToasts(toasts, uiSettings) };
};

describe('createNightshiftToasts', () => {
  describe('lifetime caps', () => {
    it('caps success and info toasts at 4s', () => {
      const { coreToasts, nightshiftToasts } = setup();

      nightshiftToasts.addSuccess('saved');
      nightshiftToasts.addInfo({ title: 'fyi' });

      expect(coreToasts.addSuccess).toHaveBeenCalledWith('saved', { toastLifeTimeMs: 4000 });
      expect(coreToasts.addInfo).toHaveBeenCalledWith({ title: 'fyi' }, { toastLifeTimeMs: 4000 });
    });

    it('caps warning and danger toasts at 8s', () => {
      const { coreToasts, nightshiftToasts } = setup();

      nightshiftToasts.addWarning('careful');
      nightshiftToasts.addDanger('failed');

      expect(coreToasts.addWarning).toHaveBeenCalledWith('careful', { toastLifeTimeMs: 8000 });
      expect(coreToasts.addDanger).toHaveBeenCalledWith('failed', { toastLifeTimeMs: 8000 });
    });

    it('caps error toasts at 15s and keeps the other options', () => {
      const { coreToasts, nightshiftToasts } = setup();
      const error = new Error('boom');

      nightshiftToasts.addError(error, { title: 'Could not save', toastMessage: 'try again' });

      expect(coreToasts.addError).toHaveBeenCalledWith(error, {
        title: 'Could not save',
        toastMessage: 'try again',
        toastLifeTimeMs: 15000,
      });
    });

    it('caps `add` like an info toast, also for a lifetime passed in the toast', () => {
      const { coreToasts, nightshiftToasts } = setup();

      nightshiftToasts.add('plain');
      nightshiftToasts.add({ title: 'long', toastLifeTimeMs: 60000 });

      expect(coreToasts.add).toHaveBeenNthCalledWith(1, { title: 'plain', toastLifeTimeMs: 4000 });
      expect(coreToasts.add).toHaveBeenNthCalledWith(2, { title: 'long', toastLifeTimeMs: 4000 });
    });

    it('caps a longer lifetime requested by the caller', () => {
      const { coreToasts, nightshiftToasts } = setup();

      nightshiftToasts.addSuccess('saved', { toastLifeTimeMs: 60000 });
      nightshiftToasts.addSuccess({ title: 'saved', toastLifeTimeMs: 60000 });

      expect(coreToasts.addSuccess).toHaveBeenNthCalledWith(1, 'saved', { toastLifeTimeMs: 4000 });
      expect(coreToasts.addSuccess).toHaveBeenNthCalledWith(
        2,
        { title: 'saved', toastLifeTimeMs: 60000 },
        { toastLifeTimeMs: 4000 }
      );
    });

    it('keeps a shorter lifetime requested by the caller', () => {
      const { coreToasts, nightshiftToasts } = setup();
      const error = new Error('boom');

      nightshiftToasts.addSuccess('saved', { toastLifeTimeMs: 1000 });
      nightshiftToasts.addError(error, { title: 'Could not save', toastLifeTimeMs: 2000 });

      expect(coreToasts.addSuccess).toHaveBeenCalledWith('saved', { toastLifeTimeMs: 1000 });
      expect(coreToasts.addError).toHaveBeenCalledWith(error, {
        title: 'Could not save',
        toastLifeTimeMs: 2000,
      });
    });

    it('keeps a shorter lifetime from the advanced settings', () => {
      const { coreToasts, nightshiftToasts } = setup({
        'notifications:lifetime:info': 2000,
        'notifications:lifetime:warning': 3000,
        'notifications:lifetime:error': 6000,
      });
      const error = new Error('boom');

      nightshiftToasts.addSuccess('saved');
      nightshiftToasts.addWarning('careful');
      nightshiftToasts.addError(error, { title: 'Could not save' });

      expect(coreToasts.addSuccess).toHaveBeenCalledWith('saved', { toastLifeTimeMs: 2000 });
      expect(coreToasts.addWarning).toHaveBeenCalledWith('careful', { toastLifeTimeMs: 3000 });
      expect(coreToasts.addError).toHaveBeenCalledWith(error, {
        title: 'Could not save',
        toastLifeTimeMs: 6000,
      });
    });

    it('caps a lifetime setting of "Infinity"', () => {
      const { coreToasts, nightshiftToasts } = setup({ 'notifications:lifetime:info': 'Infinity' });

      nightshiftToasts.addSuccess('saved');

      expect(coreToasts.addSuccess).toHaveBeenCalledWith('saved', { toastLifeTimeMs: 4000 });
    });
  });

  describe('delegation', () => {
    it('returns the toasts created by Core', () => {
      const { coreToasts, nightshiftToasts } = setup();

      expect(nightshiftToasts.addSuccess('saved')).toEqual({ id: '0' });
      expect(nightshiftToasts.addError(new Error('boom'), { title: 'Failed' })).toEqual({
        id: '1',
      });
      expect(coreToasts.addSuccess).toHaveBeenCalledTimes(1);
      expect(coreToasts.addError).toHaveBeenCalledTimes(1);
    });

    it('delegates `remove` and `get$` to Core', () => {
      const { coreToasts, nightshiftToasts } = setup();

      nightshiftToasts.remove('7');
      nightshiftToasts.get$();

      expect(coreToasts.remove).toHaveBeenCalledWith('7');
      expect(coreToasts.get$).toHaveBeenCalledTimes(1);
    });
  });

  describe('dismissAll', () => {
    it('removes only the toasts added through the wrapper', () => {
      const { coreToasts, nightshiftToasts } = setup();
      const success = nightshiftToasts.addSuccess('saved');
      const error = nightshiftToasts.addError(new Error('boom'), { title: 'Failed' });
      // Another plugin's toast, added straight to Core.
      coreToasts.addSuccess('other plugin');

      nightshiftToasts.dismissAll();

      expect(coreToasts.remove).toHaveBeenCalledTimes(2);
      expect(coreToasts.remove).toHaveBeenCalledWith(success);
      expect(coreToasts.remove).toHaveBeenCalledWith(error);
    });

    it('does not remove a toast that was already removed, or removes it twice', () => {
      const { coreToasts, nightshiftToasts } = setup();
      const first = nightshiftToasts.addSuccess('first');
      nightshiftToasts.addSuccess('second');
      nightshiftToasts.remove(first);
      (coreToasts.remove as jest.Mock).mockClear();

      nightshiftToasts.dismissAll();
      nightshiftToasts.dismissAll();

      expect(coreToasts.remove).toHaveBeenCalledTimes(1);
      expect(coreToasts.remove).toHaveBeenCalledWith(expect.objectContaining({ id: '1' }));
    });
  });
});
