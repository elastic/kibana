/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';

import { getCaseConnectors } from '../../../../common/lib/utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');

  describe('get_connectors', () => {
    it('should return an empty find body correctly if no connectors are loaded', async () => {
      const connectors = await getCaseConnectors({ supertest });
      expect(connectors).to.eql([]);
    });

    it.skip('filters out connectors that are not enabled in license', async () => {
      // TODO: Should find a way to downgrade license to gold and upgrade back to trial
    });
  });
};
