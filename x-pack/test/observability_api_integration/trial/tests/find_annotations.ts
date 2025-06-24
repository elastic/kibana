/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { JsonObject } from '@kbn/utility-types';
import { CreateAnnotationParams } from '@kbn/observability-plugin/common/annotations';
import moment from 'moment';
import { FtrProviderContext } from '../../common/ftr_provider_context';

const DEFAULT_INDEX_NAME = 'observability-annotations';

// eslint-disable-next-line import/no-default-export
export default function annotationApiTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');

  function request({ method, url, data }: { method: string; url: string; data?: JsonObject }) {
    switch (method.toLowerCase()) {
      case 'get':
        return supertest.get(url).set('kbn-xsrf', 'foo');

      case 'post':
        return supertest.post(url).send(data).set('kbn-xsrf', 'foo');

      case 'delete':
        return supertest.delete(url).send(data).set('kbn-xsrf', 'foo');

      default:
        throw new Error(`Unsupported method ${method}`);
    }
  }

  const createAnnotation = async (annotation: Partial<CreateAnnotationParams>) => {
    const data: CreateAnnotationParams = {
      annotation: {
        type: 'slo',
      },
      '@timestamp': moment().subtract(1, 'day').toISOString(),
      message: 'test message',
      tags: ['apm'],
      ...annotation,
    };
    const response = await request({
      url: '/api/observability/annotation',
      method: 'POST',
      data,
    });

    expect(response.status).to.eql(200);
  };

  const findAnnotations = async (params?: { sloId?: string; sloInstanceId?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.sloId) {
      queryParams.set('sloId', params.sloId);
    }

    if (params?.sloInstanceId) {
      queryParams.set('sloInstanceId', params.sloInstanceId);
    }

    const response = await request({
      url: '/api/observability/annotation/find' + (queryParams.toString() ? `?${queryParams}` : ''),
      method: 'GET',
    });

    expect(response.status).to.eql(200);
    return response.body;
  };

  describe('ObservabilityFindAnnotations', () => {
    after(async () => {
      const indexExists = await es.indices.exists({ index: DEFAULT_INDEX_NAME });
      if (indexExists) {
        await es.indices.delete({
          index: DEFAULT_INDEX_NAME,
        });
      }
    });

    before(async () => {
      const indexExists = await es.indices.exists({ index: DEFAULT_INDEX_NAME });
      if (indexExists) {
        await es.indices.delete({
          index: DEFAULT_INDEX_NAME,
        });
      }
    });

    it('creates few SLO annotations', async () => {
      await createAnnotation({
        slo: {
          id: 'slo-id',
          instanceId: 'instance-id',
        },
      });
      await createAnnotation({
        slo: {
          id: 'slo-id2',
          instanceId: 'instance-id',
        },
      });
    });

    it('can find annotation with slo id', async () => {
      let response = await findAnnotations();
      expect(response.items.length).to.eql(2);
      const annotation = response.items[0];
      expect(annotation.slo.id).to.eql('slo-id2');

      response = await findAnnotations({ sloId: 'slo-id' });
      expect(response.items.length).to.eql(1);
      expect(response.items[0].slo.id).to.eql('slo-id');
    });

    it('can find annotation with slo instance Id', async () => {
      const response = await findAnnotations({ sloInstanceId: 'instance-id' });
      expect(response.items.length).to.eql(2);
      expect(response.items[0].slo.instanceId).to.eql('instance-id');
    });

    it('can find annotation with slo instance Id and slo id', async () => {
      const response = await findAnnotations({ sloInstanceId: 'instance-id', sloId: 'slo-id' });
      expect(response.items.length).to.eql(1);
      expect(response.items[0].slo.instanceId).to.eql('instance-id');
      expect(response.items[0].slo.id).to.eql('slo-id');
    });
  });
}
