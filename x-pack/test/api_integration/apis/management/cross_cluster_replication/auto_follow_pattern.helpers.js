/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { API_BASE_PATH } from './constants';
import { getRandomString } from './lib';
import { getAutoFollowIndexPayload } from './fixtures';

export const registerHelpers = supertest => {
  let autoFollowPatternsCreated = [];

  const loadAutoFollowPatterns = () => supertest.get(`${API_BASE_PATH}/auto_follow_patterns`);

  const getAutoFollowPattern = name =>
    supertest.get(`${API_BASE_PATH}/auto_follow_patterns/${name}`);

  const createAutoFollowPattern = (
    name = getRandomString(),
    payload = getAutoFollowIndexPayload()
  ) => {
    autoFollowPatternsCreated.push(name);

    return supertest
      .post(`${API_BASE_PATH}/auto_follow_patterns`)
      .set('kbn-xsrf', 'xxx')
      .send({ ...payload, id: name });
  };

  const deleteAutoFollowPattern = name => {
    autoFollowPatternsCreated = autoFollowPatternsCreated.filter(c => c !== name);

    return supertest.delete(`${API_BASE_PATH}/auto_follow_patterns/${name}`).set('kbn-xsrf', 'xxx');
  };

  const deleteAllAutoFollowPatterns = () =>
    Promise.all(autoFollowPatternsCreated.map(deleteAutoFollowPattern)).then(() => {
      autoFollowPatternsCreated = [];
    });

  return {
    loadAutoFollowPatterns,
    getAutoFollowPattern,
    createAutoFollowPattern,
    deleteAutoFollowPattern,
    deleteAllAutoFollowPatterns,
  };
};
