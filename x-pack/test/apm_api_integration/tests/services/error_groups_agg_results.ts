/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// /*
//  * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
//  * or more contributor license agreements. Licensed under the Elastic License;
//  * you may not use this file except in compliance with the Elastic License.
//  */

// import expect from '@kbn/expect';
// import url from 'url';
// import { FtrProviderContext } from '../../../../common/ftr_provider_context';
// import archives from '../../../common/fixtures/es_archiver/archives_metadata';

// export default function ApiTest({ getService }: FtrProviderContext) {
//   const supertest = getService('supertest');
//   const esArchiver = getService('esArchiver');

//   const archiveName = 'apm_8.0.0';
//   const { start, end } = archives[archiveName];
// const groupIds = [
//   '051f95eabf120ebe2f8b0399fe3e54c5',
//   '3bb34b98031a19c277bf59c3db82d3f3',
//   'b1c3ff13ec52de11187facf9c6a82538',
//   '9581687a53eac06aba50ba17cbd959c5',
//   '97c2eef51fec10d177ade955670a2f15',
// ].join();

//   describe('Error groups metrics', () => {
//     describe('when data is not loaded ', () => {
//       it('handles the empty state', async () => {
//         const response = await supertest.get(
//           url.format({
//             pathname: `/api/apm/services/opbeans-java/error_groups/metrics`,
//             query: {
// start,
// end,
// uiFilters: '{}',
// numBuckets: 20,
// transactionType: 'request',
// groupIds,
//             },
//           })
//         );

// expect(response.status).to.be(200);
// expectSnapshot(response.body).toMatchInline(`Object {}`);
//       });
//     });

//     describe('when data is loaded', () => {
//       before(() => esArchiver.load(archiveName));
//       after(() => esArchiver.unload(archiveName));

// it('returns the correct data', async () => {
//   const response = await supertest.get(
//     url.format({
//       pathname: `/api/apm/services/opbeans-java/error_groups/metrics`,
//       query: {
//         start,
//         end,
//         uiFilters: '{}',
//         numBuckets: 20,
//         transactionType: 'request',
//         groupIds,
//       },
//     })
//   );

//   expect(response.status).to.be(200);

//   const errorMetric = response.body['051f95eabf120ebe2f8b0399fe3e54c5'];

//   expectSnapshot(errorMetric.timeseries.filter(({ y }: any) => y > 0).length).toMatchInline(
//     `4`
//   );
// });

// it('returns empty data', async () => {
//   const response = await supertest.get(
//     url.format({
//       pathname: `/api/apm/services/opbeans-java/error_groups/metrics`,
//       query: {
//         start,
//         end,
//         uiFilters: '{}',
//         numBuckets: 20,
//         transactionType: 'request',
//         groupIds: 'foo',
//       },
//     })
//   );

//   expect(response.status).to.be(200);
//   expectSnapshot(response.body).toMatchInline(`Object {}`);
// });
//     });
//   });
// }

import url from 'url';
import expect from '@kbn/expect';
import archives_metadata from '../../common/fixtures/es_archiver/archives_metadata';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { registry } from '../../common/registry';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  const archiveName = 'apm_8.0.0';
  const metadata = archives_metadata[archiveName];
  const { start, end } = metadata;
  const groupIds = JSON.stringify([
    '051f95eabf120ebe2f8b0399fe3e54c5',
    '3bb34b98031a19c277bf59c3db82d3f3',
    'b1c3ff13ec52de11187facf9c6a82538',
    '9581687a53eac06aba50ba17cbd959c5',
    '97c2eef51fec10d177ade955670a2f15',
  ]);

  registry.when(
    'Error groups agg results when data is not loaded',
    { config: 'basic', archives: [] },
    () => {
      it('handles empty state', async () => {
        const response = await supertest.get(
          url.format({
            pathname: `/api/apm/services/opbeans-java/error_groups/agg_results`,
            query: {
              start,
              end,
              uiFilters: '{}',
              numBuckets: 20,
              transactionType: 'request',
              groupIds,
            },
          })
        );
        expect(response.status).to.be(200);
        expectSnapshot(response.body).toMatchInline(`Object {}`);
      });
    }
  );

  registry.when(
    'Error groups agg results when data is loaded',
    { config: 'basic', archives: [archiveName] },
    () => {
      it('returns the correct data', async () => {
        const response = await supertest.get(
          url.format({
            pathname: `/api/apm/services/opbeans-java/error_groups/agg_results`,
            query: {
              start,
              end,
              uiFilters: '{}',
              numBuckets: 20,
              transactionType: 'request',
              groupIds,
            },
          })
        );

        expect(response.status).to.be(200);

        const errorMetric = response.body['051f95eabf120ebe2f8b0399fe3e54c5'];

        expectSnapshot(errorMetric.timeseries.filter(({ y }: any) => y > 0).length).toMatchInline(
          `4`
        );
      });

      it('returns empty data', async () => {
        const response = await supertest.get(
          url.format({
            pathname: `/api/apm/services/opbeans-java/error_groups/agg_results`,
            query: {
              start,
              end,
              uiFilters: '{}',
              numBuckets: 20,
              transactionType: 'request',
              groupIds: JSON.stringify(['foo']),
            },
          })
        );

        expect(response.status).to.be(200);
        expectSnapshot(response.body).toMatchInline(`Object {}`);
      });
    }
  );
}
