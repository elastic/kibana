/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SEARCH_GETTING_STARTED_CHAT_FEATURE_FLAG } from '@kbn/search-shared-ui';
import { useKibana } from './use_kibana';

export const useGettingStartChatEnabled = () => {
  const {
    services: { cloud, featureFlags },
  } = useKibana();

  return (
    cloud &&
    cloud.isServerlessEnabled &&
    featureFlags.getBooleanValue(SEARCH_GETTING_STARTED_CHAT_FEATURE_FLAG, false)
  );
};
