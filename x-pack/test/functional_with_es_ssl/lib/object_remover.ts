/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface ObjectToRemove {
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
    id: ObjectToRemove['id'],
    type: ObjectToRemove['type'],
    plugin: ObjectToRemove['plugin'],
    isInternal?: ObjectToRemove['isInternal']
  ) {
    this.objectsToRemove.push({ id, type, plugin, isInternal });
  }

  async removeAll() {
    await Promise.all(
      this.objectsToRemove.map(({ id, type, plugin, isInternal }) => {
        return this.supertest
          .delete(`/${isInternal ? 'internal' : 'api'}/${plugin}/${type}/${id}`)
          .set('kbn-xsrf', 'foo')
          .expect(204);
      })
    );
    this.objectsToRemove = [];
  }
}
