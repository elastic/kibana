/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getUrlPrefix } from './space_test_utils';

interface ObjectToRemove {
  spaceId: string;
  id: string;
  type: string;
  plugin: string;
  isInternal?: boolean;
}

export class ObjectRemover {
  private readonly supertest: any;
  private objectsToRemove: ObjectToRemove[] = [];

  constructor(supertest: any) {
    this.supertest = supertest;
  }

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
        return this.supertest
          .delete(
            `${getUrlPrefix(spaceId)}/${isInternal ? 'internal' : 'api'}/${plugin}/${type}/${id}`
          )
          .set('kbn-xsrf', 'foo')
          .expect(plugin === 'saved_objects' ? 200 : 204);
      })
    );
    this.objectsToRemove = [];
  }
}
