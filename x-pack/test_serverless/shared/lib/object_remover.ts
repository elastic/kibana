/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SuperTest, Test } from 'supertest';
import { getUrlPathPrefixForSpace } from './space_path_prefix';
import { InternalRequestHeader, RoleCredentials, SupertestWithoutAuthType } from '../services';

export interface ObjectToRemove {
  spaceId: string;
  id: string;
  type: string;
  plugin: string;
  isInternal?: boolean;
}

export interface DeleteObjectParams {
  supertest: SupertestWithoutAuthType;
  url: string;
  plugin: string;
}

/**
 * Add a saved object to the collection.  It will be deleted as
 *
 *       DELETE [/s/{spaceId}]/[api|internal]/{plugin}/{type}/{id}
 *
 * @param spaceId The space ID
 * @param id The saved object ID
 * @param type The saved object type
 * @param plugin The plugin name
 * @param isInternal Whether the saved object is internal or not (default false/external)
 */
export const add =
  (
    spaceId: ObjectToRemove['spaceId'],
    id: ObjectToRemove['id'],
    type: ObjectToRemove['type'],
    plugin: ObjectToRemove['plugin'],
    isInternal?: ObjectToRemove['isInternal']
  ) =>
  (objectsToRemove: ObjectToRemove[]): ObjectToRemove[] => {
    objectsToRemove.push({ spaceId, id, type, plugin, isInternal });
    return objectsToRemove;
  };

export const removeAll = async (
  loggerFn: (...args: any[]) => void,
  internalReqHeader: InternalRequestHeader,
  roleAuthc: RoleCredentials,
  supertest: SuperTest<Test> | SupertestWithoutAuthType,
  objectsToRemove: ObjectToRemove[]
): Promise<ObjectToRemove[]> => {
  await Promise.all(
    objectsToRemove.map(({ spaceId, id, type, plugin, isInternal }) => {
      const url = `${getUrlPathPrefixForSpace(spaceId)}/${
        isInternal ? 'internal' : 'api'
      }/${plugin}/${type}/${id}`;
      return deleteObject({ supertest, url, plugin })(loggerFn, internalReqHeader, roleAuthc);
    })
  );
  objectsToRemove = [];
  return objectsToRemove as ObjectToRemove[];
};

export const deleteObject =
  ({ supertest, url, plugin }: DeleteObjectParams) =>
  async (
    loggerFn: (arg0: string, arg1: any) => void,
    internalReqHeader: InternalRequestHeader,
    roleAuthc: RoleCredentials
  ): Promise<void> => {
    const result = await supertest.delete(url).set(internalReqHeader).set(roleAuthc.apiKeyHeader);

    if (plugin === 'saved_objects' && result.status === 200) return;
    if (plugin !== 'saved_objects' && result.status === 204) return;

    loggerFn(
      `ObjectRemover: unexpected status deleting ${url}: ${result.status}`,
      result.body.text
    );
  };
