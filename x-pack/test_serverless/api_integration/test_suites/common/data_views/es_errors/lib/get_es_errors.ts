/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { Client } from '@elastic/elasticsearch';

export async function getIndexNotFoundError(es: Client) {
  try {
    await es.indices.get({
      index: 'SHOULD NOT EXIST',
    });
  } catch (err) {
    expect(err).to.have.property('statusCode', 404); // basic check
    return err;
  }

  throw new Error('Expected es.indices.get() call to fail');
}

export async function getDocNotFoundError(es: Client) {
  try {
    await es.get({
      index: 'basic_index',
      id: '1234',
    });
  } catch (err) {
    expect(err).to.have.property('statusCode', 404); // basic check
    return err;
  }

  throw new Error('Expected es.get() call to fail');
}
