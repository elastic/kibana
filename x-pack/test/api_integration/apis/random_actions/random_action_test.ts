/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const randomAction = getService('randomAction');

  describe('Random Actions Suite', () => {
    it('performs 100 random actions', async () => {
      for (let i = 0; i < 100; i++) {
        await randomAction.performRandomAction();
      }
    });
  });
};
