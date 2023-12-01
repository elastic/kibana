/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Document } from './types';

/**
 * returns KQL query from a list documents that includes all documents by their ids.
 * it can be used later to create test rules that will query only these documents
 * ```ts
 *   const documents = [
        {
          foo: 'bar',
          id: 'f07df596-65ec-4ab1-b0b2-f3b69558ed26',
          '@timestamp': '2020-10-29T07:10:51.989Z',
        },
        {
          foo: 'bar',
          id: 'e07614f9-1dc5-4849-90c4-31362bbdf8d0',
          '@timestamp': '2020-10-30T00:32:48.987Z',
        },
        {
          foo: 'test',
          id: 'e03a5b12-77e6-4aa3-b0be-fbe5b0843f07',
          '@timestamp': '2020-10-29T03:40:35.318Z',
        },
    ];

    const query = getKQLQueryFromDocumentList(documents);

    // query equals to 
    // (id: "f07df596-65ec-4ab1-b0b2-f3b69558ed26" or id: "e07614f9-1dc5-4849-90c4-31362bbdf8d0" or id: "e03a5b12-77e6-4aa3-b0be-fbe5b0843f07")
 * ```
 */
export const getKQLQueryFromDocumentList = (documents: Document[]) => {
  const orClauses = documents.map(({ id }) => `id: "${id}"`).join(' or ');

  return `(${orClauses})`;
};
