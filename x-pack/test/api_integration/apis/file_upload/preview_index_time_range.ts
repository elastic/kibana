/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');

  const fqPipeline = {
    description: 'Ingest pipeline created by text structure finder',
    processors: [
      {
        csv: {
          field: 'message',
          target_fields: ['time', 'airline', 'responsetime', 'sourcetype'],
          ignore_missing: false,
        },
      },
      {
        date: {
          field: 'time',
          formats: ['yyyy-MM-dd HH:mm:ssXX'],
        },
      },
      {
        convert: {
          field: 'responsetime',
          type: 'double',
          ignore_missing: true,
        },
      },
      {
        remove: {
          field: 'message',
        },
      },
    ],
  };
  const fqTimeField = '@timestamp';

  async function runRequest(docs: any[], pipeline: any, timeField: string) {
    const { body } = await supertest
      .post(`/internal/file_upload/preview_index_time_range`)
      .set('kbn-xsrf', 'kibana')
      .set(ELASTIC_HTTP_VERSION_HEADER, '1')
      .send({ docs, pipeline, timeField })
      .expect(200);

    return body;
  }

  describe('POST /internal/file_upload/preview_index_time_range', () => {
    it('should return the correct start and end for normal data', async () => {
      const resp = await runRequest(
        [
          {
            message: '2014-06-20 00:00:00Z,AAL,132.2046,farequote',
          },
          {
            message: '2014-06-21 00:00:00Z,JZA,990.4628,farequote',
          },
          {
            message: '2014-06-22 00:00:00Z,JBU,877.5927,farequote',
          },
          {
            message: '2014-06-23 00:00:00Z,KLM,1355.4812,farequote',
          },
          {
            message: '2014-06-24 00:00:00Z,NKS,9991.3981,farequote',
          },
          {
            message: '2014-06-26 23:59:35Z,JBU,923.6772,farequote',
          },
          {
            message: '2014-06-27 23:59:45Z,ACA,21.5385,farequote',
          },
          {
            message: '2014-06-28 23:59:54Z,FFT,251.573,farequote',
          },
          {
            message: '2014-06-29 23:59:54Z,ASA,78.2927,farequote',
          },
          {
            message: '2014-06-30 23:59:56Z,AWE,19.6438,farequote',
          },
        ],
        fqPipeline,
        fqTimeField
      );

      expect(resp).to.eql({
        start: 1403222400000,
        end: 1404172796000,
      });
    });

    it('should return the correct start and end for normal data out of order', async () => {
      const resp = await runRequest(
        [
          {
            message: '2014-06-22 00:00:00Z,JBU,877.5927,farequote',
          },
          {
            message: '2014-06-21 00:00:00Z,JZA,990.4628,farequote',
          },
          {
            message: '2014-06-20 00:00:00Z,AAL,132.2046,farequote',
          },
          {
            message: '2014-06-23 00:00:00Z,KLM,1355.4812,farequote',
          },
          {
            message: '2014-06-24 00:00:00Z,NKS,9991.3981,farequote',
          },
          {
            message: '2014-06-26 23:59:35Z,JBU,923.6772,farequote',
          },
          {
            message: '2014-06-27 23:59:45Z,ACA,21.5385,farequote',
          },
          {
            message: '2014-06-30 23:59:56Z,AWE,19.6438,farequote',
          },
          {
            message: '2014-06-28 23:59:54Z,FFT,251.573,farequote',
          },
          {
            message: '2014-06-29 23:59:54Z,ASA,78.2927,farequote',
          },
        ],
        fqPipeline,
        fqTimeField
      );

      expect(resp).to.eql({
        start: 1403222400000,
        end: 1404172796000,
      });
    });

    it('should return the correct start and end for data with bad last doc', async () => {
      const resp = await runRequest(
        [
          {
            message: '2014-06-20 00:00:00Z,AAL,132.2046,farequote',
          },
          {
            message: '2014-06-21 00:00:00Z,JZA,990.4628,farequote',
          },
          {
            message: '2014-06-22 00:00:00Z,JBU,877.5927,farequote',
          },
          {
            message: '2014-06-23 00:00:00Z,KLM,1355.4812,farequote',
          },
          {
            message: '2014-06-24 00:00:00Z,NKS,9991.3981,farequote',
          },
          {
            message: '2014-06-26 23:59:35Z,JBU,923.6772,farequote',
          },
          {
            message: '2014-06-27 23:59:45Z,ACA,21.5385,farequote',
          },
          {
            message: '2014-06-28 23:59:54Z,FFT,251.573,farequote',
          },
          {
            message: '2014-06-29 23:59:54Z,ASA,78.2927,farequote',
          },
          {
            // bad data
            message: '2014-06-bad 23:59:56Z,AWE,19.6438,farequote',
          },
        ],
        fqPipeline,
        fqTimeField
      );

      expect(resp).to.eql({
        start: 1403222400000,
        end: 1404086394000,
      });
    });

    it('should return the correct start and end for data with bad data near the end', async () => {
      const resp = await runRequest(
        [
          {
            message: '2014-06-20 00:00:00Z,AAL,132.2046,farequote',
          },
          {
            message: '2014-06-21 00:00:00Z,JZA,990.4628,farequote',
          },
          {
            message: '2014-06-22 00:00:00Z,JBU,877.5927,farequote',
          },
          {
            message: '2014-06-23 00:00:00Z,KLM,1355.4812,farequote',
          },
          {
            message: '2014-06-24 00:00:00Z,NKS,9991.3981,farequote',
          },
          {
            message: '2014-06-26 23:59:35Z,JBU,923.6772,farequote',
          },
          {
            message: '2014-06-27 23:59:45Z,ACA,21.5385,farequote',
          },
          {
            message: '2014-06-28 23:59:54Z,FFT,251.573,farequote',
          },
          {
            // bad data
            message: '2014-06-bad 23:59:54Z,ASA,78.2927,farequote',
          },
          {
            message: '2014-06-30 23:59:56Z,AWE,19.6438,farequote',
          },
        ],
        fqPipeline,
        fqTimeField
      );

      expect(resp).to.eql({
        start: 1403222400000,
        end: 1404172796000,
      });
    });

    it('should return the correct start and end for data with bad first doc', async () => {
      const resp = await runRequest(
        [
          {
            // bad data
            message: '2014-06-bad 00:00:00Z,AAL,132.2046,farequote',
          },
          {
            message: '2014-06-21 00:00:00Z,JZA,990.4628,farequote',
          },
          {
            message: '2014-06-22 00:00:00Z,JBU,877.5927,farequote',
          },
          {
            message: '2014-06-23 00:00:00Z,KLM,1355.4812,farequote',
          },
          {
            message: '2014-06-24 00:00:00Z,NKS,9991.3981,farequote',
          },
          {
            message: '2014-06-26 23:59:35Z,JBU,923.6772,farequote',
          },
          {
            message: '2014-06-27 23:59:45Z,ACA,21.5385,farequote',
          },
          {
            message: '2014-06-28 23:59:54Z,FFT,251.573,farequote',
          },
          {
            message: '2014-06-29 23:59:54Z,ASA,78.2927,farequote',
          },
          {
            message: '2014-06-30 23:59:56Z,AWE,19.6438,farequote',
          },
        ],
        fqPipeline,
        fqTimeField
      );

      expect(resp).to.eql({
        start: 1403308800000,
        end: 1404172796000,
      });
    });

    it('should return the correct start and end for data with bad near the start', async () => {
      const resp = await runRequest(
        [
          {
            message: '2014-06-20 00:00:00Z,AAL,132.2046,farequote',
          },
          {
            // bad data
            message: '2014-06-bad 00:00:00Z,JZA,990.4628,farequote',
          },
          {
            message: '2014-06-22 00:00:00Z,JBU,877.5927,farequote',
          },
          {
            message: '2014-06-23 00:00:00Z,KLM,1355.4812,farequote',
          },
          {
            message: '2014-06-24 00:00:00Z,NKS,9991.3981,farequote',
          },
          {
            message: '2014-06-26 23:59:35Z,JBU,923.6772,farequote',
          },
          {
            message: '2014-06-27 23:59:45Z,ACA,21.5385,farequote',
          },
          {
            message: '2014-06-28 23:59:54Z,FFT,251.573,farequote',
          },
          {
            message: '2014-06-29 23:59:54Z,ASA,78.2927,farequote',
          },
          {
            message: '2014-06-30 23:59:56Z,AWE,19.6438,farequote',
          },
        ],
        fqPipeline,
        fqTimeField
      );

      expect(resp).to.eql({
        start: 1403222400000,
        end: 1404172796000,
      });
    });

    it('should return null start and end for entire bad data', async () => {
      const resp = await runRequest(
        [
          {
            message: '2014-06-bad 00:00:00Z,AAL,132.2046,farequote',
          },
          {
            message: '2014-06-bad 00:00:00Z,JZA,990.4628,farequote',
          },
          {
            message: '2014-06-bad 00:00:00Z,JBU,877.5927,farequote',
          },
          {
            message: '2014-06-bad 00:00:00Z,KLM,1355.4812,farequote',
          },
        ],
        fqPipeline,
        fqTimeField
      );

      expect(resp).to.eql({
        start: null,
        end: null,
      });
    });
  });
};
