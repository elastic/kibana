/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { RoleCredentials, InternalRequestHeader } from '../../../../../../shared/services';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';
import { configArray } from '../../constants';

export default function ({ getService }: FtrProviderContext) {
  const svlCommonApi = getService('svlCommonApi');
  const svlUserManager = getService('svlUserManager');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  let roleAuthc: RoleCredentials;
  let internalReqHeader: InternalRequestHeader;

  describe('main', () => {
    before(async () => {
      roleAuthc = await svlUserManager.createApiKeyForRole('admin');
      internalReqHeader = svlCommonApi.getInternalRequestHeader();
    });
    after(async () => {
      await svlUserManager.invalidateApiKeyForRole(roleAuthc);
    });
    configArray.forEach((config) => {
      describe(config.name, () => {
        it('can update data view title', async () => {
          const title1 = `foo-${Date.now()}-${Math.random()}*`;
          const title2 = `bar-${Date.now()}-${Math.random()}*`;
          const response1 = await supertestWithoutAuth
            .post(config.path)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader)
            .send({
              [config.serviceKey]: {
                title: title1,
              },
            });

          expect(response1.body[config.serviceKey].title).to.be(title1);

          const id = response1.body[config.serviceKey].id;
          const response2 = await supertestWithoutAuth
            .post(`${config.path}/${id}`)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader)
            .send({
              [config.serviceKey]: {
                title: title2,
              },
            });

          expect(response2.body[config.serviceKey].title).to.be(title2);

          const response3 = await supertestWithoutAuth
            .get(`${config.path}/${id}`)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader);

          expect(response3.body[config.serviceKey].title).to.be(title2);
        });

        it('can update data view name', async () => {
          const title = `foo-${Date.now()}-${Math.random()}*`;
          const name1 = 'good data view name';
          const name2 = 'better data view name';
          const response1 = await supertestWithoutAuth
            .post(config.path)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader)
            .send({
              [config.serviceKey]: {
                title,
                name: name1,
              },
            });

          expect(response1.body[config.serviceKey].name).to.be(name1);

          const id = response1.body[config.serviceKey].id;
          const response2 = await supertestWithoutAuth
            .post(`${config.path}/${id}`)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader)
            .send({
              [config.serviceKey]: {
                name: name2,
              },
            });

          expect(response2.body[config.serviceKey].name).to.be(name2);

          const response3 = await supertestWithoutAuth
            .get(`${config.path}/${id}`)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader);

          expect(response3.body[config.serviceKey].name).to.be(name2);
        });

        it('can update data view timeFieldName', async () => {
          const title = `foo-${Date.now()}-${Math.random()}*`;
          const response1 = await supertestWithoutAuth
            .post(config.path)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader)
            .send({
              [config.serviceKey]: {
                title,
                timeFieldName: 'timeFieldName1',
              },
            });

          expect(response1.body[config.serviceKey].timeFieldName).to.be('timeFieldName1');

          const id = response1.body[config.serviceKey].id;
          const response2 = await supertestWithoutAuth
            .post(`${config.path}/${id}`)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader)
            .send({
              [config.serviceKey]: {
                timeFieldName: 'timeFieldName2',
              },
            });

          expect(response2.body[config.serviceKey].timeFieldName).to.be('timeFieldName2');

          const response3 = await supertestWithoutAuth
            .get(`${config.path}/${id}`)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader);

          expect(response3.body[config.serviceKey].timeFieldName).to.be('timeFieldName2');
        });

        it('can update data view sourceFilters', async () => {
          const title = `foo-${Date.now()}-${Math.random()}*`;
          const response1 = await supertestWithoutAuth
            .post(config.path)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader)
            .send({
              [config.serviceKey]: {
                title,
                sourceFilters: [
                  {
                    value: 'foo',
                  },
                ],
              },
            });

          expect(response1.body[config.serviceKey].sourceFilters).to.eql([
            {
              value: 'foo',
            },
          ]);

          const id = response1.body[config.serviceKey].id;
          const response2 = await supertestWithoutAuth
            .post(`${config.path}/${id}`)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader)
            .send({
              [config.serviceKey]: {
                sourceFilters: [
                  {
                    value: 'bar',
                  },
                  {
                    value: 'baz',
                  },
                ],
              },
            });

          expect(response2.body[config.serviceKey].sourceFilters).to.eql([
            {
              value: 'bar',
            },
            {
              value: 'baz',
            },
          ]);

          const response3 = await supertestWithoutAuth
            .get(`${config.path}/${id}`)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader);

          expect(response3.body[config.serviceKey].sourceFilters).to.eql([
            {
              value: 'bar',
            },
            {
              value: 'baz',
            },
          ]);
        });

        it('can update data view fieldFormats', async () => {
          const title = `foo-${Date.now()}-${Math.random()}*`;
          const response1 = await supertestWithoutAuth
            .post(config.path)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader)
            .send({
              [config.serviceKey]: {
                title,
                fieldFormats: {
                  foo: {
                    id: 'foo',
                    params: {
                      bar: 'baz',
                    },
                  },
                },
              },
            });

          expect(response1.body[config.serviceKey].fieldFormats).to.eql({
            foo: {
              id: 'foo',
              params: {
                bar: 'baz',
              },
            },
          });

          const id = response1.body[config.serviceKey].id;
          const response2 = await supertestWithoutAuth
            .post(`${config.path}/${id}`)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader)
            .send({
              [config.serviceKey]: {
                fieldFormats: {
                  a: {
                    id: 'a',
                    params: {
                      b: 'v',
                    },
                  },
                },
              },
            });

          expect(response2.body[config.serviceKey].fieldFormats).to.eql({
            a: {
              id: 'a',
              params: {
                b: 'v',
              },
            },
          });

          const response3 = await supertestWithoutAuth
            .get(`${config.path}/${id}`)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader);

          expect(response3.body[config.serviceKey].fieldFormats).to.eql({
            a: {
              id: 'a',
              params: {
                b: 'v',
              },
            },
          });
        });

        it('can update data view type', async () => {
          const title = `foo-${Date.now()}-${Math.random()}*`;
          const response1 = await supertestWithoutAuth
            .post(config.path)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader)
            .send({
              [config.serviceKey]: {
                title,
                type: 'foo',
              },
            });

          expect(response1.body[config.serviceKey].type).to.be('foo');

          const id = response1.body[config.serviceKey].id;
          const response2 = await supertestWithoutAuth
            .post(`${config.path}/${id}`)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader)
            .send({
              [config.serviceKey]: {
                type: 'bar',
              },
            });

          expect(response2.body[config.serviceKey].type).to.be('bar');

          const response3 = await supertestWithoutAuth
            .get(`${config.path}/${id}`)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader);

          expect(response3.body[config.serviceKey].type).to.be('bar');
        });

        it('can update data view typeMeta', async () => {
          const title = `foo-${Date.now()}-${Math.random()}*`;
          const response1 = await supertestWithoutAuth
            .post(config.path)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader)
            .send({
              [config.serviceKey]: {
                title,
                typeMeta: { foo: 'bar' },
              },
            });

          expect(response1.body[config.serviceKey].typeMeta).to.eql({ foo: 'bar' });

          const id = response1.body[config.serviceKey].id;
          const response2 = await supertestWithoutAuth
            .post(`${config.path}/${id}`)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader)
            .send({
              [config.serviceKey]: {
                typeMeta: { foo: 'baz' },
              },
            });

          expect(response2.body[config.serviceKey].typeMeta).to.eql({ foo: 'baz' });

          const response3 = await supertestWithoutAuth
            .get(`${config.path}/${id}`)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader);

          expect(response3.body[config.serviceKey].typeMeta).to.eql({ foo: 'baz' });
        });

        it('can update multiple data view fields at once', async () => {
          const title = `foo-${Date.now()}-${Math.random()}*`;
          const response1 = await supertestWithoutAuth
            .post(config.path)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader)
            .send({
              [config.serviceKey]: {
                title,
                timeFieldName: 'timeFieldName1',
                typeMeta: { foo: 'bar' },
              },
            });

          expect(response1.body[config.serviceKey].timeFieldName).to.be('timeFieldName1');
          expect(response1.body[config.serviceKey].typeMeta.foo).to.be('bar');

          const id = response1.body[config.serviceKey].id;
          const response2 = await supertestWithoutAuth
            .post(`${config.path}/${id}`)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader)
            .send({
              [config.serviceKey]: {
                timeFieldName: 'timeFieldName2',
                typeMeta: { baz: 'qux' },
              },
            });

          expect(response2.body[config.serviceKey].timeFieldName).to.be('timeFieldName2');
          expect(response2.body[config.serviceKey].typeMeta.baz).to.be('qux');

          const response3 = await supertestWithoutAuth
            .get(`${config.path}/${id}`)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader);

          expect(response3.body[config.serviceKey].timeFieldName).to.be('timeFieldName2');
          expect(response3.body[config.serviceKey].typeMeta.baz).to.be('qux');
        });

        it('can update runtime fields', async () => {
          const title = `basic_index*`;
          const response1 = await supertestWithoutAuth
            .post(config.path)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader)
            .send({
              override: true,
              [config.serviceKey]: {
                title,
                runtimeFieldMap: {
                  runtimeFoo: {
                    type: 'keyword',
                    script: {
                      source: 'emit(doc["foo"].value)',
                    },
                  },
                },
              },
            });

          expect(response1.status).to.be(200);
          expect(response1.body[config.serviceKey].title).to.be(title);

          expect(response1.body[config.serviceKey].runtimeFieldMap.runtimeFoo.type).to.be(
            'keyword'
          );
          expect(response1.body[config.serviceKey].runtimeFieldMap.runtimeFoo.script.source).to.be(
            'emit(doc["foo"].value)'
          );

          const id = response1.body[config.serviceKey].id;
          const response2 = await supertestWithoutAuth
            .post(`${config.path}/${id}`)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader)
            .send({
              [config.serviceKey]: {
                runtimeFieldMap: {
                  runtimeBar: {
                    type: 'keyword',
                    script: {
                      source: 'emit(doc["foo"].value)',
                    },
                  },
                },
              },
            });

          expect(response2.body[config.serviceKey].runtimeFieldMap.runtimeBar.type).to.be(
            'keyword'
          );
          expect(response2.body[config.serviceKey].runtimeFieldMap.runtimeFoo).to.be(undefined);

          const response3 = await supertestWithoutAuth
            .get(`${config.path}/${id}`)
            .set(internalReqHeader)
            .set(roleAuthc.apiKeyHeader);

          expect(response3.body[config.serviceKey].runtimeFieldMap.runtimeBar.type).to.be(
            'keyword'
          );
          expect(response3.body[config.serviceKey].runtimeFieldMap.runtimeFoo).to.be(undefined);
        });
      });
    });
  });
}
