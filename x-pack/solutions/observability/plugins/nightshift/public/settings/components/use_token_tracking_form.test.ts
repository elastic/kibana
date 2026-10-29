/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { BehaviorSubject, Subject } from 'rxjs';
import { GEN_AI_SETTINGS_TOKEN_USAGE_TRACKING } from '@kbn/management-settings-ids';
import { useKibana } from '../../hooks/use_kibana';
import { useTokenTrackingForm, type TokenTrackingSaveResult } from './use_token_tracking_form';

jest.mock('../../hooks/use_kibana');

const mockUseKibana = useKibana as jest.Mock;
const setUiSetting = jest.fn();
const installDashboard = jest.fn();
const addDanger = jest.fn();
const addWarning = jest.fn();

const setup = ({
  savedEnabled = false,
  canSave = true,
  isEnabled = true,
}: {
  savedEnabled?: boolean;
  canSave?: boolean;
  isEnabled?: boolean;
} = {}) => {
  const tracking$ = new BehaviorSubject(savedEnabled);
  const updateErrors$ = new Subject<Error>();
  setUiSetting.mockImplementation(async (_key: string, enabled: boolean) => {
    tracking$.next(enabled);
    return true;
  });
  mockUseKibana.mockReturnValue({
    services: {
      application: {
        capabilities: {
          advancedSettings: { save: canSave },
        },
      },
      settings: {
        client: {
          get: jest.fn().mockReturnValue(savedEnabled),
          get$: jest.fn().mockReturnValue(tracking$),
          getUpdateErrors$: jest.fn().mockReturnValue(updateErrors$),
          set: setUiSetting,
        },
      },
      http: {
        post: installDashboard,
      },
      notifications: {
        toasts: {
          addDanger,
          addWarning,
        },
      },
    },
  });

  return {
    ...renderHook(({ available }) => useTokenTrackingForm({ isEnabled: available }), {
      initialProps: { available: isEnabled },
    }),
    tracking$,
    updateErrors$,
  };
};

describe('useTokenTrackingForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setUiSetting.mockReset();
    installDashboard.mockReset().mockResolvedValue({ installed: true });
  });

  it('stages and cancels changes before saving through the shared action', async () => {
    const { result } = setup();

    act(() => result.current.updateEnabled(true));
    expect(result.current).toMatchObject({ enabled: true, isDirty: true });
    expect(setUiSetting).not.toHaveBeenCalled();

    act(() => result.current.cancel());
    expect(result.current).toMatchObject({ enabled: false, isDirty: false });

    act(() => result.current.updateEnabled(true));
    await act(async () => expect(result.current.save()).resolves.toBe('saved'));

    expect(setUiSetting).toHaveBeenCalledWith(GEN_AI_SETTINGS_TOKEN_USAGE_TRACKING, true);
    expect(installDashboard).toHaveBeenCalledWith(
      '/internal/gen_ai_settings/install_token_usage_dashboard'
    );
    expect(result.current).toMatchObject({
      enabled: true,
      savedEnabled: true,
      isDirty: false,
    });
  });

  it('does not commit an optimistic settings emission before persistence succeeds', async () => {
    let resolveSave: (saved: boolean) => void = () => {};
    const { result, tracking$ } = setup();
    setUiSetting.mockImplementation((_key: string, enabled: boolean) => {
      tracking$.next(enabled);
      return new Promise<boolean>((resolve) => {
        resolveSave = resolve;
      });
    });

    act(() => result.current.updateEnabled(true));
    let savePromise = Promise.resolve<TokenTrackingSaveResult>('noop');
    act(() => {
      savePromise = result.current.save();
    });

    expect(result.current).toMatchObject({
      enabled: true,
      savedEnabled: false,
      isDirty: true,
      isSaving: true,
    });

    await act(async () => {
      resolveSave(true);
      await savePromise;
    });

    expect(result.current).toMatchObject({
      enabled: true,
      savedEnabled: true,
      isDirty: false,
      isSaving: false,
    });
  });

  it('does not install the dashboard when disabling tracking', async () => {
    const { result } = setup({ savedEnabled: true });

    act(() => result.current.updateEnabled(false));
    await act(async () => expect(result.current.save()).resolves.toBe('saved'));

    expect(setUiSetting).toHaveBeenCalledWith(GEN_AI_SETTINGS_TOKEN_USAGE_TRACKING, false);
    expect(installDashboard).not.toHaveBeenCalled();
  });

  it('keeps tracking saved when dashboard installation fails', async () => {
    installDashboard.mockRejectedValue(new Error('dashboard unavailable'));
    const { result } = setup();

    act(() => result.current.updateEnabled(true));
    await act(async () => expect(result.current.save()).resolves.toBe('saved'));

    expect(result.current).toMatchObject({ enabled: true, isDirty: false });
    expect(addWarning).toHaveBeenCalledWith({
      title: 'Token tracking was enabled, but the token usage dashboard could not be installed',
      text: 'dashboard unavailable',
    });
    expect(addDanger).not.toHaveBeenCalled();
  });

  it('keeps a rejected change dirty and reports the settings error', async () => {
    const { result, tracking$, updateErrors$ } = setup();
    setUiSetting.mockImplementation(async (_key: string, enabled: boolean) => {
      tracking$.next(enabled);
      tracking$.next(false);
      updateErrors$.next(new Error('save rejected'));
      return false;
    });

    act(() => result.current.updateEnabled(true));
    await act(async () => expect(result.current.save()).resolves.toBe('failed'));

    expect(result.current).toMatchObject({
      enabled: true,
      savedEnabled: false,
      isDirty: true,
    });
    expect(addDanger).toHaveBeenCalledWith({
      title: 'Unable to enable token tracking',
      text: 'save rejected',
    });
    expect(installDashboard).not.toHaveBeenCalled();
  });

  it('discards hidden drafts when developer mode becomes unavailable', async () => {
    const { result, rerender } = setup();
    act(() => result.current.updateEnabled(true));

    rerender({ available: false });

    await waitFor(() =>
      expect(result.current).toMatchObject({ enabled: false, isDirty: false, canEdit: false })
    );
    expect(setUiSetting).not.toHaveBeenCalled();
  });
});
