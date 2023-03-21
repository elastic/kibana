/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  FILE_STORAGE_DATA_INDEX,
  FILE_STORAGE_METADATA_INDEX,
} from '@kbn/security-solution-plugin/common/endpoint/constants';
import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const esClient = getService('es');

  describe('File upload indices', () => {
    it('should have created the file data index on install', async () => {
      const endpointFileUploadIndexExists = await esClient.indices.exists({
        index: FILE_STORAGE_METADATA_INDEX,
      });

      expect(endpointFileUploadIndexExists).equal(true);
    });
    it('should have created the files index on install', async () => {
      const endpointFileUploadIndexExists = await esClient.indices.exists({
        index: FILE_STORAGE_DATA_INDEX,
      });

      expect(endpointFileUploadIndexExists).equal(true);
    });
  });
}
