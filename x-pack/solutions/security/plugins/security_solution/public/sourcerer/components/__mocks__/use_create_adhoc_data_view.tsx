/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const useCreateAdhocDataView = jest.fn(() => {
  return {
    createAdhocDataView: jest.fn(() => ({
      id: 'adhoc_sourcerer_mock_view',
      getIndexPattern: () => 'pattern1,pattern2',
    })),
  };
});

export const isAdhocDataView = jest.requireActual('../use_create_adhoc_data_view').isAdhocDataView;
