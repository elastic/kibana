/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { OSS_DATA_ARCHIVE_PATH, OSS_KIBANA_ARCHIVE_PATH } from './constants';
import { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ loadTestFile, getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');

  describe('chromium', function () {
    this.tags('ciGroup2');

    before(async () => {
      await esArchiver.load(OSS_KIBANA_ARCHIVE_PATH);
      await esArchiver.load(OSS_DATA_ARCHIVE_PATH);

      await kibanaServer.uiSettings.update({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });
    });

    after(async () => {
      await esArchiver.unload(OSS_KIBANA_ARCHIVE_PATH);
      await esArchiver.unload(OSS_DATA_ARCHIVE_PATH);
    });

    loadTestFile(require.resolve('./bwc_existing_indexes'));
    loadTestFile(require.resolve('./bwc_generation_urls'));
    loadTestFile(require.resolve('./usage'));
  });
}
