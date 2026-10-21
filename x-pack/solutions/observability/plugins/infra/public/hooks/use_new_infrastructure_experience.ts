/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { NEW_INFRASTRUCTURE_EXPERIENCE_KEY } from '../../common/ui_settings_keys';
import { useKibanaContextForPlugin } from './use_kibana';

export function useNewInfrastructureExperience() {
  const { services } = useKibanaContextForPlugin();

  const value = services.uiSettings.get<boolean>(NEW_INFRASTRUCTURE_EXPERIENCE_KEY, false);

  const setValue = useCallback(
    async (enabled: boolean) => {
      const saved = await services.uiSettings.set(NEW_INFRASTRUCTURE_EXPERIENCE_KEY, enabled);
      if (saved) window.location.reload();
    },
    [services]
  );

  return [value, setValue] as const;
}
