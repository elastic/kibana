/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback, useContext } from 'react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { SyntheticsCCSSettings } from '../../../../../../../common/runtime_types';
import { SYNTHETICS_API_URLS } from '../../../../../../../common/constants';
import { apiService } from '../../../../../../utils/api_service';
import { SyntheticsRefreshContext } from '../../../../contexts';

export const usePutCCSSettings = () => {
  const [isSaving, setIsSaving] = useState(false);
  const { notifications } = useKibana().services;
  const { refreshApp } = useContext(SyntheticsRefreshContext);

  const saveSettings = useCallback(
    async (settings: SyntheticsCCSSettings) => {
      setIsSaving(true);
      try {
        const result = await apiService.put(SYNTHETICS_API_URLS.DYNAMIC_SETTINGS, settings);
        notifications?.toasts.addSuccess({
          title: i18n.translate('xpack.synthetics.settings.ccs.saveSuccess', {
            defaultMessage: 'CCS settings saved successfully',
          }),
        });
        refreshApp();
        return result;
      } catch (error) {
        notifications?.toasts.addError(error, {
          title: i18n.translate('xpack.synthetics.settings.ccs.saveError', {
            defaultMessage: 'Failed to save CCS settings',
          }),
        });
      } finally {
        setIsSaving(false);
      }
    },
    [notifications, refreshApp]
  );

  return { saveSettings, isSaving };
};
