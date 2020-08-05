/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getUrlPrefix } from './space_test_utils';

interface ObjectToRemove {
  spaceId: string;
  id: string;
  type: string;
  plugin: string;
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
    plugin: ObjectToRemove['plugin']
  ) {
    this.objectsToRemove.push({ spaceId, id, type, plugin });
  }

  async removeAll() {
    await Promise.all(
      this.objectsToRemove.map(({ spaceId, id, type, plugin }) => {
        return this.supertest
          .delete(`${getUrlPrefix(spaceId)}/api/${plugin}/${type}/${id}`)
          .set('kbn-xsrf', 'foo')
          .expect(204);
      })
    );
    this.objectsToRemove = [];
  }
}
