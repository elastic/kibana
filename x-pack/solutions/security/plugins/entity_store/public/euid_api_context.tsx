/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';
import type React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import type { IdentitySourceFields } from '../common/constants';

export interface EntityStoreEuidApi {
  euid: {
    getEuidFromObject: (entityType: string, doc: unknown) => string | undefined;
    getEuidPainlessEvaluation: (entityType: string) => string;
    getEuidPainlessRuntimeMapping: (entityType: string) => {
      type: 'keyword';
      script: { source: string };
    };
    getEuidDslFilterBasedOnDocument: (entityType: string, doc: unknown) => unknown;
    getEuidDslDocumentsContainsIdFilter: (entityType: string) => unknown;
    getEuidSourceFields: (entityType: string) => IdentitySourceFields;
    getEntityIdentifiersFromDocument: (
      entityType: string,
      doc: unknown
    ) => Record<string, string> | undefined;
  };
  buildEntityFiltersFromEntityIdentifiers: (
    entityIdentifiers: Record<string, string>
  ) => QueryDslQueryContainer[];
  buildGenericEntityFlyoutPreviewQuery: (
    entityIdentifiers: Record<string, string>,
    status?: string,
    queryField?: string
  ) => { bool: { filter: QueryDslQueryContainer[] } };
}

const EntityStoreEuidApiContext = createContext<EntityStoreEuidApi | null>(null);

export function EntityStoreEuidApiProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [api, setApi] = useState<EntityStoreEuidApi | null>(null);

  useEffect(() => {
    let cancelled = false;
    import('./euid_browser').then((mod) => {
      if (!cancelled) {
        setApi({
          euid: mod.euid,
          buildEntityFiltersFromEntityIdentifiers: mod.buildEntityFiltersFromEntityIdentifiers,
          buildGenericEntityFlyoutPreviewQuery: mod.buildGenericEntityFlyoutPreviewQuery,
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <EntityStoreEuidApiContext.Provider value={api}>{children}</EntityStoreEuidApiContext.Provider>
  );
}

export function useEntityStoreEuidApi(): EntityStoreEuidApi | null {
  return useContext(EntityStoreEuidApiContext);
}
