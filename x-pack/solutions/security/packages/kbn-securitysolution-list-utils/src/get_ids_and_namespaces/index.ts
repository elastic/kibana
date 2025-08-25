/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ExceptionListIdentifiers,
  NamespaceType,
} from '@kbn/securitysolution-io-ts-list-types';

export const getIdsAndNamespaces = ({
  lists,
  showDetection,
  showEndpoint,
}: {
  lists: ExceptionListIdentifiers[];
  showDetection: boolean;
  showEndpoint: boolean;
}): { ids: string[]; namespaces: NamespaceType[] } =>
  lists
    .filter((list) => {
      if (showDetection) {
        return list.type === 'detection';
      } else if (showEndpoint) {
        return list.type === 'endpoint';
      } else {
        return true;
      }
    })
    .reduce<{ ids: string[]; namespaces: NamespaceType[] }>(
      (acc, { listId, namespaceType }) => ({
        ids: [...acc.ids, listId],
        namespaces: [...acc.namespaces, namespaceType],
      }),
      { ids: [], namespaces: [] }
    );
