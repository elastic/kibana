/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreTheme } from '@kbn/core/public';
import useObservable from 'react-use/lib/useObservable';
import { useKibanaContextForPlugin } from './use_kibana';

export const useIsDarkMode = () => {
  const { services } = useKibanaContextForPlugin();
  const { darkMode } = useObservable<CoreTheme>(services.theme.theme$, services.theme.getTheme());

  return darkMode;
};
