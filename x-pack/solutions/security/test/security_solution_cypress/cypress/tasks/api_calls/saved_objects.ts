/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rootRequest } from './common';

const IMPORT_FORM_BOUNDARY = 'CypressSavedObjectsImportBoundary';

/**
 * Imports an ndjson export (created by the saved objects export API) via the
 * `/api/saved_objects/_import` endpoint. `cy.request` cannot send a real
 * `multipart/form-data` payload, so the body is built by hand: it only needs a
 * single `file` field, which is straightforward since the ndjson content is plain text.
 */
export const importSavedObjects = (fixturePath: string) => {
  cy.readFile(fixturePath, 'utf8').then((ndjsonContent: string) => {
    const fileName = fixturePath.split('/').pop();
    if (!fileName) {
      throw new Error(`Unable to determine file name from fixturePath: "${fixturePath}"`);
    }
    const body = [
      `--${IMPORT_FORM_BOUNDARY}`,
      `Content-Disposition: form-data; name="file"; filename="${fileName}"`,
      'Content-Type: application/ndjson',
      '',
      ndjsonContent,
      `--${IMPORT_FORM_BOUNDARY}--`,
      '',
    ].join('\r\n');

    rootRequest({
      method: 'POST',
      url: '/api/saved_objects/_import?overwrite=true',
      headers: { 'content-type': `multipart/form-data; boundary=${IMPORT_FORM_BOUNDARY}` },
      body,
    });
  });
};

export const deleteSavedObjects = (objects: Array<{ type: string; id: string }>) => {
  rootRequest({
    method: 'POST',
    url: '/api/saved_objects/_bulk_delete?force=true',
    body: objects,
    failOnStatusCode: false,
  });
};
