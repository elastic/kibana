/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { API_BASE_PATH } from './constants';

export const registerHelpers = ({ supertest }) => {
  const closeIndex = (index) => {
    const indices = Array.isArray(index) ? index : [index];

    return supertest.post(`${API_BASE_PATH}/indices/close`)
      .set('kbn-xsrf', 'xxx')
      .send({ indices });
  };

  const flushIndex = (index) => {
    const indices = Array.isArray(index) ? index : [index];

    return supertest.post(`${API_BASE_PATH}/indices/flush`)
      .set('kbn-xsrf', 'xxx')
      .send({ indices });
  };

  return {
    closeIndex,
    flushIndex,
  };
};
