/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { postRelated } from '../../../../common/lib/api/related';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';
import { User } from '../../../../common/lib/authentication/types';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');

  describe('Run related', () => {
    it('should get 404 when trying to run related graph with basic license', async () => {
      return await postRelated({
        supertest,
        req: {
          packageName: 'some-package',
          dataStreamName: 'some-data-stream',
          rawSamples: ['sample1', 'sample2'],
          samplesFormat: {
            name: 'json',
          },
          connectorId: 'bedrock-connector',
          currentPipeline: {
            processors: [],
          },
        },
        auth: {
          user: { username: 'elastic', password: 'elastic' } as User,
        },
      });
    });
  });
};
