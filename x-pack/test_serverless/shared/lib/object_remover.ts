/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SuperTest, Test } from 'supertest';

import { getUrlPathPrefixForSpace } from './space_path_prefix';

interface ObjectToRemove {
  spaceId: string;
  id: string;
  type: string;
  plugin: string;
  isInternal?: boolean;
}

export class ObjectRemover {
  private readonly supertest: SuperTest<Test>;
  private objectsToRemove: ObjectToRemove[] = [];

  constructor(supertest: SuperTest<Test>) {
    this.supertest = supertest;
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
  add(
    spaceId: ObjectToRemove['spaceId'],
    id: ObjectToRemove['id'],
    type: ObjectToRemove['type'],
    plugin: ObjectToRemove['plugin'],
    isInternal?: ObjectToRemove['isInternal']
  ) {
    this.objectsToRemove.push({ spaceId, id, type, plugin, isInternal });
  }

  async removeAll() {
    await Promise.all(
      this.objectsToRemove.map(({ spaceId, id, type, plugin, isInternal }) => {
        const url = `${getUrlPathPrefixForSpace(spaceId)}/${
          isInternal ? 'internal' : 'api'
        }/${plugin}/${type}/${id}`;
        return deleteObject({ supertest: this.supertest, url, plugin });
      })
    );
    this.objectsToRemove = [];
  }
}

interface DeleteObjectParams {
  supertest: SuperTest<Test>;
  url: string;
  plugin: string;
}

async function deleteObject({ supertest, url, plugin }: DeleteObjectParams) {
  const result = await supertest
    .delete(url)
    .set('kbn-xsrf', 'foo')
    .set('x-elastic-internal-origin', 'foo');

  if (plugin === 'saved_objects' && result.status === 200) return;
  if (plugin !== 'saved_objects' && result.status === 204) return;

  // eslint-disable-next-line no-console
  console.log(
    `ObjectRemover: unexpected status deleting ${url}: ${result.status}`,
    result.body.text
  );
}
