/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { Spaces } from '../../scenarios';
import { getUrlPrefix } from '../../../common/lib/space_test_utils';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function listConnectorTypesTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('connector_types', () => {
    it('should return 200 with list of connector types containing defaults', async () => {
      const response = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/api/actions/connector_types`
      );

      function createConnectorTypeMatcher(id: string, name: string) {
        return (connectorType: { id: string; name: string }) => {
          return connectorType.id === id && connectorType.name === name;
        };
      }

      expect(response.status).to.eql(200);
      // Check for values explicitly in order to avoid this test failing each time plugins register
      // a new connector type
      expect(
        response.body.some(createConnectorTypeMatcher('test.index-record', 'Test: Index Record'))
      ).to.be(true);
    });

    it('should filter out system action types', async () => {
      const response = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/api/actions/connector_types`
      );

      const connectorTypes = response.body as Array<{ is_system_action_type: boolean }>;

      expect(connectorTypes.every((connectorType) => !connectorType.is_system_action_type)).to.be(
        true
      );
    });
  });
}
