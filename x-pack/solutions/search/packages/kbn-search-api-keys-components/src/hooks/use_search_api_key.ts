/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useContext, useEffect } from 'react';
import { ApiKeyContext } from '../providers/search_api_key_provider';

export const useSearchApiKey = () => {
  const { initialiseKey, ...context } = useContext(ApiKeyContext);
  useEffect(() => {
    initialiseKey();
  }, [initialiseKey]);
  return context;
};
