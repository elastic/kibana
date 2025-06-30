/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { EntityDefinitionsResponse } from '@kbn/observability-navigation-plugin/public';
import useAsync from 'react-use/lib/useAsync';
import { useKibanaContextForPlugin } from '../../../../../hooks/use_kibana';
import { EntityTableContent } from './entity_table_content';

export const EntityTable = ({ entityId }: { entityId: string }) => {
  const {
    services: { http },
  } = useKibanaContextForPlugin();

  const { value, loading } = useAsync(async () => {
    return http.fetch<EntityDefinitionsResponse[]>(
      `/internal/observability/entity_definitions/kubernetes`,
      {
        method: 'GET',
        query: {
          entityId,
        },
      }
    );
  }, [http, entityId]);

  // Placeholder for any hooks or context you might need
  return loading || !value ? (
    <></>
  ) : (
    value.map((entityDefinition) => (
      <EntityTableContent key={entityDefinition.id} entityDefinition={entityDefinition} />
    ))
  );
};
