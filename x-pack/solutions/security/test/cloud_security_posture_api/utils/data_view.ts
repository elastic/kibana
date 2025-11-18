/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type SuperTest from 'supertest';

export const dataViewRouteHelpersFactory = (
  supertest: SuperTest.Agent,
  namespace: string = 'default'
) => ({
  create: async (name: string) => {
    const { body: existingDataView, statusCode } = await supertest.get(
      `/s/${namespace}/api/data_views/data_view/${name}-${namespace}`
    );

    if (statusCode === 200) {
      // data view exists
      return existingDataView;
    }

    return supertest
      .post(`/s/${namespace}/api/data_views/data_view`)
      .set('kbn-xsrf', 'foo')
      .send({
        data_view: {
          title: `logs-*`,
          timeFieldName: '@timestamp',
          name: `${name}-${namespace}`,
          id: `${name}-${namespace}`,
        },
      })
      .expect(200);
  },
  delete: (name: string) => {
    return supertest
      .delete(`/s/${namespace}/api/data_views/data_view/${name}-${namespace}`)
      .set('kbn-xsrf', 'foo')
      .expect(200);
  },
  updateIndexPattern: (name: string, indexPattern: string) => {
    return supertest
      .post(`/s/${namespace}/api/data_views/data_view/${name}-${namespace}`)
      .set('kbn-xsrf', 'foo')
      .send({
        data_view: {
          title: indexPattern,
        },
      })
      .expect(200);
  },
});
