/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useKibana } from './use_kibana';

const DISCOVER_LOCATOR_ID = 'DISCOVER_APP_LOCATOR';

export const useNavigateToDiscover = (indexName: string) => {
  const { share } = useKibana().services;

  return useCallback(async () => {
    const discoverLocator = share.url.locators.get(DISCOVER_LOCATOR_ID);
    if (discoverLocator && indexName) {
      await discoverLocator.navigate({ dataViewSpec: { title: indexName } });
    }
  }, [share, indexName]);
};
