/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildDocumentsRequest } from './use_fetch_document_details';

describe('buildDocumentsRequest', () => {
  it('looks documents up by _id so events without event.id are found', () => {
    const request = buildDocumentsRequest('logs-*', ['doc-1', 'doc-2'], 0, 10);

    expect(request.query).toEqual({
      bool: { filter: [{ ids: { values: ['doc-1', 'doc-2'] } }] },
    });
  });

  it('paginates with the given page index and size', () => {
    const request = buildDocumentsRequest('logs-*', ['doc-1'], 2, 25);

    expect(request).toMatchObject({ index: 'logs-*', from: 50, size: 25 });
  });
});
