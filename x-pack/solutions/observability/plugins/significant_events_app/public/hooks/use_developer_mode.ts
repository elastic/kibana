/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { i18n } from '@kbn/i18n';
import { OBSERVABILITY_NIGHTSHIFT_DEVELOPER_MODE } from '@kbn/management-settings-ids';
import { useKibana } from './use_kibana';
import { getFormattedError } from '../util/errors';

export interface UseDeveloperModeResult {
  isDeveloperMode: boolean;
  isSaving: boolean;
  setDeveloperMode: (enabled: boolean) => Promise<void>;
}

export const useDeveloperMode = (): UseDeveloperModeResult => {
  const { core } = useKibana();
  const settingsClient = core.settings.client;
  const developerMode$ = useMemo(
    () => settingsClient.get$<boolean>(OBSERVABILITY_NIGHTSHIFT_DEVELOPER_MODE, false),
    [settingsClient]
  );
  const isDeveloperMode = useObservable(
    developerMode$,
    settingsClient.get<boolean>(OBSERVABILITY_NIGHTSHIFT_DEVELOPER_MODE, false)
  );

  const [{ loading: isSaving }, setDeveloperMode] = useAsyncFn(
    async (enabled: boolean): Promise<void> => {
      try {
        const wasSaved = await settingsClient.set(OBSERVABILITY_NIGHTSHIFT_DEVELOPER_MODE, enabled);
        if (!wasSaved) {
          throw new Error(
            i18n.translate(
              'xpack.significantEventsApp.settings.developerModeSaveFailedErrorMessage',
              {
                defaultMessage: 'The Nightshift developer mode setting could not be saved.',
              }
            )
          );
        }
      } catch (error) {
        core.notifications.toasts.addDanger({
          title: i18n.translate(
            'xpack.significantEventsApp.settings.developerModeSaveFailedTitle',
            {
              defaultMessage: 'Unable to update Nightshift developer mode',
            }
          ),
          text: getFormattedError(error).message,
        });
      }
    },
    [core.notifications.toasts, settingsClient]
  );

  return {
    isDeveloperMode: isDeveloperMode ?? false,
    isSaving,
    setDeveloperMode,
  };
};
