/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback } from 'react';
import type { InventoryEntity } from '../../common/entities';
import { useAdHocDataView } from './use_adhoc_data_view';
import { useKibana } from './use_kibana';
import { useUnifiedSearchContext } from './use_unified_search_context';

export const useDiscoverRedirect = (entity: InventoryEntity) => {
  const {
    services: { share, application, entityManager },
  } = useKibana();
  const { definitionIndexPatterns } = useUnifiedSearchContext();
  const { dataView } = useAdHocDataView(definitionIndexPatterns[entity.entityType].join(',') ?? '');
  const discoverLocator = share.url.locators.get('DISCOVER_APP_LOCATOR');

  const getDiscoverEntitiesRedirectUrl = useCallback(() => {
    const entityKqlFilter = entity
      ? entityManager.entityClient.asKqlFilter({
          entity,
        })
      : '';

    return application.capabilities.discover?.show
      ? discoverLocator?.getRedirectUrl({
          indexPatternId: dataView?.id ?? '',
          query: { query: entityKqlFilter, language: 'kuery' },
        })
      : undefined;
  }, [
    application.capabilities.discover?.show,
    dataView?.id,
    discoverLocator,
    entity,
    entityManager.entityClient,
  ]);

  return { getDiscoverEntitiesRedirectUrl };
};
