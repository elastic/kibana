/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { API_BASE_PATH } from './constants';

export const registerHelpers = (supertest) => {
  let autoFollowPatternsCreated = [];

  const loadAutoFollowPatterns = () => supertest.get(`${API_BASE_PATH}/auto_follow_patterns`);

  const getAutoFollowPattern = (id) => supertest.get(`${API_BASE_PATH}/auto_follow_patterns/${id}`);

  const createAutoFollowPattern = (payload) => {
    autoFollowPatternsCreated.push(payload.id);

    return supertest
      .post(`${API_BASE_PATH}/auto_follow_patterns`)
      .set('kbn-xsrf', 'xxx')
      .send(payload);
  };

  const deleteAutoFollowPattern = (id) => {
    autoFollowPatternsCreated = autoFollowPatternsCreated.filter((c) => c !== id);

    return supertest.delete(`${API_BASE_PATH}/auto_follow_patterns/${id}`).set('kbn-xsrf', 'xxx');
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
