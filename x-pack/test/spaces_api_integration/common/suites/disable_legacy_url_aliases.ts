/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { SuperTest } from 'supertest';
import type { KibanaClient } from '@elastic/elasticsearch/api/kibana';
import { LegacyUrlAlias } from 'src/core/server/saved_objects/object_types';
import { SPACES } from '../lib/spaces';
import { getUrlPrefix } from '../../../saved_object_api_integration/common/lib/saved_object_test_utils';
import {
  ExpectResponseBody,
  TestDefinition,
  TestSuite,
} from '../../../saved_object_api_integration/common/lib/types';

export interface DisableLegacyUrlAliasesTestDefinition extends TestDefinition {
  request: {
    aliases: Array<{ targetSpace: string; targetType: string; sourceId: string }>;
  };
}
export type DisableLegacyUrlAliasesTestSuite = TestSuite<DisableLegacyUrlAliasesTestDefinition>;
export interface DisableLegacyUrlAliasesTestCase {
  targetSpace: string;
  targetType: string;
  sourceId: string;
}

const LEGACY_URL_ALIAS_TYPE = 'legacy-url-alias';
interface RawLegacyUrlAlias {
  [LEGACY_URL_ALIAS_TYPE]: LegacyUrlAlias;
}

export const TEST_CASE_TARGET_TYPE = 'sharedtype';
export const TEST_CASE_SOURCE_ID = 'default_only'; // two aliases exist for default_only: one in space_1, and one in space_2
const createRequest = (alias: DisableLegacyUrlAliasesTestCase) => ({
  aliases: [alias],
});
const getTestTitle = ({ targetSpace, targetType, sourceId }: DisableLegacyUrlAliasesTestCase) => {
  return `for alias '${targetSpace}:${targetType}:${sourceId}'`;
};

export function disableLegacyUrlAliasesTestSuiteFactory(
  es: KibanaClient,
  esArchiver: any,
  supertest: SuperTest<any>
) {
  const expectResponseBody = (
    testCase: DisableLegacyUrlAliasesTestCase,
    statusCode: 204 | 403
  ): ExpectResponseBody => async (response: Record<string, any>) => {
    if (statusCode === 403) {
      expect(response.body).to.eql({
        statusCode: 403,
        error: 'Forbidden',
        message: `Unable to disable aliases for ${testCase.targetType}`,
      });
    }
    const { targetSpace, targetType, sourceId } = testCase;
    const esResponse = await es.get<RawLegacyUrlAlias>({
      index: '.kibana',
      id: `${LEGACY_URL_ALIAS_TYPE}:${targetSpace}:${targetType}:${sourceId}`,
    });
    const doc = esResponse.body._source!;
    expect(doc).not.to.be(undefined);
    expect(doc[LEGACY_URL_ALIAS_TYPE].disabled).to.be(statusCode === 204 ? true : undefined);
  };
  const createTestDefinitions = (
    testCases: DisableLegacyUrlAliasesTestCase | DisableLegacyUrlAliasesTestCase[],
    forbidden: boolean,
    options: {
      responseBodyOverride?: ExpectResponseBody;
    } = {}
  ): DisableLegacyUrlAliasesTestDefinition[] => {
    const cases = Array.isArray(testCases) ? testCases : [testCases];
    const responseStatusCode = forbidden ? 403 : 204;
    return cases.map((x) => ({
      title: getTestTitle(x),
      responseStatusCode,
      request: createRequest(x),
      responseBody: options?.responseBodyOverride || expectResponseBody(x, responseStatusCode),
    }));
  };

  const makeDisableLegacyUrlAliasesTest = (describeFn: Mocha.SuiteFunction) => (
    description: string,
    definition: DisableLegacyUrlAliasesTestSuite
  ) => {
    const { user, spaceId = SPACES.DEFAULT.spaceId, tests } = definition;

    describeFn(description, () => {
      before(() =>
        esArchiver.load(
          'x-pack/test/spaces_api_integration/common/fixtures/es_archiver/saved_objects/spaces'
        )
      );
      after(() =>
        esArchiver.unload(
          'x-pack/test/spaces_api_integration/common/fixtures/es_archiver/saved_objects/spaces'
        )
      );

      for (const test of tests) {
        it(`should return ${test.responseStatusCode} ${test.title}`, async () => {
          const requestBody = test.request;
          await supertest
            .post(`${getUrlPrefix(spaceId)}/api/spaces/_disable_legacy_url_aliases`)
            .auth(user?.username, user?.password)
            .send(requestBody)
            .expect(test.responseStatusCode)
            .then(test.responseBody);
        });
      }
    });
  };

  const addTests = makeDisableLegacyUrlAliasesTest(describe);
  // @ts-ignore
  addTests.only = makeDisableLegacyUrlAliasesTest(describe.only);

  return {
    addTests,
    createTestDefinitions,
  };
}
