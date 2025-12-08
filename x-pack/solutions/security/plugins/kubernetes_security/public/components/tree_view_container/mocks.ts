/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const clusterResponseMock = {
  buckets: [
    {
      key: ['awp-demo-gke-main', 'awp-demo-gke-main'],
      key_as_string: 'awp-demo-gke-main|awp-demo-gke-main',
      doc_count: 22279,
    },
    {
      key: ['awp-demo-gke-test', ''],
      key_as_string: 'awp-demo-gke-test|',
      doc_count: 1,
    },
  ],
  hasNextPage: false,
};

export const nodeResponseMock = {
  buckets: [
    { key: 'default', doc_count: 236 },
    { key: 'kube-system', doc_count: 30360 },
    { key: 'production', doc_count: 30713 },
    { key: 'qa', doc_count: 412 },
    { key: 'staging', doc_count: 220 },
  ],
  hasNextPage: false,
};
