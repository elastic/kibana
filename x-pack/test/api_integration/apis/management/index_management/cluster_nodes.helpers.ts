/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_BASE_PATH } from './constants';

export const registerHelpers = ({ supertest }: { supertest: any }) => {
  const getNodesPlugins = () => supertest.get(`${API_BASE_PATH}/nodes/plugins`);

  return {
    getNodesPlugins,
  };
};
