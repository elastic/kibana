/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaClient } from '@elastic/elasticsearch/api/kibana';
import expect from '@kbn/expect';
import { SavedObjectAccessControl } from 'src/core/types';

const getDocumentId = (savedObjectType: string, savedObjectId: string, spaceId: string) => {
  return spaceId === 'default'
    ? `${savedObjectType}:${savedObjectId}`
    : `${spaceId}:${savedObjectType}:${savedObjectId}`;
};

export const assertSavedObjectExists = async (
  es: KibanaClient,
  savedObjectType: string,
  savedObjectId: string,
  spaceId: string = 'default'
) => {
  const documentId = getDocumentId(savedObjectType, savedObjectId, spaceId);

  const resp = await es.get(
    {
      index: '.kibana',
      id: documentId,
    },
    { ignore: [404] }
  );

  expect(resp.statusCode).to.eql(200);
};

export const assertSavedObjectAccessControl = async (
  es: KibanaClient,
  savedObjectType: string,
  savedObjectId: string,
  spaceId: string,
  accessControl: SavedObjectAccessControl | undefined
) => {
  const documentId = getDocumentId(savedObjectType, savedObjectId, spaceId);

  const resp = await es.get<{ accessControl: Record<string, any> }>(
    {
      index: '.kibana',
      id: documentId,
    },
    { ignore: [404] }
  );

  expect(resp.statusCode).to.eql(200);
  expect(resp.body?._source?.accessControl).to.eql(accessControl);
};

export const assertSavedObjectMissing = async (
  es: KibanaClient,
  savedObjectType: string,
  savedObjectId: string,
  spaceId: string = 'default'
) => {
  const documentId = getDocumentId(savedObjectType, savedObjectId, spaceId);

  const resp = await es.get(
    {
      index: '.kibana',
      id: documentId,
    },
    { ignore: [404] }
  );

  expect(resp.statusCode).to.eql(404);
};
