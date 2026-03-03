/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rootRequest } from './common';

export const deleteCriticality = (params: { idValue: string; idField: string }) => {
  return rootRequest({
    method: 'DELETE',
    url: `/internal/asset_criticality?id_value=${params.idValue}&id_field=${params.idField}`,

    failOnStatusCode: false,
    timeout: 300000,
  });
};
