/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { i18n } from '@kbn/i18n';
import { GEN_AI_SETTINGS_TOKEN_USAGE_TRACKING } from '@kbn/management-settings-ids';
import { useKibana } from '../../hooks/use_kibana';
import { getFormattedError } from '../utils/errors';

const INSTALL_TOKEN_USAGE_DASHBOARD_URL = '/internal/gen_ai_settings/install_token_usage_dashboard';

export type TokenTrackingSaveResult = 'saved' | 'failed' | 'noop';

export const useTokenTrackingForm = ({ isEnabled }: { isEnabled: boolean }) => {
  const { application, http, notifications, settings } = useKibana().services;
  const settingsClient = settings.client;
  const canEdit = isEnabled && application.capabilities.advancedSettings?.save === true;
  const tracking$ = useMemo(
    () => settingsClient.get$<boolean>(GEN_AI_SETTINGS_TOKEN_USAGE_TRACKING, false),
    [settingsClient]
  );
  const observedEnabled = useObservable(
    tracking$,
    settingsClient.get<boolean>(GEN_AI_SETTINGS_TOKEN_USAGE_TRACKING, false)
  );
  const [savedEnabled, setSavedEnabled] = useState(observedEnabled);
  const [draftEnabled, setDraftEnabled] = useState<boolean>();
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setSavedEnabled(observedEnabled);
    setDraftEnabled((current) => (current === observedEnabled ? undefined : current));
  }, [observedEnabled]);

  useEffect(() => {
    if (!canEdit) {
      setDraftEnabled(undefined);
    }
  }, [canEdit]);

  const enabled = draftEnabled ?? savedEnabled;
  const isDirty = canEdit && draftEnabled !== undefined && draftEnabled !== savedEnabled;

  const updateEnabled = useCallback(
    (nextEnabled: boolean) => {
      if (canEdit) {
        setDraftEnabled(nextEnabled === savedEnabled ? undefined : nextEnabled);
      }
    },
    [canEdit, savedEnabled]
  );

  const cancel = useCallback(() => setDraftEnabled(undefined), []);

  const save = useCallback(async (): Promise<TokenTrackingSaveResult> => {
    if (!isDirty || draftEnabled === undefined) {
      return 'noop';
    }

    const nextEnabled = draftEnabled;
    setIsSaving(true);
    let updateError: Error | undefined;
    const updateErrorSubscription = settingsClient.getUpdateErrors$().subscribe((error) => {
      updateError = error;
    });

    try {
      const wasSaved = await settingsClient.set(GEN_AI_SETTINGS_TOKEN_USAGE_TRACKING, nextEnabled);
      if (!wasSaved) {
        throw (
          updateError ??
          new Error(
            i18n.translate(
              'xpack.nightshift.settings.costEstimate.enableTrackingFailedErrorMessage',
              { defaultMessage: 'The token tracking setting could not be saved.' }
            )
          )
        );
      }

      setSavedEnabled(nextEnabled);
      setDraftEnabled(undefined);

      if (nextEnabled) {
        try {
          await http.post(INSTALL_TOKEN_USAGE_DASHBOARD_URL);
        } catch (error) {
          notifications.toasts.addWarning({
            title: i18n.translate(
              'xpack.nightshift.settings.costEstimate.installDashboardFailedTitle',
              {
                defaultMessage:
                  'Token tracking was enabled, but the token usage dashboard could not be installed',
              }
            ),
            text: getFormattedError(error).message,
          });
        }
      }

      return 'saved';
    } catch (error) {
      notifications.toasts.addDanger({
        title: nextEnabled
          ? i18n.translate('xpack.nightshift.settings.costEstimate.enableTrackingFailedTitle', {
              defaultMessage: 'Unable to enable token tracking',
            })
          : i18n.translate('xpack.nightshift.settings.costEstimate.disableTrackingFailedTitle', {
              defaultMessage: 'Unable to disable token tracking',
            }),
        text: getFormattedError(error).message,
      });
      return 'failed';
    } finally {
      updateErrorSubscription.unsubscribe();
      setIsSaving(false);
    }
  }, [draftEnabled, http, isDirty, notifications.toasts, settingsClient]);

  return {
    enabled,
    savedEnabled,
    canEdit,
    isDirty,
    isSaving,
    updateEnabled,
    cancel,
    save,
  };
};

export type TokenTrackingForm = ReturnType<typeof useTokenTrackingForm>;
