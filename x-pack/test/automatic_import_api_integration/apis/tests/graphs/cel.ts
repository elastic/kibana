/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { postCelInput } from '../../../common/lib/api/cel';
import { User } from '../../../common/lib/authentication/types';
import { BadRequestError } from '../../../common/lib/error/error';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  describe('Run cel', () => {
    it('should get 400 when trying to run cel without connector action', async () => {
      const response = await postCelInput({
        supertest,
        req: {
          dataStreamTitle: 'some data stream',
          connectorId: 'preconfigured-dummy',
          celDetails: {
            path: '/path1',
            auth: 'basic',
            openApiDetails: {
              operation: '{ operationJson}',
              schemas: '{schemasJson}',
              auth: '{authJson}',
            },
          },
        },
        expectedHttpCode: 400,
        auth: {
          user: { username: 'elastic', password: 'elastic' } as User,
        },
      });
      if (response instanceof BadRequestError) {
        expect(response.message).to.be('Saved object [action/preconfigured-dummy] not found');
      } else {
        expect().fail('Expected BadRequestError');
      }
    });
  });
}
