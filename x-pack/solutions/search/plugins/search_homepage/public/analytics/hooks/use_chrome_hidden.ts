/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { storeHasData } from '@kbn/search-shared-ui';
import { useKibana } from '../../hooks/use_kibana';

/**
 * Hides the Kibana header and navigation while the deployment holds no data. `undefined` means
 * not known yet, which leaves the chrome as the page load decided it.
 */
export const useChromeHidden = (isHidden: boolean | undefined): void => {
  const { reportHasData, setChromeHidden } = useKibana().services;

  useEffect(() => {
    if (isHidden === undefined) {
      return;
    }
    setChromeHidden(isHidden);
    storeHasData(!isHidden);
    reportHasData(!isHidden);
  }, [isHidden, reportHasData, setChromeHidden]);
};
