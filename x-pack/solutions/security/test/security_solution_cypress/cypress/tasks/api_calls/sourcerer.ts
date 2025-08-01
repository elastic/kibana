/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rootRequest } from './common';

export const deleteRuntimeField = (dataView: string, fieldName: string) => {
  const deleteRuntimeFieldPath = `/api/data_views/data_view/${dataView}/runtime_field/${fieldName}`;

  rootRequest({
    url: deleteRuntimeFieldPath,
    method: 'DELETE',
    failOnStatusCode: false,
  });
};
