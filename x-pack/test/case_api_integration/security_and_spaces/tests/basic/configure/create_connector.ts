/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createConnector, getServiceNowConnector } from '../../../../common/lib/utils';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function serviceNow({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('create service now action', () => {
    it('should return 403 when creating a service now action', async () => {
      await createConnector({ supertest, req: getServiceNowConnector(), expectedHttpCode: 403 });
    });
  });
}
