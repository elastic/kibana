/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrSupertest } from '@kbn/ftr-common-functional-services';

export const createDataView = async ({
  supertest,
  id,
  name,
  title,
}: {
  supertest: FtrSupertest;
  id: string;
  name: string;
  title: string;
}) => {
  const { body } = await supertest
    .post(`/api/content_management/rpc/create`)
    .set('kbn-xsrf', 'foo')
    .send({
      contentTypeId: 'index-pattern',
      data: {
        fieldAttrs: '{}',
        title,
        timeFieldName: '@timestamp',
        sourceFilters: '[]',
        fields: '[]',
        fieldFormatMap: '{}',
        typeMeta: '{}',
        runtimeFieldMap: '{}',
        name,
      },
      options: { id },
      version: 1,
    });
  return body;
};
export const deleteDataView = async ({
  supertest,
  id,
}: {
  supertest: FtrSupertest;
  id: string;
}) => {
  const { body } = await supertest
    .post(`/api/content_management/rpc/delete`)
    .set('kbn-xsrf', 'foo')
    .send({
      contentTypeId: 'index-pattern',
      id,
      options: { force: true },
      version: 1,
    });
  return body;
};
