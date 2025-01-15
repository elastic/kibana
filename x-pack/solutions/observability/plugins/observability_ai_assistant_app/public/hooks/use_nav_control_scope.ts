/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useAIAssistantAppService } from '@kbn/ai-assistant';
import { AssistantScope } from '@kbn/ai-assistant-common';
import { useObservable } from 'react-use/lib';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import { isEqual } from 'lodash';
import { useKibana } from './use_kibana';

const scopeUrlLookup: Record<string, AssistantScope[]> = {
  [DEFAULT_APP_CATEGORIES.observability.id]: ['observability'],
  [DEFAULT_APP_CATEGORIES.enterpriseSearch.id]: ['search'],
};

export function useNavControlScope() {
  const service = useAIAssistantAppService();

  const {
    services: { application },
  } = useKibana();

  const currentApplication = useObservable(application.currentAppId$);
  const applications = useObservable(application.applications$);

  useEffect(() => {
    const currentCategoryId =
      (currentApplication && applications?.get(currentApplication)?.category?.id) ||
      DEFAULT_APP_CATEGORIES.kibana.id;
    const newScopes = scopeUrlLookup[currentCategoryId];
    if (newScopes?.length && !isEqual(service.getScopes(), newScopes)) {
      service.setScopes(newScopes);
    }
  }, [applications, currentApplication, service]);
}
