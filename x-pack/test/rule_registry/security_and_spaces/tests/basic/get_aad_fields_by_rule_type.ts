/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { obsOnlySpacesAll } from '../../../common/lib/authentication/users';
import type { User } from '../../../common/lib/authentication/types';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { getSpaceUrlPrefix } from '../../../common/lib/authentication/spaces';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');
  const retry = getService('retry');
  const SPACE1 = 'space1';
  const TEST_URL = '/internal/rac/alerts/aad_fields';

  const getAADFieldsByRuleType = async (
    user: User,
    ruleTypeId: string,
    expectedStatusCode: number = 200
  ) => {
    const resp = await supertestWithoutAuth
      .get(`${getSpaceUrlPrefix(SPACE1)}${TEST_URL}`)
      .query({ ruleTypeId })
      .auth(user.username, user.password)
      .set('kbn-xsrf', 'true')
      .expect(expectedStatusCode);
    return resp.body;
  };

  describe('Alert - Get AAD fields by ruleType', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/rule_registry/alerts');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/rule_registry/alerts');
    });

    describe('Users:', () => {
      it(`${obsOnlySpacesAll.username} should be able to get browser fields for o11y rule type ids`, async () => {
        await retry.try(async () => {
          const aadFields = await getAADFieldsByRuleType(
            obsOnlySpacesAll,
            'metrics.alert.threshold'
          );
          expect(aadFields.slice(0, 2)).to.eql(expectedResult);
          expect(aadFields.length > 2).to.be(true);
          for (const field of aadFields) {
            expectToBeFieldDescriptor(field);
          }
        });
      });
    });
  });
};

const expectedResult = [
  {
    name: '_id',
    type: 'string',
    searchable: false,
    aggregatable: false,
    readFromDocValues: false,
    metadata_field: true,
  },
  {
    name: '_index',
    type: 'string',
    searchable: false,
    aggregatable: false,
    readFromDocValues: false,
    metadata_field: true,
  },
];

const expectToBeFieldDescriptor = (field: Record<string, unknown>) => {
  expect('name' in field).to.be(true);
  expect('type' in field).to.be(true);
  expect('searchable' in field).to.be(true);
  expect('aggregatable' in field).to.be(true);
  expect('readFromDocValues' in field).to.be(true);
  expect('metadata_field' in field).to.be(true);
};
