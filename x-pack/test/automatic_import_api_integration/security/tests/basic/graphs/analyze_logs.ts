/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { postAnalyzeLogs } from '../../../../common/lib/api/analyze_logs';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';
import { User } from '../../../../common/lib/authentication/types';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');

  describe('Run analyze logs', () => {
    it('should get 404 when trying to run analyze_logs with basic license', async () => {
      return await postAnalyzeLogs({
        supertest,
        req: {
          packageName: 'some-package',
          dataStreamName: 'some-data-stream',
          connectorId: 'bedrock-connector',
          packageTitle: 'packageTitle',
          dataStreamTitle: 'dataStreamTitle',
          logSamples: ['sample1', 'sample2'],
        },
        auth: {
          user: { username: 'elastic', password: 'elastic' } as User,
        },
      });
    });
  });
};
