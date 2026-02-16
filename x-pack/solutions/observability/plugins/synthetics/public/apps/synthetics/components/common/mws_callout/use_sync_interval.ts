/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectDynamicSettings } from '../../../state/settings/selectors';
import { getDynamicSettingsAction } from '../../../state/settings/actions';
import { DYNAMIC_SETTINGS_DEFAULTS } from '../../../../../../common/constants/settings_defaults';

export const useSyncInterval = (): number => {
  const dispatch = useDispatch();
  const { settings } = useSelector(selectDynamicSettings);

  useEffect(() => {
    if (!settings) {
      dispatch(getDynamicSettingsAction.get());
    }
  }, [dispatch, settings]);

  return (
    settings?.privateLocationsSyncInterval ??
    DYNAMIC_SETTINGS_DEFAULTS.privateLocationsSyncInterval ??
    5
  );
};
