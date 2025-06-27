/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { riskEngineRouteHelpersFactory } from '../../utils';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const riskEngineRoutes = riskEngineRouteHelpersFactory(supertest);

  describe('@serverless essentials tier api access', () => {
    it('should not find init api', async () => {
      await riskEngineRoutes.init(404);
    });

    it('should not find getStatus api', async () => {
      await riskEngineRoutes.getStatus(404);
    });

    it('should not find enable api', async () => {
      await riskEngineRoutes.enable(404);
    });

    it('should not find disable api', async () => {
      await riskEngineRoutes.disable(404);
    });

    it('should not find privileges api', async () => {
      await riskEngineRoutes.privileges(404);
    });
  });
};
