/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fetch from 'node-fetch';
import { format as formatUrl } from 'url';

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

import { parseStream } from './parse_stream';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const config = getService('config');
  const kibanaServerUrl = formatUrl(config.get('servers.kibana'));

  const expectedFields = [
    'category',
    'currency',
    'customer_first_name',
    'customer_full_name',
    'customer_gender',
    'customer_id',
    'customer_last_name',
    'customer_phone',
    'day_of_week',
    'day_of_week_i',
    'email',
    'geoip',
    'manufacturer',
    'order_date',
    'order_id',
    'products',
    'sku',
    'taxful_total_price',
    'taxless_total_price',
    'total_quantity',
    'total_unique_products',
    'type',
    'user',
  ];

  describe('POST /internal/aiops/explain_log_rate_spikes', () => {
    const esArchiver = getService('esArchiver');

    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/ecommerce');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/ml/ecommerce');
    });

    it('should return full data without streaming', async () => {
      const resp = await supertest
        .post(`/internal/aiops/explain_log_rate_spikes`)
        .set('kbn-xsrf', 'kibana')
        .send({
          index: 'ft_ecommerce',
        })
        .expect(200);

      expect(Buffer.isBuffer(resp.body)).to.be(true);

      const chunks: string[] = resp.body.toString().split('\n');

      expect(chunks.length).to.be(24);

      const lastChunk = chunks.pop();
      expect(lastChunk).to.be('');

      let data: any[] = [];

      expect(() => {
        data = chunks.map((c) => JSON.parse(c));
      }).not.to.throwError();

      data.forEach((d) => {
        expect(typeof d.type).to.be('string');
      });

      const fields = data.map((d) => d.payload[0]).sort();

      expect(fields.length).to.equal(expectedFields.length);
      fields.forEach((f) => {
        expect(expectedFields.includes(f));
      });
    });

    it('should return data in chunks with streaming', async () => {
      const response = await fetch(`${kibanaServerUrl}/internal/aiops/explain_log_rate_spikes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'kbn-xsrf': 'stream',
        },
        body: JSON.stringify({ index: 'ft_ecommerce' }),
      });

      const stream = response.body;

      expect(stream).not.to.be(null);

      if (stream !== null) {
        const data: any[] = [];

        for await (const action of parseStream(stream)) {
          expect(action.type).not.to.be('error');
          data.push(action);
        }

        const fields = data.map((d) => d.payload[0]).sort();

        expect(fields.length).to.equal(expectedFields.length);
        fields.forEach((f) => {
          expect(expectedFields.includes(f));
        });
      }
    });
  });
};
