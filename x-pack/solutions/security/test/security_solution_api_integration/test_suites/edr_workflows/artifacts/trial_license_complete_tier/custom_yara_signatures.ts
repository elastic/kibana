/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EXCEPTION_LIST_ITEM_URL, EXCEPTION_LIST_URL } from '@kbn/securitysolution-list-constants';
import type {
  EntryMatch,
  ExceptionListItemSchema,
  OsTypeArray,
} from '@kbn/securitysolution-io-ts-list-types';
import expect from '@kbn/expect';
import {
  BY_POLICY_ARTIFACT_TAG_PREFIX,
  GLOBAL_ARTIFACT_TAG,
} from '@kbn/security-solution-plugin/common/endpoint/service/artifacts';
import { ExceptionsListItemGenerator } from '@kbn/security-solution-plugin/common/endpoint/data_generators/exceptions_list_item_generator';
import type TestAgent from 'supertest/lib/agent';
import type { PolicyTestResourceInfo } from '@kbn/test-suites-xpack-security-endpoint/services/endpoint_policy';
import type { ArtifactTestData } from '@kbn/test-suites-xpack-security-endpoint/services/endpoint_artifacts';
import { SECURITY_FEATURE_ID } from '@kbn/security-solution-plugin/common';
import { CUSTOM_YARA_SIGNATURES_VALIDATE_ROUTE } from '@kbn/security-solution-plugin/common/endpoint/constants';
import type { ValidateCustomYaraSignatureResponse } from '@kbn/security-solution-plugin/common/api/endpoint/custom_yara_signatures';
import {
  MAX_YARA_RULE_CONTENT_BYTE_LENGTH,
  MAXIMUM_RULE_IDENTIFIER_LENGTH,
} from '@kbn/security-solution-plugin/server/endpoint/lib/custom_yara_signatures';
import type { FtrProviderContext } from '../../../../ftr_provider_context_edr_workflows';

