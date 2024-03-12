/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SuperTest, Test } from 'supertest';
import { ToolingLog } from '@kbn/tooling-log';

export const createDataView = async ({
  supertest,
  id,
  name,
  title,
  logger,
}: {
  supertest: SuperTest<Test>;
  id: string;
  name: string;
  title: string;
  logger: ToolingLog;
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
    })
    .expect(200);

  logger.debug(`Created data view: ${JSON.stringify(body)}`);
  return body;
};
export const deleteDataView = async ({
  supertest,
  id,
  logger,
}: {
  supertest: SuperTest<Test>;
  id: string;
  logger: ToolingLog;
}) => {
  const { body } = await supertest
    .post(`/api/content_management/rpc/delete`)
    .set('kbn-xsrf', 'foo')
    .send({
      contentTypeId: 'index-pattern',
      id,
      options: { force: true },
      version: 1,
    })
    .expect(200);

  logger.debug(`Deleted data view id: ${id}`);
  return body;
};
