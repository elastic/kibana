/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../common/ftr_provider_context';

export const MAPPING_BUFFER_LIMIT = 800;

export default ({ getService }: FtrProviderContext) => {
  const es = getService('es');

  describe('saved object mappings', () => {
    it(`should not exceed ${MAPPING_BUFFER_LIMIT}, if you see this test failing you should re-evaluate the number of saved object mappings. (see https://github.com/elastic/kibana/issues/43673)`, async () => {
      const { body } = await es.fieldCaps({
        index: '.kibana',
        fields: '*',
      });
      const fieldCount = Object.keys(body.fields).length;
      expect(fieldCount).to.be.below(MAPPING_BUFFER_LIMIT);
    });
  });
};
