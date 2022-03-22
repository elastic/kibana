/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { UsageStats } from '../../services/usage';

type ReportingUsage = UsageStats['reporting'];
interface ReportingUsageApiResponse {
  all: ReportingUsage['_all'];
  csv_searchsource: ReportingUsage['csv_searchsource'];
  pngv_2: ReportingUsage['PNGV2'];
  printable_pdf_v_2: ReportingUsage['printable_pdf_v2'];
}

const DATA_ARCHIVE_PATH = 'x-pack/test/functional/es_archives/reporting/errors';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const usageAPI = getService('usageAPI');

  describe(`error codes`, () => {
    let reporting: ReportingUsageApiResponse;

    before(async () => {
      await esArchiver.load(DATA_ARCHIVE_PATH);
      ({ reporting } = await usageAPI.getUsageStats());
    });

    after(async () => {
      await esArchiver.unload(DATA_ARCHIVE_PATH);
    });

    it('includes error code statistics', async () => {
      expect(reporting.all).equal(3);
      expectSnapshot(
        ['csv_searchsource', 'pngv_2', 'printable_pdf_v_2'].map((k) => {
          const field = reporting[k as keyof Omit<ReportingUsageApiResponse, 'all'>];
          return { key: k, error_codes: field.error_codes, total: field.total };
        })
      ).toMatchInline(`
        Array [
          Object {
            "error_codes": undefined,
            "key": "csv_searchsource",
            "total": 0,
          },
          Object {
            "error_codes": undefined,
            "key": "pngv_2",
            "total": 0,
          },
          Object {
            "error_codes": Object {
              "queue_timeout_error": 1,
              "unknown_error": 1,
            },
            "key": "printable_pdf_v_2",
            "total": 3,
          },
        ]
      `);
    });
  });
}