export default function ({ getService }: FtrProviderContext) {
  const endpointPolicyTestResources = getService('endpointPolicyTestResources');
  const endpointArtifactTestResources = getService('endpointArtifactTestResources');
  const utils = getService('securitySolutionUtils');

  // @skipInServerlessMKI due to authentication issues - we should migrate from Basic to Bearer token when available
  // @skipInServerlessMKI - if you are removing this annotation, make sure to add the test suite to the MKI pipeline in .buildkite/pipelines/security_solution_quality_gate/mki_periodic/mki_periodic_defend_workflows.yml
  describe('@ess @serverless @skipInServerlessMKI Endpoint artifacts (via lists plugin): Custom YARA Signatures', function () {
    let fleetEndpointPolicy: PolicyTestResourceInfo;

    let noAccessTestAgent: TestAgent;
    let readAccessTestAgent: TestAgent;
    let globalWriteAccessTestAgent: TestAgent;

    before(async () => {
      const createCustomRole = (name: string, privileges: string[]) => ({
        name,
        privileges: {
          kibana: [
            {
              base: [],
              feature: {
                [SECURITY_FEATURE_ID]: privileges,
              },
              spaces: ['*'],
            },
          ],
          elasticsearch: { cluster: [], indices: [] },
        },
      });

      noAccessTestAgent = await utils.createSuperTestWithCustomRole(
        createCustomRole('no_access_role', ['all'])
      );
      readAccessTestAgent = await utils.createSuperTestWithCustomRole(
        createCustomRole('read_access_role', ['all', 'custom_yara_signatures_read'])
      );
      globalWriteAccessTestAgent = await utils.createSuperTestWithCustomRole(
        createCustomRole('global_write_access_role', [
          'all',
          'custom_yara_signatures_all',
          'global_artifact_management_all',
        ])
      );

      fleetEndpointPolicy = await endpointPolicyTestResources.createPolicy();
    });

    after(async () => {
      await utils.cleanUpCustomRoles();

      if (fleetEndpointPolicy) {
        await fleetEndpointPolicy.cleanup();
      }
    });

    const anEndpointArtifactError = (res: { body: { message: string } }) => {
      expect(res.body.message).to.match(/EndpointArtifactError/);
    };
    const anErrorMessageWith = (
      value: string | RegExp
    ): ((res: { body: { message: string } }) => void) => {
      return (res) => {
        if (value instanceof RegExp) {
          expect(res.body.message).to.match(value);
        } else {
          expect(res.body.message).to.be(value);
        }
      };
    };

    describe('and accessing Custom YARA signatures', () => {
      const exceptionsGenerator = new ExceptionsListItemGenerator();
      let customYaraSignatureData: ArtifactTestData;

      interface YaraSignatureApiCallInterface<BodyReturnType = unknown> {
        method: keyof Pick<TestAgent, 'post' | 'put' | 'get' | 'delete' | 'patch'>;
        info?: string;
        path: string;
        getBody: (rule?: string, osTypes?: OsTypeArray) => BodyReturnType;
      }

      beforeEach(async () => {
        customYaraSignatureData = await endpointArtifactTestResources.createCustomYaraSignature({
          tags: [`${BY_POLICY_ARTIFACT_TAG_PREFIX}${fleetEndpointPolicy.packagePolicy.id}`],
        });
      });

      afterEach(async () => {
        if (customYaraSignatureData) {
          await customYaraSignatureData.cleanup();
        }
      });

      const createUpdateApiCalls: Array<
        YaraSignatureApiCallInterface<
          Pick<ExceptionListItemSchema, 'os_types' | 'tags' | 'entries'>
        >
      > = [
        {
          method: 'post',
          info: 'create single item',
          path: EXCEPTION_LIST_ITEM_URL,
          getBody: (rule?: string, osTypes?: OsTypeArray) => {
            const body = exceptionsGenerator.generateCustomYaraSignatureForCreate({
              tags: [GLOBAL_ARTIFACT_TAG],
              ...(osTypes ? { os_types: osTypes } : {}),
            });

            if (rule) {
              (body.entries[0] as EntryMatch).value = rule;
            }

            return body;
          },
        },
        {
          method: 'put',
          info: 'update single item',
          path: EXCEPTION_LIST_ITEM_URL,
          getBody: (rule?: string, osTypes?: OsTypeArray) => {
            const body = exceptionsGenerator.generateCustomYaraSignatureForUpdate({
              id: customYaraSignatureData.artifact.id,
              item_id: customYaraSignatureData.artifact.item_id,
              tags: [GLOBAL_ARTIFACT_TAG],
              _version: customYaraSignatureData.artifact._version,
              ...(osTypes ? { os_types: osTypes } : {}),
            });

            if (rule) {
              (body.entries[0] as EntryMatch).value = rule;
            }

            return body;
          },
        },
      ];

      const deleteApiCall: YaraSignatureApiCallInterface = {
        method: 'delete',
        info: 'delete single item',
        get path() {
          return `${EXCEPTION_LIST_ITEM_URL}?item_id=${customYaraSignatureData.artifact.item_id}&namespace_type=${customYaraSignatureData.artifact.namespace_type}`;
        },
        getBody: () => undefined,
      };

      const readPrivilegeApiCalls: Array<YaraSignatureApiCallInterface> = [
        {
          method: 'get',
          info: 'single item',
          get path() {
            return `${EXCEPTION_LIST_ITEM_URL}?item_id=${customYaraSignatureData.artifact.item_id}&namespace_type=${customYaraSignatureData.artifact.namespace_type}`;
          },
          getBody: () => undefined,
        },
        {
          method: 'get',
          info: 'list summary',
          get path() {
            return `${EXCEPTION_LIST_URL}/summary?list_id=${customYaraSignatureData.artifact.list_id}&namespace_type=${customYaraSignatureData.artifact.namespace_type}`;
          },
          getBody: () => undefined,
        },
        {
          method: 'get',
          info: 'find items',
          get path() {
            return `${EXCEPTION_LIST_ITEM_URL}/_find?list_id=${customYaraSignatureData.artifact.list_id}&namespace_type=${customYaraSignatureData.artifact.namespace_type}&page=1&per_page=1&sort_field=name&sort_order=asc`;
          },
          getBody: () => undefined,
        },
        {
          method: 'post',
          info: 'list export',
          get path() {
            return `${EXCEPTION_LIST_URL}/_export?list_id=${customYaraSignatureData.artifact.list_id}&namespace_type=${customYaraSignatureData.artifact.namespace_type}&id=${customYaraSignatureData.artifact.id}&include_expired_exceptions=true`;
          },
          getBody: () => undefined,
        },
      ];

      describe('and user has YARA write + global artifact management privileges', () => {
        const dummyRuleWithComment = 'rule dummy { condition: false }  // '; // note: divisible by 3

        for (const customYaraSignatureApiCall of createUpdateApiCalls) {
          it(`should error on [${customYaraSignatureApiCall.method}] if invalid entry field is used`, async () => {
            const body = customYaraSignatureApiCall.getBody();

            body.entries[0].field = 'some.invalid.field' as (typeof body.entries)[0]['field'];
            await globalWriteAccessTestAgent[customYaraSignatureApiCall.method](
              customYaraSignatureApiCall.path
            )
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(400)
              .expect(anEndpointArtifactError)
              .expect(anErrorMessageWith(/expected value to equal \[custom_yara_signature\]/));
          });

          describe(`YARA rules validation - ${customYaraSignatureApiCall.info}`, () => {
            describe('Syntax validation', () => {
              it('accepts valid rules', async () => {
                await globalWriteAccessTestAgent[customYaraSignatureApiCall.method](
                  customYaraSignatureApiCall.path
                )
                  .set('kbn-xsrf', 'true')
                  .send(
                    customYaraSignatureApiCall.getBody(`
                    rule rule1 { condition: true }
                    rule rule2 { condition: true }`)
                  )
                  .expect(200);
              });

              it('rejects a rule with invalid syntax', async () => {
                await globalWriteAccessTestAgent[customYaraSignatureApiCall.method](
                  customYaraSignatureApiCall.path
                )
                  .set('kbn-xsrf', 'true')
                  .send(
                    customYaraSignatureApiCall.getBody(`
                    rule rule1 { condition: cheese }
                    // rule rule2 { condition: true }`)
                  )
                  .expect(400)
                  .expect(anEndpointArtifactError)
                  .expect(
                    anErrorMessageWith(
                      /Invalid YARA rules \(libyara [0-9.]+\), 1 error found: \[line 2\] undefined identifier "cheese"/
                    )
                  );
              });

              it('returns total error count, while listed errors are capped', async () => {
                await globalWriteAccessTestAgent[customYaraSignatureApiCall.method](
                  customYaraSignatureApiCall.path
                )
                  .set('kbn-xsrf', 'true')
                  .send(
                    customYaraSignatureApiCall.getBody(
                      Array.from(
                        { length: 100 },
                        (_, i) => `rule r${i} { condition: cheese }`
                      ).join('\n')
                    )
                  )
                  .expect(400)
                  .expect(anEndpointArtifactError)
                  .expect(
                    anErrorMessageWith(/Invalid YARA rules \(libyara [0-9.]+\), 100 errors found:/)
                  )
                  .expect((res: { body: { message: string } }) => {
                    expect((res.body.message.match(/"cheese"/g) ?? []).length).to.be(64);
                  });
              });

              it('rejects a string value that does not contain rules', async () => {
                await globalWriteAccessTestAgent[customYaraSignatureApiCall.method](
                  customYaraSignatureApiCall.path
                )
                  .set('kbn-xsrf', 'true')
                  .send(customYaraSignatureApiCall.getBody('// rule rule1 { condition: true }'))
                  .expect(400)
                  .expect(anEndpointArtifactError)
                  .expect(
                    anErrorMessageWith(
                      /Invalid YARA rules \(libyara [0-9.]+\), 1 error found: No YARA rules found. Please provide at least one rule/
                    )
                  );
              });
            });

            describe('Rule identifiers', () => {
              it('accepts multiple rules with unique identifiers', async () => {
                await globalWriteAccessTestAgent[customYaraSignatureApiCall.method](
                  customYaraSignatureApiCall.path
                )
                  .set('kbn-xsrf', 'true')
                  .send(
                    customYaraSignatureApiCall.getBody(`
                    rule rule1 { condition: true }
                    rule rule2 { condition: true }`)
                  )
                  .expect(200);
              });

              it('rejects rules with duplicate identifiers', async () => {
                await globalWriteAccessTestAgent[customYaraSignatureApiCall.method](
                  customYaraSignatureApiCall.path
                )
                  .set('kbn-xsrf', 'true')
                  .send(
                    customYaraSignatureApiCall.getBody(`
                    rule rule1 { condition: true }
                    rule rule1 { condition: true }`)
                  )
                  .expect(400)
                  .expect(anEndpointArtifactError)
                  .expect(
                    anErrorMessageWith(/1 error found: \[line 3\] duplicated identifier "rule1"/)
                  );
              });

              it(`accepts a rule with ${MAXIMUM_RULE_IDENTIFIER_LENGTH} characters long identifier`, async () => {
                await globalWriteAccessTestAgent[customYaraSignatureApiCall.method](
                  customYaraSignatureApiCall.path
                )
                  .set('kbn-xsrf', 'true')
                  .send(
                    customYaraSignatureApiCall.getBody(`
                      rule rule1 { condition: true }
                      rule ${'a'.repeat(MAXIMUM_RULE_IDENTIFIER_LENGTH)} { condition: true }`)
                  )
                  .expect(200);
              });

              it(`rejects a rule with ${
                MAXIMUM_RULE_IDENTIFIER_LENGTH + 1
              } characters long identifier`, async () => {
                await globalWriteAccessTestAgent[customYaraSignatureApiCall.method](
                  customYaraSignatureApiCall.path
                )
                  .set('kbn-xsrf', 'true')
                  .send(
                    customYaraSignatureApiCall.getBody(`
                      rule rule1 { condition: true }
                      rule ${'a'.repeat(MAXIMUM_RULE_IDENTIFIER_LENGTH + 1)} { condition: true }`)
                  )
                  .expect(400)
                  .expect(anEndpointArtifactError)
                  .expect(
                    anErrorMessageWith(
                      new RegExp(
                        `1 error found: \\[line 3\\] Too long rule identifier "${'a'.repeat(
                          MAXIMUM_RULE_IDENTIFIER_LENGTH + 1
                        )}", maximum is ${MAXIMUM_RULE_IDENTIFIER_LENGTH} characters`
                      )
                    )
                  );
              });

              it('returns "too long identifier" error for multiple rules with too long identifiers', async () => {
                await globalWriteAccessTestAgent[customYaraSignatureApiCall.method](
                  customYaraSignatureApiCall.path
                )
                  .set('kbn-xsrf', 'true')
                  .send(
                    customYaraSignatureApiCall.getBody(`
                      rule rule1 { condition: true }

                      // all identifiers are only 'a's to make sure the correct line number is reported on whole words
                      rule ${'a'.repeat(MAXIMUM_RULE_IDENTIFIER_LENGTH + 3)} { condition: true }
                      rule rule2 { condition: true }

                      // no space after the identifier intentionally
                      rule ${'a'.repeat(MAXIMUM_RULE_IDENTIFIER_LENGTH + 2)}{ condition: true }
                      rule rule3 { condition: true }

                      // line break after identifier intentionally
                      rule ${'a'.repeat(MAXIMUM_RULE_IDENTIFIER_LENGTH + 1)}
                      { condition: true }`)
                  )
                  .expect(400)
                  .expect(anEndpointArtifactError)
                  .expect(anErrorMessageWith(/3 errors found:/))
                  .expect(
                    anErrorMessageWith(
                      new RegExp(
                        `\\[line 5\\] Too long rule identifier "${'a'.repeat(
                          MAXIMUM_RULE_IDENTIFIER_LENGTH + 3
                        )}"`
                      )
                    )
                  )
                  .expect(
                    anErrorMessageWith(
                      new RegExp(
                        `\\[line 9\\] Too long rule identifier "${'a'.repeat(
                          MAXIMUM_RULE_IDENTIFIER_LENGTH + 2
                        )}"`
                      )
                    )
                  )
                  .expect(
                    anErrorMessageWith(
                      new RegExp(
                        `\\[line 13\\] Too long rule identifier "${'a'.repeat(
                          MAXIMUM_RULE_IDENTIFIER_LENGTH + 1
                        )}"`
                      )
                    )
                  );
              });
            });

            describe('Meta fields', () => {
              describe('meta.arch', () => {
                it('accepts rules with meta.arch set to "x86" and/or "arm64"', async () => {
                  await globalWriteAccessTestAgent[customYaraSignatureApiCall.method](
                    customYaraSignatureApiCall.path
                  )
                    .set('kbn-xsrf', 'true')
                    .send(
                      customYaraSignatureApiCall.getBody(`
                      rule rule1 { meta: arch = "x86" condition: true }
                      rule rule2 { meta: arch = "arm64" condition: true }

                      // zero or one space after comma is accepted
                      rule rule3 { meta: arch = "x86,arm64" condition: true }
                      rule rule4 { meta: arch = "x86, arm64" condition: true }

                      rule rule5 { meta: arch = "arm64,x86" condition: true }
                      rule rule6 { meta: arch = "arm64, x86" condition: true }
                      `)
                    )
                    .expect(200);
                });

                it('rejects rules with meta.arch containing invalid values', async () => {
                  await globalWriteAccessTestAgent[customYaraSignatureApiCall.method](
                    customYaraSignatureApiCall.path
                  )
                    .set('kbn-xsrf', 'true')
                    .send(
                      customYaraSignatureApiCall.getBody(`
                      rule rule1 { meta: arch = "random value" condition: true }
                      rule rule2 { meta: arch = "arm64 x86" condition: true }
                      rule rule3 { meta: arch = "x86, cheese" condition: true }
                      rule rule4 { meta: arch = "" condition: true } // empty string is invalid
                      `)
                    )
                    .expect(400)
                    .expect(anEndpointArtifactError)
                    .expect(
                      anErrorMessageWith(/Invalid YARA rules \(libyara [0-9.]+\), 4 errors found:/)
                    )
                    .expect(
                      anErrorMessageWith(
                        /\[line 2\] Invalid "meta.arch" value "random value" on rule "rule1", only "x86" and\/or "arm64" are allowed in a comma separated list/
                      )
                    )
                    .expect(
                      anErrorMessageWith(
                        /\[line 3\] Invalid "meta.arch" value "arm64 x86" on rule "rule2", only "x86" and\/or "arm64" are allowed in a comma separated list/
                      )
                    )
                    .expect(
                      anErrorMessageWith(
                        /\[line 4\] Invalid "meta.arch" value "x86, cheese" on rule "rule3", only "x86" and\/or "arm64" are allowed in a comma separated list/
                      )
                    )
                    .expect(
                      anErrorMessageWith(
                        /\[line 5\] Invalid "meta.arch" value "" on rule "rule4", only "x86" and\/or "arm64" are allowed in a comma separated list/
                      )
                    );
                });

                it('rejects rules with meta.arch containing valid values but invalid format', async () => {
                  await globalWriteAccessTestAgent[customYaraSignatureApiCall.method](
                    customYaraSignatureApiCall.path
                  )
                    .set('kbn-xsrf', 'true')
                    .send(
                      customYaraSignatureApiCall.getBody(`
                      rule rule1 { meta: arch = "arm64,  x86" condition: true } // too many spaces after comma
                      rule rule2 { meta: arch = "arm64, x86 " condition: true } // trailing space not allowed
                      rule rule3 { meta: arch = " arm64, x86" condition: true } // leading space not allowed
                      `)
                    )
                    .expect(400)
                    .expect(anEndpointArtifactError)
                    .expect(
                      anErrorMessageWith(/Invalid YARA rules \(libyara [0-9.]+\), 3 errors found:/)
                    )
                    .expect(
                      anErrorMessageWith(
                        /\[line 2\] Invalid "meta.arch" value "arm64,  x86" on rule "rule1", only "x86" and\/or "arm64" are allowed in a comma separated list/
                      )
                    )
                    .expect(
                      anErrorMessageWith(
                        /\[line 3\] Invalid "meta.arch" value "arm64, x86 " on rule "rule2", only "x86" and\/or "arm64" are allowed in a comma separated list/
                      )
                    )
                    .expect(
                      anErrorMessageWith(
                        /\[line 4\] Invalid "meta.arch" value " arm64, x86" on rule "rule3", only "x86" and\/or "arm64" are allowed in a comma separated list/
                      )
                    );
                });

                it('rejects rules with duplicate values in meta.arch', async () => {
                  await globalWriteAccessTestAgent[customYaraSignatureApiCall.method](
                    customYaraSignatureApiCall.path
                  )
                    .set('kbn-xsrf', 'true')
                    .send(
                      customYaraSignatureApiCall.getBody(`
                      rule rule1 { meta: arch = "x86,x86" condition: true }
                      rule rule2 { meta: arch = "arm64, arm64" condition: true }
                      `)
                    )
                    .expect(400)
                    .expect(anEndpointArtifactError)
                    .expect(
                      anErrorMessageWith(/Invalid YARA rules \(libyara [0-9.]+\), 2 errors found:/)
                    )
                    .expect(
                      anErrorMessageWith(
                        /\[line 2\] Invalid "meta.arch" value "x86,x86" on rule "rule1", only "x86" and\/or "arm64" are allowed in a comma separated list/
                      )
                    )
                    .expect(
                      anErrorMessageWith(
                        /\[line 3\] Invalid "meta.arch" value "arm64, arm64" on rule "rule2", only "x86" and\/or "arm64" are allowed in a comma separated list/
                      )
                    );
                });

                it('rejects rules with multiple meta.arch fields set', async () => {
                  await globalWriteAccessTestAgent[customYaraSignatureApiCall.method](
                    customYaraSignatureApiCall.path
                  )
                    .set('kbn-xsrf', 'true')
                    .send(
                      customYaraSignatureApiCall.getBody(
                        `rule rule1 {
                          meta:
                            arch = "x86"
                            arch = "arm64"
                          condition: true
                         }`
                      )
                    )
                    .expect(400)
                    .expect(anEndpointArtifactError)
                    .expect(
                      anErrorMessageWith(
                        /Invalid YARA rules \(libyara [0-9.]+\), 1 error found: \[line 3\] Multiple "meta.arch" fields set on rule "rule1", only one is allowed/
                      )
                    );
                });

                it('truncates meta.arch value to 30 characters in error response', async () => {
                  await globalWriteAccessTestAgent[customYaraSignatureApiCall.method](
                    customYaraSignatureApiCall.path
                  )
                    .set('kbn-xsrf', 'true')
                    .send(
                      customYaraSignatureApiCall.getBody(`
                      rule rule1 { meta: arch = "x86, arm64                   X" condition: true } // 30 chars
                      rule rule2 { meta: arch = "x86, arm64                    X" condition: true } // 31 chars
                      `)
                    )
                    .expect(400)
                    .expect(anEndpointArtifactError)
                    .expect(
                      anErrorMessageWith(/Invalid YARA rules \(libyara [0-9.]+\), 2 errors found:/)
                    )
                    .expect(
                      anErrorMessageWith(
                        /\[line 2\] Invalid "meta.arch" value "x86, arm64                   X" on rule "rule1", only "x86" and\/or "arm64" are allowed in a comma separated list/
                      )
                    )
                    .expect(
                      anErrorMessageWith(
                        /\[line 3\] Invalid "meta.arch" value "x86, arm64                    \.\.\." on rule "rule2", only "x86" and\/or "arm64" are allowed in a comma separated list/
                      )
                    );
                });
              });

              describe('meta.scan_type', () => {
                it('accepts rules with meta.scan_type set to "Memory"', async () => {
                  await globalWriteAccessTestAgent[customYaraSignatureApiCall.method](
                    customYaraSignatureApiCall.path
                  )
                    .set('kbn-xsrf', 'true')
                    .send(
                      customYaraSignatureApiCall.getBody(`
                      rule rule1 { meta: scan_type = "Memory" condition: true }
                      `)
                    )
                    .expect(200);
                });

                it('rejects rules with meta.scan_type containing invalid values', async () => {
                  await globalWriteAccessTestAgent[customYaraSignatureApiCall.method](
                    customYaraSignatureApiCall.path
                  )
                    .set('kbn-xsrf', 'true')
                    .send(
                      customYaraSignatureApiCall.getBody(`
                      rule rule1 { meta: scan_type = "invalid" condition: true }
                      rule rule2 { meta: scan_type = "memory" condition: true }
                      rule rule3 { meta: scan_type = "" condition: true }
                      `)
                    )
                    .expect(400)
                    .expect(anEndpointArtifactError)
                    .expect(
                      anErrorMessageWith(/Invalid YARA rules \(libyara [0-9.]+\), 3 errors found:/)
                    )
                    .expect(
                      anErrorMessageWith(
                        /\[line 2\] Invalid "meta.scan_type" value "invalid" on rule "rule1", only "Memory" is allowed/
                      )
                    )
                    .expect(
                      anErrorMessageWith(
                        /\[line 3\] Invalid "meta.scan_type" value "memory" on rule "rule2", only "Memory" is allowed/
                      )
                    )
                    .expect(
                      anErrorMessageWith(
                        /\[line 4\] Invalid "meta.scan_type" value "" on rule "rule3", only "Memory" is allowed/
                      )
                    );
                });

                it('rejects rules with meta.scan_type containing valid values but invalid format', async () => {
                  await globalWriteAccessTestAgent[customYaraSignatureApiCall.method](
                    customYaraSignatureApiCall.path
                  )
                    .set('kbn-xsrf', 'true')
                    .send(
                      customYaraSignatureApiCall.getBody(`
                      rule rule1 { meta: scan_type = "Memory " condition: true } // trailing space not allowed
                      rule rule2 { meta: scan_type = " Memory" condition: true } // leading space not allowed
                      `)
                    )
                    .expect(400)
                    .expect(anEndpointArtifactError)
                    .expect(
                      anErrorMessageWith(/Invalid YARA rules \(libyara [0-9.]+\), 2 errors found:/)
                    )
                    .expect(
                      anErrorMessageWith(
                        /\[line 2\] Invalid "meta.scan_type" value "Memory " on rule "rule1", only "Memory" is allowed/
                      )
                    )
                    .expect(
                      anErrorMessageWith(
                        /\[line 3\] Invalid "meta.scan_type" value " Memory" on rule "rule2", only "Memory" is allowed/
                      )
                    );
                });

                it('truncates meta.scan_type value to 30 characters in error response', async () => {
                  await globalWriteAccessTestAgent[customYaraSignatureApiCall.method](
                    customYaraSignatureApiCall.path
                  )
                    .set('kbn-xsrf', 'true')
                    .send(
                      customYaraSignatureApiCall.getBody(`
                      rule rule1 { meta: scan_type = "Memory                       X" condition: true } // 30 chars
                      rule rule2 { meta: scan_type = "Memory                        X" condition: true } // 31 chars
                      `)
                    )
                    .expect(400)
                    .expect(anEndpointArtifactError)
                    .expect(
                      anErrorMessageWith(/Invalid YARA rules \(libyara [0-9.]+\), 2 errors found:/)
                    )
                    .expect(
                      anErrorMessageWith(
                        /\[line 2\] Invalid "meta.scan_type" value "Memory                       X" on rule "rule1", only "Memory" is allowed/
                      )
                    )
                    .expect(
                      anErrorMessageWith(
                        /\[line 3\] Invalid "meta.scan_type" value "Memory                        \.\.\." on rule "rule2", only "Memory" is allowed/
                      )
                    );
                });

                it('rejects rules with multiple meta.scan_type fields set', async () => {
                  await globalWriteAccessTestAgent[customYaraSignatureApiCall.method](
                    customYaraSignatureApiCall.path
                  )
                    .set('kbn-xsrf', 'true')
                    .send(
                      customYaraSignatureApiCall.getBody(
                        `rule rule1 {
                          meta:
                            scan_type = "Memory"
                            scan_type = "Whatever"
                          condition: true
                         }`
                      )
                    )
                    .expect(400)
                    .expect(anEndpointArtifactError)
                    .expect(
                      anErrorMessageWith(
                        /Invalid YARA rules \(libyara [0-9.]+\), 1 error found: \[line 3\] Multiple "meta.scan_type" fields set on rule "rule1", only one is allowed/
                      )
                    );
                });
              });

              describe('meta.os', () => {
                const matchingRulesAndOsTypes: { rules: string; osTypes: OsTypeArray }[] = [
                  {
                    rules: `
                      rule rule1 { meta: os = "Windows" condition: true }
                      rule rule2 { meta: os = "Windows" condition: false }
                      `,
                    osTypes: ['windows'],
                  },
                  {
                    rules: `
                      rule rule1 { meta: os = "Linux" condition: true }
                      rule rule2 { meta: os = "Linux" condition: false }
                      `,
                    osTypes: ['linux'],
                  },
                  {
                    rules: `
                      rule rule1 { meta: os = "MacOS" condition: true }
                      rule rule2 { meta: os = "MacOS" condition: false }
                      `,
                    osTypes: ['macos'],
                  },
                  {
                    rules: `
                      rule rule1 { meta: os = "Windows,Linux" condition: true }
                      rule rule2 { meta: os = "Linux, Windows" condition: false }
                      `,
                    osTypes: ['windows', 'linux'],
                  },
                  {
                    rules: `
                      rule rule1 { meta: os = "MacOS, Windows" condition: true }
                      rule rule2 { meta: os = "Windows,MacOS" condition: false }
                      `,
                    osTypes: ['windows', 'macos'],
                  },
                  {
                    rules: `
                      rule rule1 { meta: os = "Linux,Windows,MacOS" condition: true }
                      rule rule2 { meta: os = "Windows, Linux, MacOS" condition: false }
                      `,
                    osTypes: ['windows', 'linux', 'macos'],
                  },
                ];

                for (const { rules, osTypes } of matchingRulesAndOsTypes) {
                  it(`accepts rules with valid meta.os as long as it matches the os_types set to ${osTypes.join(
                    ', '
                  )}`, async () => {
                    await globalWriteAccessTestAgent[customYaraSignatureApiCall.method](
                      customYaraSignatureApiCall.path
                    )
                      .set('kbn-xsrf', 'true')
                      .send(customYaraSignatureApiCall.getBody(rules, osTypes))
                      .expect(200);
                  });
                }

                it('rejects rules with meta.os containing invalid values', async () => {
                  await globalWriteAccessTestAgent[customYaraSignatureApiCall.method](
                    customYaraSignatureApiCall.path
                  )
                    .set('kbn-xsrf', 'true')
                    .send(
                      customYaraSignatureApiCall.getBody(`
                      rule rule1 { meta: os = "invalid" condition: true }
                      rule rule2 { meta: os = "windows, macos" condition: true }
                      rule rule3 { meta: os = "Windows,CheeseOS" condition: true }
                      rule rule4 { meta: os = "" condition: true }
                      `)
                    )
                    .expect(400)
                    .expect(anEndpointArtifactError)
                    .expect(
                      anErrorMessageWith(/Invalid YARA rules \(libyara [0-9.]+\), 4 errors found:/)
                    )
                    .expect(
                      anErrorMessageWith(
                        /\[line 2\] Invalid "meta.os" value "invalid" on rule "rule1", only "Windows", "Linux" and\/or "MacOS" are allowed in a comma separated list/
                      )
                    )
                    .expect(
                      anErrorMessageWith(
                        /\[line 3\] Invalid "meta.os" value "windows, macos" on rule "rule2", only "Windows", "Linux" and\/or "MacOS" are allowed in a comma separated list/
                      )
                    )
                    .expect(
                      anErrorMessageWith(
                        /\[line 4\] Invalid "meta.os" value "Windows,CheeseOS" on rule "rule3", only "Windows", "Linux" and\/or "MacOS" are allowed in a comma separated list/
                      )
                    )
                    .expect(
                      anErrorMessageWith(
                        /\[line 5\] Invalid "meta.os" value "" on rule "rule4", only "Windows", "Linux" and\/or "MacOS" are allowed in a comma separated list/
                      )
                    );
                });

                it('rejects rules with meta.os containing valid values but invalid format', async () => {
                  await globalWriteAccessTestAgent[customYaraSignatureApiCall.method](
                    customYaraSignatureApiCall.path
                  )
                    .set('kbn-xsrf', 'true')
                    .send(
                      customYaraSignatureApiCall.getBody(`
                      rule rule1 { meta: os = "Windows,  Linux," condition: true } // only zero or one space after comma is accepted
                      rule rule2 { meta: os = " Windows,Linux" condition: true } // leading space not allowed
                      rule rule3 { meta: os = "Windows,Linux " condition: true } // trailing space not allowed
                      `)
                    )
                    .expect(400)
                    .expect(anEndpointArtifactError)
                    .expect(
                      anErrorMessageWith(/Invalid YARA rules \(libyara [0-9.]+\), 3 errors found:/)
                    )
                    .expect(
                      anErrorMessageWith(
                        /\[line 2\] Invalid "meta.os" value "Windows,  Linux," on rule "rule1", only "Windows", "Linux" and\/or "MacOS" are allowed in a comma separated list/
                      )
                    )
                    .expect(
                      anErrorMessageWith(
                        /\[line 3\] Invalid "meta.os" value " Windows,Linux" on rule "rule2", only "Windows", "Linux" and\/or "MacOS" are allowed in a comma separated list/
                      )
                    )
                    .expect(
                      anErrorMessageWith(
                        /\[line 4\] Invalid "meta.os" value "Windows,Linux " on rule "rule3", only "Windows", "Linux" and\/or "MacOS" are allowed in a comma separated list/
                      )
                    );
                });

                it('truncates meta.os value to 30 characters in error response', async () => {
                  await globalWriteAccessTestAgent[customYaraSignatureApiCall.method](
                    customYaraSignatureApiCall.path
                  )
                    .set('kbn-xsrf', 'true')
                    .send(
                      customYaraSignatureApiCall.getBody(`
                      rule rule1 { meta: os = "Windows,Linux, MacOS         X" condition: true } // 30 chars
                      rule rule2 { meta: os = "Windows,Linux, MacOS          X" condition: true } // 31 chars
                      `)
                    )
                    .expect(400)
                    .expect(anEndpointArtifactError)
                    .expect(
                      anErrorMessageWith(/Invalid YARA rules \(libyara [0-9.]+\), 2 errors found:/)
                    )
                    .expect(
                      anErrorMessageWith(
                        /\[line 2\] Invalid "meta.os" value "Windows,Linux, MacOS         X" on rule "rule1", only "Windows", "Linux" and\/or "MacOS" are allowed in a comma separated list/
                      )
                    )
                    .expect(
                      anErrorMessageWith(
                        /\[line 3\] Invalid "meta.os" value "Windows,Linux, MacOS          \.\.\." on rule "rule2", only "Windows", "Linux" and\/or "MacOS" are allowed in a comma separated list/
                      )
                    );
                });

                it('rejects rules with duplicate values in meta.os', async () => {
                  await globalWriteAccessTestAgent[customYaraSignatureApiCall.method](
                    customYaraSignatureApiCall.path
                  )
                    .set('kbn-xsrf', 'true')
                    .send(
                      customYaraSignatureApiCall.getBody(`
                      rule rule1 { meta: os = "Windows,Windows" condition: true }
                      rule rule2 { meta: os = "Linux, MacOS, Linux" condition: true }
                      rule rule3 { meta: os = "MacOS, Linux, MacOS" condition: true }
                      `)
                    )
                    .expect(400)
                    .expect(anEndpointArtifactError)
                    .expect(
                      anErrorMessageWith(/Invalid YARA rules \(libyara [0-9.]+\), 3 errors found:/)
                    )
                    .expect(
                      anErrorMessageWith(
                        /\[line 2\] Invalid "meta.os" value "Windows,Windows" on rule "rule1", only "Windows", "Linux" and\/or "MacOS" are allowed in a comma separated list/
                      )
                    )
                    .expect(
                      anErrorMessageWith(
                        /\[line 3\] Invalid "meta.os" value "Linux, MacOS, Linux" on rule "rule2", only "Windows", "Linux" and\/or "MacOS" are allowed in a comma separated list/
                      )
                    )
                    .expect(
                      anErrorMessageWith(
                        /\[line 4\] Invalid "meta.os" value "MacOS, Linux, MacOS" on rule "rule3", only "Windows", "Linux" and\/or "MacOS" are allowed in a comma separated list/
                      )
                    );
                });

                it('rejects rules with multiple meta.os fields set', async () => {
                  await globalWriteAccessTestAgent[customYaraSignatureApiCall.method](
                    customYaraSignatureApiCall.path
                  )
                    .set('kbn-xsrf', 'true')
                    .send(
                      customYaraSignatureApiCall.getBody(
                        `rule rule1 {
                          meta:
                            os = "Windows"
                            os = "Linux"
                          condition: true
                         }`
                      )
                    )
                    .expect(400)
                    .expect(anEndpointArtifactError)
                    .expect(
                      anErrorMessageWith(
                        /Invalid YARA rules \(libyara [0-9.]+\), 1 error found: \[line 3\] Multiple "meta.os" fields set on rule "rule1", only one is allowed/
                      )
                    );
                });

                const nonMatchingRulesAndOsTypes: { rules: string; osTypes: OsTypeArray }[] = [
                  {
                    rules: `
                      rule rule1 { meta: os = "Linux, Windows" condition: true }
                      rule rule2 { meta: os = "MacOS" condition: false }
                      rule rule3 { meta: os = "Windows, Linux, MacOS" condition: false }
                      `,
                    osTypes: ['windows'],
                  },
                  {
                    rules: `
                      rule rule1 { meta: os = "Windows" condition: true }
                      rule rule2 { meta: os = "MacOS" condition: false }
                      rule rule3 { meta: os = "Windows, Linux, MacOS" condition: false }
                      `,
                    osTypes: ['linux'],
                  },
                  {
                    rules: `
                      rule rule1 { meta: os = "Linux" condition: true }
                      rule rule2 { meta: os = "Windows" condition: false }
                      rule rule3 { meta: os = "Windows, Linux, MacOS" condition: false }
                      `,
                    osTypes: ['macos'],
                  },
                  {
                    rules: `
                      rule rule1 { meta: os = "Windows" condition: true }
                      rule rule2 { meta: os = "Linux" condition: false }
                      rule rule3 { meta: os = "Windows, Linux, MacOS" condition: false }
                      `,
                    osTypes: ['windows', 'linux'],
                  },
                  {
                    rules: `
                      rule rule1 { meta: os = "Linux,Windows" condition: true }
                      rule rule2 { meta: os = "Windows" condition: false }
                      rule rule3 { meta: os = "Windows, Linux, MacOS" condition: false }
                      `,
                    osTypes: ['windows', 'macos'],
                  },
                  {
                    rules: `
                      rule rule1 { meta: os = "Linux,MacOS" condition: true }
                      rule rule2 { meta: os = "Windows, MacOS" condition: false }
                      rule rule3 { meta: os = "Windows, Linux" condition: false }
                      `,
                    osTypes: ['windows', 'linux', 'macos'],
                  },
                ];

                for (const { rules, osTypes } of nonMatchingRulesAndOsTypes) {
                  it(`rejects rules with meta.os set to a different value as os_types (${osTypes.join(
                    ', '
                  )})`, async () => {
                    await globalWriteAccessTestAgent[customYaraSignatureApiCall.method](
                      customYaraSignatureApiCall.path
                    )
                      .set('kbn-xsrf', 'true')
                      .send(customYaraSignatureApiCall.getBody(rules, osTypes))
                      .expect(400)
                      .expect(anEndpointArtifactError)
                      .expect(
                        anErrorMessageWith(
                          /Invalid YARA rules \(libyara [0-9.]+\), 3 errors found:/
                        )
                      )
                      .expect(
                        anErrorMessageWith(
                          new RegExp(
                            `\\[line 2\\] "meta.os" value "[\\w, ]+" is different from "os_types" value "${osTypes.join(
                              ', '
                            )}" on rule "rule1". Set meta.os to the same OSes \\(using "Windows", "Linux" and\\/or "MacOS"\\) or drop the meta.os field`
                          )
                        )
                      )
                      .expect(
                        anErrorMessageWith(
                          new RegExp(
                            `\\[line 3\\] "meta.os" value "[\\w, ]+" is different from "os_types" value "${osTypes.join(
                              ', '
                            )}" on rule "rule2". Set meta.os to the same OSes \\(using "Windows", "Linux" and\\/or "MacOS"\\) or drop the meta.os field`
                          )
                        )
                      )
                      .expect(
                        anErrorMessageWith(
                          new RegExp(
                            `\\[line 4\\] "meta.os" value "[\\w, ]+" is different from "os_types" value "${osTypes.join(
                              ', '
                            )}" on rule "rule3". Set meta.os to the same OSes \\(using "Windows", "Linux" and\\/or "MacOS"\\) or drop the meta.os field`
                          )
                        )
                      );
                  });
                }
              });
            });

            describe('Module support', () => {
              describe('Supported modules', () => {
                const supportedModules: Record<string, string> = {
                  pe: 'pe.is_pe',
                  elf: 'elf.type == elf.ET_NONE',
                  math: 'math.abs(-1) == 1',
                  time: 'time .now() >= 0',
                  string: 'string.length("a") == 1',
                  console: 'console.log("x")',
                  tests: 'tests.foobar(1) == "foo"',
                };

                for (const [module, condition] of Object.entries(supportedModules)) {
                  it(`accepts rules that import the ${module} module on [${customYaraSignatureApiCall.method}]`, async () => {
                    await globalWriteAccessTestAgent[customYaraSignatureApiCall.method](
                      customYaraSignatureApiCall.path
                    )
                      .set('kbn-xsrf', 'true')
                      .send(
                        customYaraSignatureApiCall.getBody(`
                          import "${module}"
                          rule ${module}Check {
                            condition:
                              ${condition}
                            }`)
                      )
                      .expect(200);
                  });
                }
              });

              describe('Unsupported modules', () => {
                const unsupportedModules = [
                  // built-in but not supported YARA modules
                  'hash',
                  'macho',
                  'dotnet',
                  'dex',
                  'magic',
                  'cuckoo',

                  // user modules
                  'userModuleWithRandomName',
                ];

                for (const module of unsupportedModules) {
                  it(`rejects rules that import the ${module} module on [${customYaraSignatureApiCall.method}]`, async () => {
                    await globalWriteAccessTestAgent[customYaraSignatureApiCall.method](
                      customYaraSignatureApiCall.path
                    )
                      .set('kbn-xsrf', 'true')
                      .send(
                        customYaraSignatureApiCall.getBody(`
                          import "${module}"
                          rule ${module}Check {
                            condition:
                              true
                          }`)
                      )
                      .expect(400)
                      .expect(anEndpointArtifactError)
                      .expect(anErrorMessageWith(new RegExp(`unknown module "${module}"`)));
                  });
                }
              });
            });
          });

          it(`should error on [${customYaraSignatureApiCall.method}] if rule value is empty`, async () => {
            const body = customYaraSignatureApiCall.getBody();

            (body.entries[0] as EntryMatch).value = '';
            await globalWriteAccessTestAgent[customYaraSignatureApiCall.method](
              customYaraSignatureApiCall.path
            )
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(400)
              .expect(anErrorMessageWith(/Too small/));
          });

          describe('YARA rule content byte length', () => {
            it(`should accept item on [${customYaraSignatureApiCall.method}] if rule value is ${MAX_YARA_RULE_CONTENT_BYTE_LENGTH} bytes long`, async () => {
              const body = customYaraSignatureApiCall.getBody();

              (body.entries[0] as EntryMatch).value =
                dummyRuleWithComment +
                'a'.repeat(MAX_YARA_RULE_CONTENT_BYTE_LENGTH - dummyRuleWithComment.length);

              await globalWriteAccessTestAgent[customYaraSignatureApiCall.method](
                customYaraSignatureApiCall.path
              )
                .set('kbn-xsrf', 'true')
                .send(body)
                .expect(200);
            });

            it(`should error on [${customYaraSignatureApiCall.method}] if rule value is more than ${MAX_YARA_RULE_CONTENT_BYTE_LENGTH} bytes long`, async () => {
              const body = customYaraSignatureApiCall.getBody();

              (body.entries[0] as EntryMatch).value =
                dummyRuleWithComment +
                'a'.repeat(MAX_YARA_RULE_CONTENT_BYTE_LENGTH - dummyRuleWithComment.length + 1);

              await globalWriteAccessTestAgent[customYaraSignatureApiCall.method](
                customYaraSignatureApiCall.path
              )
                .set('kbn-xsrf', 'true')
                .send(body)
                .expect(400)
                .expect(anEndpointArtifactError)
                .expect(anErrorMessageWith(/must not exceed 32766 bytes/));
            });

            it(`should accept item on [${customYaraSignatureApiCall.method}] if rule value is at the byte limit using multi-byte characters`, async () => {
              const body = customYaraSignatureApiCall.getBody();
              const euroSign = '€'; // takes up 3 bytes
              const valueAtByteLimit =
                dummyRuleWithComment +
                euroSign.repeat(
                  (MAX_YARA_RULE_CONTENT_BYTE_LENGTH - dummyRuleWithComment.length) /
                    Buffer.byteLength(euroSign)
                );

              expect(Buffer.byteLength(valueAtByteLimit, 'utf8')).to.be(
                MAX_YARA_RULE_CONTENT_BYTE_LENGTH
              );
              expect(valueAtByteLimit.length).to.be.lessThan(MAX_YARA_RULE_CONTENT_BYTE_LENGTH);

              (body.entries[0] as EntryMatch).value = valueAtByteLimit;
              await globalWriteAccessTestAgent[customYaraSignatureApiCall.method](
                customYaraSignatureApiCall.path
              )
                .set('kbn-xsrf', 'true')
                .send(body)
                .expect(200);
            });

            it(`should error on [${customYaraSignatureApiCall.method}] if rule value exceeds the byte limit using multi-byte characters`, async () => {
              const body = customYaraSignatureApiCall.getBody();
              const euroSign = '€';
              const valueOverByteLimit =
                dummyRuleWithComment +
                euroSign.repeat(
                  (MAX_YARA_RULE_CONTENT_BYTE_LENGTH - dummyRuleWithComment.length) /
                    Buffer.byteLength(euroSign)
                ) +
                'a'; // plus one byte

              expect(Buffer.byteLength(valueOverByteLimit, 'utf8')).to.be.greaterThan(
                MAX_YARA_RULE_CONTENT_BYTE_LENGTH
              );
              expect(valueOverByteLimit.length).to.be.lessThan(
                MAX_YARA_RULE_CONTENT_BYTE_LENGTH + 1
              );

              (body.entries[0] as EntryMatch).value = valueOverByteLimit;
              await globalWriteAccessTestAgent[customYaraSignatureApiCall.method](
                customYaraSignatureApiCall.path
              )
                .set('kbn-xsrf', 'true')
                .send(body)
                .expect(400)
                .expect(anEndpointArtifactError)
                .expect(anErrorMessageWith(/must not exceed 32766 bytes/));
            });
          });

          it(`should error on [${customYaraSignatureApiCall.method}] if more than one entry`, async () => {
            const body = customYaraSignatureApiCall.getBody();

            body.entries = [...body.entries, { ...body.entries[0] }];
            await globalWriteAccessTestAgent[customYaraSignatureApiCall.method](
              customYaraSignatureApiCall.path
            )
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(400)
              .expect(anEndpointArtifactError)
              .expect(anErrorMessageWith(/\[entries\]: array size is \[2\]/));
          });

          it(`should accept item on [${customYaraSignatureApiCall.method}] if more than one OS is set`, async () => {
            const body = customYaraSignatureApiCall.getBody();

            body.os_types = ['linux', 'windows', 'macos'];
            await globalWriteAccessTestAgent[customYaraSignatureApiCall.method](
              customYaraSignatureApiCall.path
            )
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(200);
          });

          it(`should error on [${customYaraSignatureApiCall.method}] if invalid OS is set`, async () => {
            const body = customYaraSignatureApiCall.getBody();

            (body.os_types as string[]) = ['invalid-os'];
            await globalWriteAccessTestAgent[customYaraSignatureApiCall.method](
              customYaraSignatureApiCall.path
            )
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(400)
              .expect(anErrorMessageWith(/os_types.*Invalid option/));
          });

          it(`should error on [${customYaraSignatureApiCall.method}] if policy id is invalid`, async () => {
            const body = customYaraSignatureApiCall.getBody();

            body.tags = [`${BY_POLICY_ARTIFACT_TAG_PREFIX}123`];
            await globalWriteAccessTestAgent[customYaraSignatureApiCall.method](
              customYaraSignatureApiCall.path
            )
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(400)
              .expect(anEndpointArtifactError)
              .expect(anErrorMessageWith(/invalid policy ids/));
          });
        }

        for (const customYaraSignatureApiCall of [deleteApiCall, ...readPrivilegeApiCalls]) {
          it(`should not error on [${customYaraSignatureApiCall.method}] - [${customYaraSignatureApiCall.info}]`, async () => {
            await globalWriteAccessTestAgent[customYaraSignatureApiCall.method](
              customYaraSignatureApiCall.path
            )
              .set('kbn-xsrf', 'true')
              .send(customYaraSignatureApiCall.getBody() as object)
              .expect(200);
          });
        }
      });

      describe('and user has authorization to read Custom YARA signatures', function () {
        for (const customYaraSignatureApiCall of [...createUpdateApiCalls, deleteApiCall]) {
          it(`should error on [${customYaraSignatureApiCall.method}] - [${customYaraSignatureApiCall.info}]`, async () => {
            await readAccessTestAgent[customYaraSignatureApiCall.method](
              customYaraSignatureApiCall.path
            )
              .set('kbn-xsrf', 'true')
              .send(customYaraSignatureApiCall.getBody() as object)
              .expect(403);
          });
        }

        for (const customYaraSignatureApiCall of readPrivilegeApiCalls) {
          it(`should not error on [${customYaraSignatureApiCall.method}] - [${customYaraSignatureApiCall.info}]`, async () => {
            await readAccessTestAgent[customYaraSignatureApiCall.method](
              customYaraSignatureApiCall.path
            )
              .set('kbn-xsrf', 'true')
              .send(customYaraSignatureApiCall.getBody() as object)
              .expect(200);
          });
        }
      });

      describe('and user has no authorization to Custom YARA signatures', () => {
        for (const customYaraSignatureApiCall of [
          ...createUpdateApiCalls,
          deleteApiCall,
          ...readPrivilegeApiCalls,
        ]) {
          it(`should error on [${customYaraSignatureApiCall.method}] - [${customYaraSignatureApiCall.info}]`, async () => {
            await noAccessTestAgent[customYaraSignatureApiCall.method](
              customYaraSignatureApiCall.path
            )
              .set('kbn-xsrf', 'true')
              .send(customYaraSignatureApiCall.getBody() as object)
              .expect(403);
          });
        }
      });
    });

    describe('validate YARA rules internal API', () => {
      const dummyRuleWithComment = 'rule dummy { condition: false }  // ';

      const callApi = (agent: TestAgent, body: object) =>
        agent
          .post(CUSTOM_YARA_SIGNATURES_VALIDATE_ROUTE)
          .set({
            'kbn-xsrf': 'true',
            'Elastic-Api-Version': '1',
            'x-elastic-internal-origin': 'kibana',
          })
          .send(body);

      describe('syntax validation, errors, warnings', () => {
        it('should return 200 with empty diagnostics for a valid rule', async () => {
          await callApi(globalWriteAccessTestAgent, {
            yara_rule: 'rule rule1 { condition: true }',
            os_types: ['windows'],
          })
            .expect(200)
            .expect((res: { body: ValidateCustomYaraSignatureResponse }) => {
              expect(res.body).to.eql({
                errors: [],
                error_count: 0,
                warnings: [],
                warning_count: 0,
              });
            });
        });

        it('should return 200 with errors for invalid syntax (not 400)', async () => {
          await callApi(globalWriteAccessTestAgent, {
            yara_rule: `
            rule rule1 { condition: cheese }
          `,
            os_types: ['windows'],
          })
            .expect(200)
            .expect((res: { body: ValidateCustomYaraSignatureResponse }) => {
              expect(res.body).to.eql({
                errors: [
                  {
                    severity: 'error',
                    line: 2,
                    message: 'undefined identifier "cheese"',
                  },
                ],
                error_count: 1,
                warnings: [],
                warning_count: 0,
              });
            });
        });

        it('should return 200 with warnings and no errors for a warning-only rule', async () => {
          await callApi(globalWriteAccessTestAgent, {
            yara_rule: 'rule T { strings: $a = "x" condition: $a }',
            os_types: ['windows'],
          })
            .expect(200)
            .expect((res: { body: ValidateCustomYaraSignatureResponse }) => {
              expect(res.body).to.eql({
                errors: [],
                error_count: 0,
                warnings: [
                  {
                    severity: 'warning',
                    line: 1,
                    message: 'string "$a" may slow down scanning',
                  },
                ],
                warning_count: 1,
              });
            });
        });

        it('should return 200 with both errors and warnings for multiple rules', async () => {
          await callApi(globalWriteAccessTestAgent, {
            yara_rule: `
            // invalid
            rule rule1 { condition: cheese }

            // only warning
            rule rule2 { strings: $a = "x" condition: $a }
          `,
            os_types: ['windows'],
          })
            .expect(200)
            .expect((res: { body: ValidateCustomYaraSignatureResponse }) => {
              expect(res.body).to.eql({
                errors: [
                  {
                    severity: 'error',
                    line: 3,
                    message: 'undefined identifier "cheese"',
                  },
                ],
                error_count: 1,
                warnings: [
                  {
                    severity: 'warning',
                    line: 6,
                    message: 'string "$a" may slow down scanning',
                  },
                ],
                warning_count: 1,
              });
            });
        });
      });

      describe('YARA rule content byte length', () => {
        const emptyDiagnostics: ValidateCustomYaraSignatureResponse = {
          errors: [],
          error_count: 0,
          warnings: [],
          warning_count: 0,
        };
        const oversizeDiagnostic = (gotBytes: number): ValidateCustomYaraSignatureResponse => ({
          errors: [
            {
              severity: 'error',
              line: 0,
              message: `YARA rule content must not exceed ${MAX_YARA_RULE_CONTENT_BYTE_LENGTH} bytes (got ${gotBytes} bytes)`,
            },
          ],
          error_count: 1,
          warnings: [],
          warning_count: 0,
        });

        it(`should return 200 with empty diagnostics if yara_rule is ${MAX_YARA_RULE_CONTENT_BYTE_LENGTH} bytes long`, async () => {
          const yaraRule =
            dummyRuleWithComment +
            'a'.repeat(MAX_YARA_RULE_CONTENT_BYTE_LENGTH - dummyRuleWithComment.length);

          await callApi(globalWriteAccessTestAgent, {
            yara_rule: yaraRule,
            os_types: ['windows'],
          })
            .expect(200)
            .expect((res: { body: ValidateCustomYaraSignatureResponse }) => {
              expect(res.body).to.eql(emptyDiagnostics);
            });
        });

        it(`should return 200 with a line-0 error if yara_rule is more than ${MAX_YARA_RULE_CONTENT_BYTE_LENGTH} bytes long`, async () => {
          const yaraRule =
            dummyRuleWithComment +
            'a'.repeat(MAX_YARA_RULE_CONTENT_BYTE_LENGTH - dummyRuleWithComment.length + 1);

          await callApi(globalWriteAccessTestAgent, {
            yara_rule: yaraRule,
            os_types: ['windows'],
          })
            .expect(200)
            .expect((res: { body: ValidateCustomYaraSignatureResponse }) => {
              expect(res.body).to.eql(oversizeDiagnostic(MAX_YARA_RULE_CONTENT_BYTE_LENGTH + 1));
            });
        });

        it(`should return 200 with empty diagnostics if yara_rule is at the byte limit using multi-byte characters`, async () => {
          const euroSign = '€'; // takes up 3 bytes
          const yaraRule =
            dummyRuleWithComment +
            euroSign.repeat(
              (MAX_YARA_RULE_CONTENT_BYTE_LENGTH - dummyRuleWithComment.length) /
                Buffer.byteLength(euroSign)
            );

          expect(Buffer.byteLength(yaraRule, 'utf8')).to.be(MAX_YARA_RULE_CONTENT_BYTE_LENGTH);
          expect(yaraRule.length).to.be.lessThan(MAX_YARA_RULE_CONTENT_BYTE_LENGTH);

          await callApi(globalWriteAccessTestAgent, {
            yara_rule: yaraRule,
            os_types: ['windows'],
          })
            .expect(200)
            .expect((res: { body: ValidateCustomYaraSignatureResponse }) => {
              expect(res.body).to.eql(emptyDiagnostics);
            });
        });

        it(`should return 200 with a line-0 error if yara_rule exceeds the byte limit using multi-byte characters`, async () => {
          const euroSign = '€';
          const yaraRule =
            dummyRuleWithComment +
            euroSign.repeat(
              (MAX_YARA_RULE_CONTENT_BYTE_LENGTH - dummyRuleWithComment.length) /
                Buffer.byteLength(euroSign)
            ) +
            'a'; // plus one byte

          expect(Buffer.byteLength(yaraRule, 'utf8')).to.be.greaterThan(
            MAX_YARA_RULE_CONTENT_BYTE_LENGTH
          );
          expect(yaraRule.length).to.be.lessThan(MAX_YARA_RULE_CONTENT_BYTE_LENGTH + 1);

          await callApi(globalWriteAccessTestAgent, {
            yara_rule: yaraRule,
            os_types: ['windows'],
          })
            .expect(200)
            .expect((res: { body: ValidateCustomYaraSignatureResponse }) => {
              expect(res.body).to.eql(oversizeDiagnostic(Buffer.byteLength(yaraRule, 'utf8')));
            });
        });
      });

      describe('os_types validation', () => {
        it('should return 200 with an error when meta.os does not match os_types', async () => {
          await callApi(globalWriteAccessTestAgent, {
            yara_rule: 'rule rule1 { meta: os = "Linux" condition: true }',
            os_types: ['windows'],
          })
            .expect(200)
            .expect((res: { body: ValidateCustomYaraSignatureResponse }) => {
              expect(res.body).to.eql({
                errors: [
                  {
                    severity: 'error',
                    line: 1,
                    message:
                      '"meta.os" value "Linux" is different from "os_types" value "windows" on rule "rule1". Set meta.os to the same OSes (using "Windows", "Linux" and/or "MacOS") or drop the meta.os field',
                  },
                ],
                error_count: 1,
                warnings: [],
                warning_count: 0,
              });
            });
        });

        it('should return 400 when os_types is empty', async () => {
          await callApi(globalWriteAccessTestAgent, {
            yara_rule: 'rule rule1 { condition: true }',
            os_types: [],
          }).expect(400);
        });

        it('should return 400 when os_types contains an invalid OS', async () => {
          await callApi(globalWriteAccessTestAgent, {
            yara_rule: 'rule rule1 { condition: true }',
            os_types: ['android'],
          })
            .expect(400)
            .expect(anErrorMessageWith(/os_types/));
        });
      });

      describe('privileges', () => {
        it('should return 403 for a user with only Custom YARA signatures read privilege', async () => {
          await callApi(readAccessTestAgent, {
            yara_rule: 'rule rule1 { condition: true }',
            os_types: ['windows'],
          }).expect(403);
        });

        it('should return 403 for a user with no Custom YARA signatures privilege', async () => {
          await callApi(noAccessTestAgent, {
            yara_rule: 'rule rule1 { condition: true }',
            os_types: ['windows'],
          }).expect(403);
        });
      });
    });
  });
}
