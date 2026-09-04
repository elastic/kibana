/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rootRequest } from './common';
import { getSpaceUrl } from '../space';

const IMPORT_FORM_BOUNDARY = 'CypressSavedObjectsImportBoundary';
const SAVED_OBJECTS_IMPORT_PATH = '/api/saved_objects/_import?overwrite=true';
const SAVED_OBJECTS_BULK_DELETE_PATH = '/api/saved_objects/_bulk_delete?force=true';

interface ImportedSavedObject {
  type: string;
  id: string;
}

interface ImportSavedObjectsResponse {
  successResults?: Array<{ type: string; id: string; destinationId?: string }>;
}

/**
 * Imports an ndjson export (created by the saved objects export API) via the
 * `/api/saved_objects/_import` endpoint. `cy.request` cannot send a real
 * `multipart/form-data` payload, so the body is built by hand: it only needs a
 * single `file` field, which is straightforward since the ndjson content is plain text.
 *
 * Resolves with the objects' actual ids, i.e. `destinationId` when Kibana reassigns one
 * (e.g. for a multi-namespace type whose literal id already has an origin registered
 * elsewhere), otherwise falls back to the literal id from the fixture. Pass this straight
 * to `deleteSavedObjects` so cleanup targets what was actually created rather than assuming
 * the literal fixture id, which would silently no-op (404) on a reassigned object and leave
 * it (and its origin registration) behind to break a later import of the same literal id.
 */
export const importSavedObjects = (
  fixturePath: string,
  spaceId?: string
): Cypress.Chainable<ImportedSavedObject[]> => {
  return cy.readFile(fixturePath, 'utf8').then((ndjsonContent: string) => {
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

    const url = spaceId
      ? getSpaceUrl(spaceId, SAVED_OBJECTS_IMPORT_PATH)
      : SAVED_OBJECTS_IMPORT_PATH;

    return rootRequest<ImportSavedObjectsResponse>({
      method: 'POST',
      url,
      headers: { 'content-type': `multipart/form-data; boundary=${IMPORT_FORM_BOUNDARY}` },
      body,
    }).then((response) =>
      (response.body.successResults ?? []).map(({ type, id, destinationId }) => ({
        type,
        id: destinationId ?? id,
      }))
    );
  });
};

export const deleteSavedObjects = (
  objects: Array<{ type: string; id: string }>,
  spaceId?: string
) => {
  const url = spaceId
    ? getSpaceUrl(spaceId, SAVED_OBJECTS_BULK_DELETE_PATH)
    : SAVED_OBJECTS_BULK_DELETE_PATH;

  rootRequest({
    method: 'POST',
    url,
    body: objects,
    failOnStatusCode: false,
  });
};
