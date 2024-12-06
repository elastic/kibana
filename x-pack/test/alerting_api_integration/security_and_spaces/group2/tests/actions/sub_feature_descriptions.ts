/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

const SUB_FEATURE_DESC_PREFIX = 'Includes: ';

// eslint-disable-next-line import/no-default-export
export default function subFeatureDescriptionsTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('sub feature descriptions', () => {
    it('should have each connector in a sub feature description', async () => {
      const { body: features } = await supertest.get('/api/features').expect(200);
      expect(Array.isArray(features)).to.be(true);
      const actionsFeature = features.find((o) => o.id === 'actions');
      expect(!!actionsFeature).to.be(true);

      const connectorTitles = [];
      for (const subFeature of actionsFeature.subFeatures) {
        expect(subFeature.description.indexOf(SUB_FEATURE_DESC_PREFIX)).to.be(0);
        connectorTitles.push(
          ...subFeature.description.substring(SUB_FEATURE_DESC_PREFIX.length).split(', ')
        );
      }

      const { body: connectorTypes } = await supertest
        .get('/api/actions/connector_types')
        .expect(200);
      for (const connectorType of connectorTypes) {
        if (!connectorType.id.startsWith('test.')) {
          expect(connectorTitles).to.include.string(connectorType.name);
        }
      }
    });
  });
}
