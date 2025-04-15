/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const randomAction = getService('randomAction');

  describe('Random Actions Suite', () => {
    it('performs 20 random create actions', async () => {
      for (let i = 0; i < 20; i++) {
        await randomAction.performRandomAction({ actionDistribution: 'createOnly' });
      }
    });

    it('performs 20 random actions with a higher chance of create', async () => {
      for (let i = 0; i < 20; i++) {
        await randomAction.performRandomAction({ actionDistribution: 'preferCreate' });
      }
    });

    it('performs 20 random actions with equal action distribution', async () => {
      for (let i = 0; i < 20; i++) {
        await randomAction.performRandomAction();
      }
    });
  });
};
