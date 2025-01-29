/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ALERT_WORKFLOW_STATUS } from '@kbn/rule-data-utils';

import { DETECTION_ENGINE_QUERY_SIGNALS_URL } from '@kbn/security-solution-plugin/common/constants';
import {
  AttachmentType,
  CaseCustomFields,
  Cases,
  CaseSeverity,
  CaseStatuses,
  ConnectorTypes,
  CustomFieldTypes,
} from '@kbn/cases-plugin/common/types/domain';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import {
  defaultUser,
  getPostCaseRequest,
  postCaseReq,
  postCaseResp,
  postCommentUserReq,
} from '../../../../common/lib/mock';
import {
  deleteAllCaseItems,
  getSignalsWithES,
  setStatus,
  createCase,
  createComment,
  updateCase,
  removeServerGeneratedPropertiesFromCase,
  findCases,
  superUserSpace1Auth,
  delay,
  calculateDuration,
  findCaseUserActions,
  removeServerGeneratedPropertiesFromUserAction,
  createConfiguration,
  getConfigurationRequest,
} from '../../../../common/lib/api';
import {
  createAlertsIndex,
  deleteAllAlerts,
  deleteAllRules,
  getRuleForAlertTesting,
  waitForRuleSuccess,
  waitForAlertsToBePresent,
  getAlertsByIds,
  createRule,
  getQueryAlertIds,
} from '../../../../../common/utils/security_solution';
import {
  globalRead,
  noKibanaPrivileges,
  obsOnly,
  obsOnlyRead,
  obsSecRead,
  secOnly,
  secOnlyRead,
  superUser,
} from '../../../../common/lib/authentication/users';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const log = getService('log');

  describe('patch_cases', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    describe('happy path', () => {
      it('should patch a case', async () => {
        await createConfiguration(
          supertest,
          getConfigurationRequest({
            overrides: {
              customFields: [
                {
                  key: 'test_custom_field',
                  label: 'text',
                  type: CustomFieldTypes.TEXT,
                  required: false,
                },
              ],
            },
          })
        );
        const postedCase = await createCase(supertest, postCaseReq);
        const patchedCases = await updateCase({
          supertest,
          params: {
            cases: [
              {
                id: postedCase.id,
                version: postedCase.version,
                title: 'new title',
              },
            ],
          },
        });

        const data = removeServerGeneratedPropertiesFromCase(patchedCases[0]);
        expect(data).to.eql({
          ...postCaseResp(),
          customFields: [
            {
              key: 'test_custom_field',
              type: CustomFieldTypes.TEXT,
              value: null,
            },
          ],
          title: 'new title',
          updated_by: defaultUser,
        });
      });

      it('should close the case correctly', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const patchedCases = await updateCase({
          supertest,
          params: {
            cases: [
              {
                id: postedCase.id,
                version: postedCase.version,
                status: CaseStatuses.closed,
              },
            ],
          },
        });

        const { userActions } = await findCaseUserActions({ supertest, caseID: postedCase.id });
        const statusUserAction = removeServerGeneratedPropertiesFromUserAction(userActions[1]);
        const data = removeServerGeneratedPropertiesFromCase(patchedCases[0]);
        const { duration, ...dataWithoutDuration } = data;
        const { duration: resDuration, ...resWithoutDuration } = postCaseResp();

        expect(dataWithoutDuration).to.eql({
          ...resWithoutDuration,
          status: CaseStatuses.closed,
          closed_by: defaultUser,
          updated_by: defaultUser,
        });

        expect(statusUserAction).to.eql({
          type: 'status',
          action: 'update',
          created_by: defaultUser,
          payload: { status: CaseStatuses.closed },
          comment_id: null,
          owner: 'securitySolutionFixture',
        });
      });

      it('should change the status of case to in-progress correctly', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const patchedCases = await updateCase({
          supertest,
          params: {
            cases: [
              {
                id: postedCase.id,
                version: postedCase.version,
                status: CaseStatuses['in-progress'],
              },
            ],
          },
        });

        const { userActions } = await findCaseUserActions({ supertest, caseID: postedCase.id });
        const statusUserAction = removeServerGeneratedPropertiesFromUserAction(userActions[1]);
        const data = removeServerGeneratedPropertiesFromCase(patchedCases[0]);

        expect(data).to.eql({
          ...postCaseResp(),
          status: CaseStatuses['in-progress'],
          updated_by: defaultUser,
        });

        expect(statusUserAction).to.eql({
          type: 'status',
          action: 'update',
          created_by: defaultUser,
          payload: { status: CaseStatuses['in-progress'] },
          comment_id: null,
          owner: 'securitySolutionFixture',
        });
      });

      it('should patch the severity of a case correctly', async () => {
        const postedCase = await createCase(supertest, postCaseReq);

        // the default severity
        expect(postedCase.severity).equal(CaseSeverity.LOW);

        const patchedCases = await updateCase({
          supertest,
          params: {
            cases: [
              {
                id: postedCase.id,
                version: postedCase.version,
                severity: CaseSeverity.MEDIUM,
              },
            ],
          },
        });

        const data = removeServerGeneratedPropertiesFromCase(patchedCases[0]);

        expect(data).to.eql({
          ...postCaseResp(),
          severity: CaseSeverity.MEDIUM,
          updated_by: defaultUser,
        });
      });

      it('should patch the category of a case correctly', async () => {
        const postedCase = await createCase(supertest, postCaseReq);

        // the default category
        expect(postedCase.category).equal(null);

        const patchedCases = await updateCase({
          supertest,
          params: {
            cases: [
              {
                id: postedCase.id,
                version: postedCase.version,
                category: 'foobar',
              },
            ],
          },
        });

        const data = removeServerGeneratedPropertiesFromCase(patchedCases[0]);

        expect(data).to.eql({
          ...postCaseResp(),
          category: 'foobar',
          updated_by: defaultUser,
        });
      });

      it('should unset the category of a case correctly', async () => {
        const postedCase = await createCase(supertest, { ...postCaseReq, category: 'foobar' });

        // the default category
        expect(postedCase.category).equal('foobar');

        const patchedCases = await updateCase({
          supertest,
          params: {
            cases: [
              {
                id: postedCase.id,
                version: postedCase.version,
                category: null,
              },
            ],
          },
        });

        const data = removeServerGeneratedPropertiesFromCase(patchedCases[0]);

        expect(data).to.eql({
          ...postCaseResp(),
          category: null,
          updated_by: defaultUser,
        });
      });

      it('should patch a case with new connector', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const patchedCases = await updateCase({
          supertest,
          params: {
            cases: [
              {
                id: postedCase.id,
                version: postedCase.version,
                connector: {
                  id: 'jira',
                  name: 'Jira',
                  type: ConnectorTypes.jira,
                  fields: { issueType: 'Task', priority: null, parent: null },
                },
              },
            ],
          },
        });

        const data = removeServerGeneratedPropertiesFromCase(patchedCases[0]);
        expect(data).to.eql({
          ...postCaseResp(),
          connector: {
            id: 'jira',
            name: 'Jira',
            type: '.jira',
            fields: { issueType: 'Task', priority: null, parent: null },
          },
          updated_by: defaultUser,
        });
      });

      it('should patch a case with customFields', async () => {
        await createConfiguration(
          supertest,
          getConfigurationRequest({
            overrides: {
              customFields: [
                {
                  key: 'test_custom_field_1',
                  label: 'text',
                  type: CustomFieldTypes.TEXT,
                  required: false,
                },
                {
                  key: 'test_custom_field_2',
                  label: 'toggle',
                  type: CustomFieldTypes.TOGGLE,
                  defaultValue: false,
                  required: true,
                },
                {
                  key: 'test_custom_field_3',
                  label: 'toggle',
                  type: CustomFieldTypes.NUMBER,
                  defaultValue: 1,
                  required: true,
                },
              ],
            },
          })
        );

        const postedCase = await createCase(supertest, {
          ...postCaseReq,
          customFields: [
            {
              key: 'test_custom_field_2',
              type: CustomFieldTypes.TOGGLE,
              value: true,
            },
          ],
        });
        const patchedCases = await updateCase({
          supertest,
          params: {
            cases: [
              {
                id: postedCase.id,
                version: postedCase.version,
                customFields: [
                  {
                    key: 'test_custom_field_1',
                    type: CustomFieldTypes.TEXT,
                    value: 'this is a text field value',
                  },
                  {
                    key: 'test_custom_field_2',
                    type: CustomFieldTypes.TOGGLE,
                    value: true,
                  },
                  {
                    key: 'test_custom_field_3',
                    type: CustomFieldTypes.NUMBER,
                    value: 2,
                  },
                ],
              },
            ],
          },
        });

        expect(patchedCases[0].customFields).to.eql([
          {
            key: 'test_custom_field_1',
            type: CustomFieldTypes.TEXT,
            value: 'this is a text field value',
          },
          {
            key: 'test_custom_field_2',
            type: CustomFieldTypes.TOGGLE,
            value: true,
          },
          {
            key: 'test_custom_field_3',
            type: CustomFieldTypes.NUMBER,
            value: 2,
          },
        ]);
      });

      it('should fill out missing optional custom fields', async () => {
        await createConfiguration(
          supertest,
          getConfigurationRequest({
            overrides: {
              customFields: [
                {
                  key: 'test_custom_field_1',
                  label: 'text',
                  type: CustomFieldTypes.TEXT,
                  required: false,
                },
                {
                  key: 'test_custom_field_2',
                  label: 'toggle',
                  type: CustomFieldTypes.TOGGLE,
                  defaultValue: false,
                  required: true,
                },
                {
                  key: 'test_custom_field_3',
                  label: 'number',
                  type: CustomFieldTypes.NUMBER,
                  required: false,
                },
              ],
            },
          })
        );

        const postedCase = await createCase(supertest, {
          ...postCaseReq,
          customFields: [
            {
              key: 'test_custom_field_2',
              type: CustomFieldTypes.TOGGLE,
              value: true,
            },
          ],
        });

        const patchedCases = await updateCase({
          supertest,
          params: {
            cases: [
              {
                id: postedCase.id,
                version: postedCase.version,
                customFields: [
                  {
                    key: 'test_custom_field_2',
                    type: CustomFieldTypes.TOGGLE,
                    value: true,
                  },
                ],
              },
            ],
          },
        });

        expect(patchedCases[0].customFields).to.eql([
          { key: 'test_custom_field_2', type: 'toggle', value: true },
          { key: 'test_custom_field_1', type: 'text', value: null },
          { key: 'test_custom_field_3', type: 'number', value: null },
        ]);
      });

      describe('duration', () => {
        it('updates the duration correctly when the case closes', async () => {
          const postedCase = await createCase(supertest, postCaseReq);
          await delay(1000);

          const patchedCases = await updateCase({
            supertest,
            params: {
              cases: [
                {
                  id: postedCase.id,
                  version: postedCase.version,
                  status: CaseStatuses.closed,
                },
              ],
            },
          });

          const duration = calculateDuration(patchedCases[0].closed_at, postedCase.created_at);
          expect(duration).to.be(patchedCases[0].duration);
        });

        for (const status of [CaseStatuses.open, CaseStatuses['in-progress']]) {
          it(`sets the duration to null when the case status changes to ${status}`, async () => {
            const postedCase = await createCase(supertest, postCaseReq);

            const closedCases = await updateCase({
              supertest,
              params: {
                cases: [
                  {
                    id: postedCase.id,
                    version: postedCase.version,
                    status: CaseStatuses.closed,
                  },
                ],
              },
            });

            expect(closedCases[0].duration).to.not.be(null);

            const openCases = await updateCase({
              supertest,
              params: {
                cases: [
                  {
                    id: postedCase.id,
                    version: closedCases[0].version,
                    status,
                  },
                ],
              },
            });

            expect(openCases[0].duration).to.be(null);
          });
        }
      });

      it('should return the expected total comments and alerts', async () => {
        const postedCase = await createCase(supertest, postCaseReq);

        await createComment({
          supertest,
          caseId: postedCase.id,
          params: postCommentUserReq,
          expectedHttpCode: 200,
        });

        const updatedCase = await createComment({
          supertest,
          caseId: postedCase.id,
          params: {
            alertId: '4679431ee0ba3209b6fcd60a255a696886fe0a7d18f5375de510ff5b68fa6b78',
            index: 'siem-signals-default-000001',
            rule: { id: 'test-rule-id', name: 'test-index-id' },
            type: AttachmentType.alert,
            owner: 'securitySolutionFixture',
          },
        });

        const patchedCases = await updateCase({
          supertest,
          params: {
            cases: [
              {
                id: postedCase.id,
                version: updatedCase.version,
                title: 'new title',
              },
            ],
          },
        });

        const data = removeServerGeneratedPropertiesFromCase(patchedCases[0]);
        expect(data).to.eql({
          ...postCaseResp(),
          title: 'new title',
          totalComment: 1,
          totalAlerts: 1,
          updated_by: defaultUser,
        });
      });

      it('should return the expected total comments and alerts for multiple cases', async () => {
        const postedCase1 = await createCase(supertest, postCaseReq);
        const postedCase2 = await createCase(supertest, postCaseReq);
        const updatedCaseVersions = [];

        for (const postedCaseId of [postedCase1.id, postedCase2.id]) {
          await createComment({
            supertest,
            caseId: postedCaseId,
            params: postCommentUserReq,
            expectedHttpCode: 200,
          });

          const updatedCase = await createComment({
            supertest,
            caseId: postedCaseId,
            params: {
              alertId: '4679431ee0ba3209b6fcd60a255a696886fe0a7d18f5375de510ff5b68fa6b78',
              index: 'siem-signals-default-000001',
              rule: { id: 'test-rule-id', name: 'test-index-id' },
              type: AttachmentType.alert,
              owner: 'securitySolutionFixture',
            },
          });

          updatedCaseVersions.push(updatedCase.version);
        }
        const patchedCases = await updateCase({
          supertest,
          params: {
            cases: [
              {
                id: postedCase1.id,
                version: updatedCaseVersions[0],
                title: 'new title',
              },
              {
                id: postedCase2.id,
                version: updatedCaseVersions[1],
                title: 'new title',
              },
            ],
          },
        });

        const dataCase1 = removeServerGeneratedPropertiesFromCase(patchedCases[0]);
        expect(dataCase1).to.eql({
          ...postCaseResp(),
          title: 'new title',
          totalComment: 1,
          totalAlerts: 1,
          updated_by: defaultUser,
        });

        const dataCase2 = removeServerGeneratedPropertiesFromCase(patchedCases[1]);
        expect(dataCase2).to.eql({
          ...postCaseResp(),
          title: 'new title',
          totalComment: 1,
          totalAlerts: 1,
          updated_by: defaultUser,
        });
      });
    });

    describe('unhappy path', () => {
      it('400s when attempting to change the owner of a case', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        await updateCase({
          supertest,
          params: {
            cases: [
              {
                id: postedCase.id,
                version: postedCase.version,
                owner: 'observabilityFixture',
              },
            ],
          },
          expectedHttpCode: 400,
        });
      });

      it('404s when case is not there', async () => {
        await updateCase({
          supertest,
          params: {
            cases: [
              {
                id: 'not-real',
                version: 'version',
                status: CaseStatuses.closed,
              },
            ],
          },
          expectedHttpCode: 404,
        });
      });

      it('400s when a wrong severity value is passed', async () => {
        await updateCase({
          supertest,
          params: {
            cases: [
              {
                version: 'version',
                // @ts-expect-error
                severity: 'wont-do',
              },
            ],
          },
          expectedHttpCode: 400,
        });
      });

      it('400s when id is missing', async () => {
        await updateCase({
          supertest,
          params: {
            cases: [
              // @ts-expect-error
              {
                version: 'version',
                status: CaseStatuses.closed,
              },
            ],
          },
          expectedHttpCode: 400,
        });
      });

      it('406s when fields are identical', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        await updateCase({
          supertest,
          params: {
            cases: [
              {
                id: postedCase.id,
                version: postedCase.version,
                status: CaseStatuses.open,
              },
            ],
          },
          expectedHttpCode: 406,
        });
      });

      it('400s when version is missing', async () => {
        await updateCase({
          supertest,
          params: {
            cases: [
              // @ts-expect-error
              {
                id: 'not-real',
                status: CaseStatuses.closed,
              },
            ],
          },
          expectedHttpCode: 400,
        });
      });

      it('400s when excess data sent', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        await updateCase({
          supertest,
          params: {
            cases: [
              {
                id: postedCase.id,
                version: postedCase.version,
                // @ts-expect-error
                badKey: 'closed',
              },
            ],
          },
          expectedHttpCode: 400,
        });
      });

      it('400s when bad data sent', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        await updateCase({
          supertest,
          params: {
            cases: [
              {
                id: postedCase.id,
                version: postedCase.version,
                // @ts-expect-error
                status: true,
              },
            ],
          },
          expectedHttpCode: 400,
        });
      });

      it('400s when unsupported status sent', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        await updateCase({
          supertest,
          params: {
            cases: [
              {
                id: postedCase.id,
                version: postedCase.version,
                // @ts-expect-error
                status: 'not-supported',
              },
            ],
          },
          expectedHttpCode: 400,
        });
      });

      it('400s when bad connector type sent', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        await updateCase({
          supertest,
          params: {
            cases: [
              {
                id: postedCase.id,
                version: postedCase.version,
                // @ts-expect-error
                connector: { id: 'none', name: 'none', type: '.not-exists', fields: null },
              },
            ],
          },
          expectedHttpCode: 400,
        });
      });

      it('400s when bad connector sent', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        await updateCase({
          supertest,
          params: {
            cases: [
              {
                id: postedCase.id,
                version: postedCase.version,
                connector: {
                  id: 'jira',
                  name: 'Jira',
                  type: ConnectorTypes.jira,
                  // @ts-expect-error
                  fields: { unsupported: 'value' },
                },
              },
            ],
          },
          expectedHttpCode: 400,
        });
      });

      it('409s when version does not match', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        await updateCase({
          supertest,
          params: {
            cases: [
              {
                id: postedCase.id,
                version: 'version',
                // @ts-expect-error
                status: 'closed',
              },
            ],
          },
          expectedHttpCode: 409,
        });
      });

      it('400s when trying to update too many cases', async () => {
        await updateCase({
          supertest,
          params: {
            cases: Array(101).fill({ id: 'foo', version: 'bar', title: 'coolTitle' }),
          },
          expectedHttpCode: 400,
        });
      });

      it('400s when trying to update zero cases', async () => {
        await updateCase({
          supertest,
          params: {
            cases: [],
          },
          expectedHttpCode: 400,
        });
      });

      describe('title', () => {
        it('400s if the title is too long', async () => {
          const longTitle = 'a'.repeat(161);

          const postedCase = await createCase(supertest, postCaseReq);
          await updateCase({
            supertest,
            params: {
              cases: [
                {
                  id: postedCase.id,
                  version: postedCase.version,
                  title: longTitle,
                },
              ],
            },
            expectedHttpCode: 400,
          });
        });

        it('400s if the title an empty string', async () => {
          const postedCase = await createCase(supertest, postCaseReq);
          await updateCase({
            supertest,
            params: {
              cases: [
                {
                  id: postedCase.id,
                  version: postedCase.version,
                  title: '',
                },
              ],
            },
            expectedHttpCode: 400,
          });
        });

        it('400s if the title is a string with empty characters', async () => {
          const postedCase = await createCase(supertest, postCaseReq);
          await updateCase({
            supertest,
            params: {
              cases: [
                {
                  id: postedCase.id,
                  version: postedCase.version,
                  title: '  ',
                },
              ],
            },
            expectedHttpCode: 400,
          });
        });
      });

      describe('description', () => {
        it('400s if the description is too long', async () => {
          const longDescription = 'a'.repeat(30001);

          const postedCase = await createCase(supertest, postCaseReq);
          await updateCase({
            supertest,
            params: {
              cases: [
                {
                  id: postedCase.id,
                  version: postedCase.version,
                  description: longDescription,
                },
              ],
            },
            expectedHttpCode: 400,
          });
        });

        it('400s if the description an empty string', async () => {
          const postedCase = await createCase(supertest, postCaseReq);
          await updateCase({
            supertest,
            params: {
              cases: [
                {
                  id: postedCase.id,
                  version: postedCase.version,
                  description: '',
                },
              ],
            },
            expectedHttpCode: 400,
          });
        });

        it('400s if the description is a string with empty characters', async () => {
          const postedCase = await createCase(supertest, postCaseReq);
          await updateCase({
            supertest,
            params: {
              cases: [
                {
                  id: postedCase.id,
                  version: postedCase.version,
                  description: '  ',
                },
              ],
            },
            expectedHttpCode: 400,
          });
        });
      });

      describe('categories', () => {
        it('400s when a too long category value is passed', async () => {
          const postedCase = await createCase(supertest, postCaseReq);
          await updateCase({
            supertest,
            params: {
              cases: [
                {
                  id: postedCase.id,
                  version: postedCase.version,
                  category: 'A very long category with more than fifty characters!',
                },
              ],
            },
            expectedHttpCode: 400,
          });
        });

        it('400s when an empty string category value is passed', async () => {
          const postedCase = await createCase(supertest, postCaseReq);
          await updateCase({
            supertest,
            params: {
              cases: [
                {
                  id: postedCase.id,
                  version: postedCase.version,
                  category: '',
                },
              ],
            },
            expectedHttpCode: 400,
          });
        });

        it('400s when a string with spaces category value is passed', async () => {
          const postedCase = await createCase(supertest, postCaseReq);
          await updateCase({
            supertest,
            params: {
              cases: [
                {
                  id: postedCase.id,
                  version: postedCase.version,
                  category: '  ',
                },
              ],
            },
            expectedHttpCode: 400,
          });
        });
      });

      describe('tags', () => {
        it('400s when tags array is too long', async () => {
          const tags = Array(201).fill('foo');

          const postedCase = await createCase(supertest, postCaseReq);
          await updateCase({
            supertest,
            params: {
              cases: [
                {
                  id: postedCase.id,
                  version: postedCase.version,
                  tags,
                },
              ],
            },
            expectedHttpCode: 400,
          });
        });

        it('400s when tag string is too long', async () => {
          const tag = 'a'.repeat(257);

          const postedCase = await createCase(supertest, postCaseReq);
          await updateCase({
            supertest,
            params: {
              cases: [
                {
                  id: postedCase.id,
                  version: postedCase.version,
                  tags: [tag],
                },
              ],
            },
            expectedHttpCode: 400,
          });
        });

        it('400s when an empty string is passed in tags', async () => {
          const postedCase = await createCase(supertest, postCaseReq);
          await updateCase({
            supertest,
            params: {
              cases: [
                {
                  id: postedCase.id,
                  version: postedCase.version,
                  tags: ['', 'one'],
                },
              ],
            },
            expectedHttpCode: 400,
          });
        });

        it('400s when a string with spaces tag value is passed', async () => {
          const postedCase = await createCase(supertest, postCaseReq);
          await updateCase({
            supertest,
            params: {
              cases: [
                {
                  id: postedCase.id,
                  version: postedCase.version,
                  tags: ['  '],
                },
              ],
            },
            expectedHttpCode: 400,
          });
        });
      });

      describe('customFields', () => {
        it('patches a case with missing required custom fields to their default values', async () => {
          await createConfiguration(
            supertest,
            getConfigurationRequest({
              overrides: {
                customFields: [
                  {
                    key: 'text_custom_field',
                    label: 'text',
                    type: CustomFieldTypes.TEXT,
                    defaultValue: 'default value',
                    required: true,
                  },
                  {
                    key: 'toggle_custom_field',
                    label: 'toggle',
                    type: CustomFieldTypes.TOGGLE,
                    defaultValue: false,
                    required: true,
                  },
                  {
                    key: 'number_custom_field',
                    label: 'number',
                    type: CustomFieldTypes.NUMBER,
                    defaultValue: 3,
                    required: true,
                  },
                ],
              },
            })
          );

          const originalValues = [
            {
              key: 'text_custom_field',
              type: CustomFieldTypes.TEXT,
              value: 'hello',
            },
            {
              key: 'toggle_custom_field',
              type: CustomFieldTypes.TOGGLE,
              value: true,
            },
            {
              key: 'number_custom_field',
              type: CustomFieldTypes.NUMBER,
              value: 4,
            },
          ] as CaseCustomFields;

          const postedCase = await createCase(supertest, {
            ...postCaseReq,
            customFields: originalValues,
          });

          const patchedCases = await updateCase({
            supertest,
            params: {
              cases: [
                {
                  id: postedCase.id,
                  version: postedCase.version,
                  customFields: [],
                },
              ],
            },
          });

          expect(patchedCases[0].customFields).to.eql([
            { ...originalValues[0], value: 'default value' },
            { ...originalValues[1], value: false },
            { ...originalValues[2], value: 3 },
          ]);
        });

        it('patches a case with missing optional custom fields to their default values', async () => {
          await createConfiguration(
            supertest,
            getConfigurationRequest({
              overrides: {
                customFields: [
                  {
                    key: 'text_custom_field',
                    label: 'text',
                    type: CustomFieldTypes.TEXT,
                    defaultValue: 'default value',
                    required: false,
                  },
                  {
                    key: 'toggle_custom_field',
                    label: 'toggle',
                    type: CustomFieldTypes.TOGGLE,
                    defaultValue: false,
                    required: false,
                  },
                  {
                    key: 'number_custom_field',
                    label: 'number',
                    type: CustomFieldTypes.NUMBER,
                    defaultValue: 5,
                    required: false,
                  },
                ],
              },
            })
          );

          const originalValues = [
            {
              key: 'text_custom_field',
              type: CustomFieldTypes.TEXT,
              value: 'hello',
            },
            {
              key: 'toggle_custom_field',
              type: CustomFieldTypes.TOGGLE,
              value: true,
            },
            {
              key: 'number_custom_field',
              type: CustomFieldTypes.NUMBER,
              value: 6,
            },
          ] as CaseCustomFields;

          const postedCase = await createCase(supertest, {
            ...postCaseReq,
            customFields: originalValues,
          });

          const patchedCases = await updateCase({
            supertest,
            params: {
              cases: [
                {
                  id: postedCase.id,
                  version: postedCase.version,
                  customFields: [
                    {
                      key: 'toggle_custom_field',
                      type: CustomFieldTypes.TOGGLE,
                      value: false,
                    },
                  ],
                },
              ],
            },
          });

          expect(patchedCases[0].customFields).to.eql([
            { ...originalValues[1], value: false },
            { ...originalValues[0], value: 'default value' },
            { ...originalValues[2], value: 5 },
          ]);
        });

        it('400s trying to patch a case with missing required custom fields if they dont have default values', async () => {
          await createConfiguration(
            supertest,
            getConfigurationRequest({
              overrides: {
                customFields: [
                  {
                    key: 'text_custom_field',
                    label: 'text',
                    type: CustomFieldTypes.TEXT,
                    required: true,
                  },
                  {
                    key: 'toggle_custom_field',
                    label: 'toggle',
                    type: CustomFieldTypes.TOGGLE,
                    required: true,
                  },
                  {
                    key: 'number_custom_field',
                    label: 'number',
                    type: CustomFieldTypes.NUMBER,
                    required: true,
                  },
                ],
              },
            })
          );

          const postedCase = await createCase(supertest, {
            ...postCaseReq,
            customFields: [
              {
                key: 'text_custom_field',
                type: CustomFieldTypes.TEXT,
                value: 'hello',
              },
              {
                key: 'toggle_custom_field',
                type: CustomFieldTypes.TOGGLE,
                value: true,
              },
              {
                key: 'number_custom_field',
                type: CustomFieldTypes.NUMBER,
                value: 7,
              },
            ],
          });

          await updateCase({
            supertest,
            params: {
              cases: [
                {
                  id: postedCase.id,
                  version: postedCase.version,
                  customFields: [],
                },
              ],
            },
            expectedHttpCode: 400,
          });
        });

        it('400s when trying to patch with duplicated custom field keys', async () => {
          const postedCase = await createCase(supertest, postCaseReq);

          await updateCase({
            supertest,
            params: {
              cases: [
                {
                  id: postedCase.id,
                  version: postedCase.version,
                  customFields: [
                    {
                      key: 'duplicated_key',
                      type: CustomFieldTypes.TEXT,
                      value: 'this is a text field value',
                    },
                    {
                      key: 'duplicated_key',
                      type: CustomFieldTypes.TEXT,
                      value: 'this is a text field value',
                    },
                  ],
                },
              ],
            },
            expectedHttpCode: 400,
          });
        });

        it('400s when trying to patch with a custom field key that does not exist', async () => {
          await createConfiguration(
            supertest,
            getConfigurationRequest({
              overrides: {
                customFields: [
                  {
                    key: 'test_custom_field',
                    label: 'text',
                    type: CustomFieldTypes.TEXT,
                    required: false,
                  },
                ],
              },
            })
          );
          const postedCase = await createCase(supertest, postCaseReq);

          await updateCase({
            supertest,
            params: {
              cases: [
                {
                  id: postedCase.id,
                  version: postedCase.version,
                  customFields: [
                    {
                      key: 'key_does_not_exist',
                      type: CustomFieldTypes.TEXT,
                      value: 'this is a text field value',
                    },
                  ],
                },
              ],
            },
            expectedHttpCode: 400,
          });
        });

        it('400s trying to patch required custom fields with value: null', async () => {
          await createConfiguration(
            supertest,
            getConfigurationRequest({
              overrides: {
                customFields: [
                  {
                    key: 'text_custom_field',
                    label: 'text',
                    type: CustomFieldTypes.TEXT,
                    required: true,
                    defaultValue: 'default value',
                  },
                  {
                    key: 'toggle_custom_field',
                    label: 'toggle',
                    type: CustomFieldTypes.TOGGLE,
                    required: true,
                    defaultValue: false,
                  },
                  {
                    key: 'number_custom_field',
                    label: 'number',
                    type: CustomFieldTypes.NUMBER,
                    required: true,
                    defaultValue: 8,
                  },
                ],
              },
            })
          );

          const postedCase = await createCase(supertest, {
            ...postCaseReq,
            customFields: [
              {
                key: 'text_custom_field',
                type: CustomFieldTypes.TEXT,
                value: 'not default',
              },
              {
                key: 'toggle_custom_field',
                type: CustomFieldTypes.TOGGLE,
                value: true,
              },
              {
                key: 'number_custom_field',
                type: CustomFieldTypes.NUMBER,
                value: 9,
              },
            ],
          });

          const patchedCustomFields = [
            {
              key: 'text_custom_field',
              type: CustomFieldTypes.TEXT,
              value: null,
            },
            {
              key: 'toggle_custom_field',
              type: CustomFieldTypes.TOGGLE,
              value: null,
            },
            {
              key: 'number_custom_field',
              type: CustomFieldTypes.NUMBER,
              value: null,
            },
          ];

          await updateCase({
            supertest,
            params: {
              cases: [
                {
                  id: postedCase.id,
                  version: postedCase.version,
                  customFields: patchedCustomFields,
                },
              ],
            },
            expectedHttpCode: 400,
          });
        });

        it('400s when trying to patch a case with a custom field with the wrong type', async () => {
          await createConfiguration(
            supertest,
            getConfigurationRequest({
              overrides: {
                customFields: [
                  {
                    key: 'test_custom_field',
                    label: 'text',
                    type: CustomFieldTypes.TEXT,
                    required: false,
                  },
                ],
              },
            })
          );
          const postedCase = await createCase(supertest, postCaseReq);

          await updateCase({
            supertest,
            params: {
              cases: [
                {
                  id: postedCase.id,
                  version: postedCase.version,
                  customFields: [
                    {
                      key: 'test_custom_field',
                      type: CustomFieldTypes.TOGGLE,
                      value: false,
                    },
                  ],
                },
              ],
            },
            expectedHttpCode: 400,
          });
        });
      });
    });

    describe('alerts', () => {
      describe('Update', () => {
        const defaultSignalsIndex = 'siem-signals-default-000001';

        beforeEach(async () => {
          await esArchiver.load('x-pack/test/functional/es_archives/cases/signals/default');
        });
        afterEach(async () => {
          await esArchiver.unload('x-pack/test/functional/es_archives/cases/signals/default');
          await deleteAllCaseItems(es);
        });

        it('should update the status of multiple alerts attached to multiple cases', async () => {
          const signalID = '4679431ee0ba3209b6fcd60a255a696886fe0a7d18f5375de510ff5b68fa6b78';
          const signalID2 = '1023bcfea939643c5e51fd8df53797e0ea693cee547db579ab56d96402365c1e';

          // does NOT updates alert status when adding comments and syncAlerts=false
          const individualCase1 = await createCase(supertest, {
            ...postCaseReq,
            settings: {
              syncAlerts: false,
            },
          });

          const updatedInd1WithComment = await createComment({
            supertest,
            caseId: individualCase1.id,
            params: {
              alertId: signalID,
              index: defaultSignalsIndex,
              rule: { id: 'test-rule-id', name: 'test-index-id' },
              type: AttachmentType.alert,
              owner: 'securitySolutionFixture',
            },
          });

          const individualCase2 = await createCase(supertest, {
            ...postCaseReq,
            settings: {
              syncAlerts: false,
            },
          });

          const updatedInd2WithComment = await createComment({
            supertest,
            caseId: individualCase2.id,
            params: {
              alertId: signalID2,
              index: defaultSignalsIndex,
              rule: { id: 'test-rule-id', name: 'test-index-id' },
              type: AttachmentType.alert,
              owner: 'securitySolutionFixture',
            },
          });

          await es.indices.refresh({ index: defaultSignalsIndex });

          let signals = await getSignalsWithES({
            es,
            indices: defaultSignalsIndex,
            ids: [signalID, signalID2],
          });

          // There should be no change in their status since syncing is disabled
          expect(signals.get(defaultSignalsIndex)?.get(signalID)?._source?.signal?.status).to.be(
            CaseStatuses.open
          );
          expect(signals.get(defaultSignalsIndex)?.get(signalID2)?._source?.signal?.status).to.be(
            CaseStatuses.open
          );

          // does NOT updates alert status when the status is updated and syncAlerts=false
          const updatedIndWithStatus: Cases = (await setStatus({
            supertest,
            cases: [
              {
                id: updatedInd1WithComment.id,
                version: updatedInd1WithComment.version,
                status: CaseStatuses.closed,
              },
              {
                id: updatedInd2WithComment.id,
                version: updatedInd2WithComment.version,
                status: CaseStatuses['in-progress'],
              },
            ],
          })) as Cases;

          await es.indices.refresh({ index: defaultSignalsIndex });

          signals = await getSignalsWithES({
            es,
            indices: defaultSignalsIndex,
            ids: [signalID, signalID2],
          });

          // There should still be no change in their status since syncing is disabled
          expect(signals.get(defaultSignalsIndex)?.get(signalID)?._source?.signal?.status).to.be(
            CaseStatuses.open
          );
          expect(signals.get(defaultSignalsIndex)?.get(signalID2)?._source?.signal?.status).to.be(
            CaseStatuses.open
          );

          // it updates alert status when syncAlerts is turned on
          // turn on the sync settings
          await updateCase({
            supertest,
            params: {
              cases: updatedIndWithStatus.map((caseInfo) => ({
                id: caseInfo.id,
                version: caseInfo.version,
                settings: { syncAlerts: true },
              })),
            },
          });

          await es.indices.refresh({ index: defaultSignalsIndex });

          signals = await getSignalsWithES({
            es,
            indices: defaultSignalsIndex,
            ids: [signalID, signalID2],
          });

          // alerts should be updated now that the
          expect(signals.get(defaultSignalsIndex)?.get(signalID)?._source?.signal?.status).to.be(
            CaseStatuses.closed
          );
          expect(signals.get(defaultSignalsIndex)?.get(signalID2)?._source?.signal?.status).to.be(
            'acknowledged'
          );
        });
      });

      describe('No update', () => {
        const defaultSignalsIndex = 'siem-signals-default-000001';

        beforeEach(async () => {
          await esArchiver.load('x-pack/test/functional/es_archives/cases/signals/duplicate_ids');
        });
        afterEach(async () => {
          await esArchiver.unload('x-pack/test/functional/es_archives/cases/signals/duplicate_ids');
          await deleteAllCaseItems(es);
        });

        it('should not update the status of duplicate alert ids in separate indices', async () => {
          const getSignals = async () => {
            return getSignalsWithES({
              es,
              indices: [defaultSignalsIndex, signalsIndex2],
              ids: [signalIDInFirstIndex, signalIDInSecondIndex],
            });
          };

          // this id exists only in siem-signals-default-000001
          const signalIDInFirstIndex =
            'cae78067e65582a3b277c1ad46ba3cb29044242fe0d24bbf3fcde757fdd31d1c';
          // This id exists in both siem-signals-default-000001 and siem-signals-default-000002
          const signalIDInSecondIndex = 'duplicate-signal-id';
          const signalsIndex2 = 'siem-signals-default-000002';

          const individualCase = await createCase(supertest, {
            ...postCaseReq,
            settings: {
              syncAlerts: false,
            },
          });

          const updatedIndWithComment = await createComment({
            supertest,
            caseId: individualCase.id,
            params: {
              alertId: signalIDInFirstIndex,
              index: defaultSignalsIndex,
              rule: { id: 'test-rule-id', name: 'test-index-id' },
              type: AttachmentType.alert,
              owner: 'securitySolutionFixture',
            },
          });

          const updatedIndWithComment2 = await createComment({
            supertest,
            caseId: updatedIndWithComment.id,
            params: {
              alertId: signalIDInSecondIndex,
              index: signalsIndex2,
              rule: { id: 'test-rule-id', name: 'test-index-id' },
              type: AttachmentType.alert,
              owner: 'securitySolutionFixture',
            },
          });

          await es.indices.refresh({ index: defaultSignalsIndex });
          await es.indices.refresh({ index: signalsIndex2 });

          let signals = await getSignals();
          // There should be no change in their status since syncing is disabled
          expect(
            signals.get(defaultSignalsIndex)?.get(signalIDInFirstIndex)?._source?.signal?.status
          ).to.be(CaseStatuses.open);
          expect(
            signals.get(signalsIndex2)?.get(signalIDInSecondIndex)?._source?.signal?.status
          ).to.be(CaseStatuses.open);

          const updatedIndWithStatus: Cases = (await setStatus({
            supertest,
            cases: [
              {
                id: updatedIndWithComment2.id,
                version: updatedIndWithComment2.version,
                status: CaseStatuses.closed,
              },
            ],
          })) as Cases;

          await es.indices.refresh({ index: defaultSignalsIndex });
          await es.indices.refresh({ index: signalsIndex2 });

          signals = await getSignals();

          // There should still be no change in their status since syncing is disabled
          expect(
            signals.get(defaultSignalsIndex)?.get(signalIDInFirstIndex)?._source?.signal?.status
          ).to.be(CaseStatuses.open);
          expect(
            signals.get(signalsIndex2)?.get(signalIDInSecondIndex)?._source?.signal?.status
          ).to.be(CaseStatuses.open);

          // turn on the sync settings
          await updateCase({
            supertest,
            params: {
              cases: [
                {
                  id: updatedIndWithStatus[0].id,
                  version: updatedIndWithStatus[0].version,
                  settings: { syncAlerts: true },
                },
              ],
            },
          });
          await es.indices.refresh({ index: defaultSignalsIndex });
          await es.indices.refresh({ index: signalsIndex2 });

          signals = await getSignals();

          // alerts should be updated now that the
          expect(
            signals.get(defaultSignalsIndex)?.get(signalIDInFirstIndex)?._source?.signal?.status
          ).to.be(CaseStatuses.closed);
          expect(
            signals.get(signalsIndex2)?.get(signalIDInSecondIndex)?._source?.signal?.status
          ).to.be(CaseStatuses.closed);

          // the duplicate signal id in the other index should not be affect (so its status should be open)
          expect(
            signals.get(defaultSignalsIndex)?.get(signalIDInSecondIndex)?._source?.signal?.status
          ).to.be(CaseStatuses.open);
        });
      });

      describe('detections rule', () => {
        beforeEach(async () => {
          await esArchiver.load('x-pack/test/functional/es_archives/auditbeat/hosts');
          await createAlertsIndex(supertest, log);
        });

        afterEach(async () => {
          await deleteAllAlerts(supertest, log, es);
          await deleteAllRules(supertest, log);
          await esArchiver.unload('x-pack/test/functional/es_archives/auditbeat/hosts');
        });

        it('updates alert status when the status is updated and syncAlerts=true', async () => {
          const rule = {
            ...getRuleForAlertTesting(['auditbeat-*']),
            query: 'process.executable: "/usr/bin/sudo"',
          };
          const postedCase = await createCase(supertest, postCaseReq);

          const { id } = await createRule(supertest, log, rule);
          await waitForRuleSuccess({ supertest, log, id });
          await waitForAlertsToBePresent(supertest, log, 1, [id]);
          const signals = await getAlertsByIds(supertest, log, [id]);

          const alert = signals.hits.hits[0];
          expect(alert._source?.[ALERT_WORKFLOW_STATUS]).eql('open');

          const caseUpdated = await createComment({
            supertest,
            caseId: postedCase.id,
            params: {
              alertId: alert._id!,
              index: alert._index,
              rule: {
                id: 'id',
                name: 'name',
              },
              type: AttachmentType.alert,
              owner: 'securitySolutionFixture',
            },
          });

          await es.indices.refresh({ index: alert._index });
          await updateCase({
            supertest,
            params: {
              cases: [
                {
                  id: caseUpdated.id,
                  version: caseUpdated.version,
                  status: CaseStatuses['in-progress'],
                },
              ],
            },
          });

          // force a refresh on the index that the signal is stored in so that we can search for it and get the correct
          // status
          await es.indices.refresh({ index: alert._index });

          const { body: updatedAlert } = await supertest
            .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
            .set('kbn-xsrf', 'true')
            .send(getQueryAlertIds([alert._id!]))
            .expect(200);

          expect(updatedAlert.hits.hits[0]._source?.['kibana.alert.workflow_status']).eql(
            'acknowledged'
          );
        });

        it('does NOT updates alert status when the status is updated and syncAlerts=false', async () => {
          const rule = {
            ...getRuleForAlertTesting(['auditbeat-*']),
            query: 'process.executable: "/usr/bin/sudo"',
          };

          const postedCase = await createCase(supertest, {
            ...postCaseReq,
            settings: { syncAlerts: false },
          });

          const { id } = await createRule(supertest, log, rule);
          await waitForRuleSuccess({ supertest, log, id });
          await waitForAlertsToBePresent(supertest, log, 1, [id]);
          const signals = await getAlertsByIds(supertest, log, [id]);

          const alert = signals.hits.hits[0];
          expect(alert._source?.[ALERT_WORKFLOW_STATUS]).eql('open');

          const caseUpdated = await createComment({
            supertest,
            caseId: postedCase.id,
            params: {
              alertId: alert._id!,
              index: alert._index,
              type: AttachmentType.alert,
              rule: {
                id: 'id',
                name: 'name',
              },
              owner: 'securitySolutionFixture',
            },
          });

          await updateCase({
            supertest,
            params: {
              cases: [
                {
                  id: caseUpdated.id,
                  version: caseUpdated.version,
                  status: CaseStatuses['in-progress'],
                },
              ],
            },
          });

          const { body: updatedAlert } = await supertest
            .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
            .set('kbn-xsrf', 'true')
            .send(getQueryAlertIds([alert._id!]))
            .expect(200);

          expect(updatedAlert.hits.hits[0]._source?.['kibana.alert.workflow_status']).eql('open');
        });

        it('it updates alert status when syncAlerts is turned on', async () => {
          const rule = {
            ...getRuleForAlertTesting(['auditbeat-*']),
            query: 'process.executable: "/usr/bin/sudo"',
          };

          const postedCase = await createCase(supertest, {
            ...postCaseReq,
            settings: { syncAlerts: false },
          });

          const { id } = await createRule(supertest, log, rule);
          await waitForRuleSuccess({ supertest, log, id });
          await waitForAlertsToBePresent(supertest, log, 1, [id]);
          const signals = await getAlertsByIds(supertest, log, [id]);

          const alert = signals.hits.hits[0];
          expect(alert._source?.[ALERT_WORKFLOW_STATUS]).eql('open');

          const caseUpdated = await createComment({
            supertest,
            caseId: postedCase.id,
            params: {
              alertId: alert._id!,
              index: alert._index,
              rule: {
                id: 'id',
                name: 'name',
              },
              type: AttachmentType.alert,
              owner: 'securitySolutionFixture',
            },
          });

          // Update the status of the case with sync alerts off
          const caseStatusUpdated = await updateCase({
            supertest,
            params: {
              cases: [
                {
                  id: caseUpdated.id,
                  version: caseUpdated.version,
                  status: CaseStatuses['in-progress'],
                },
              ],
            },
          });

          // Turn sync alerts on
          await updateCase({
            supertest,
            params: {
              cases: [
                {
                  id: caseStatusUpdated[0].id,
                  version: caseStatusUpdated[0].version,
                  settings: { syncAlerts: true },
                },
              ],
            },
          });

          // refresh the index because syncAlerts was set to true so the alert's status should have been updated
          await es.indices.refresh({ index: alert._index });

          const { body: updatedAlert } = await supertest
            .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
            .set('kbn-xsrf', 'true')
            .send(getQueryAlertIds([alert._id!]))
            .expect(200);

          expect(updatedAlert.hits.hits[0]._source?.['kibana.alert.workflow_status']).eql(
            'acknowledged'
          );
        });

        it('it does NOT updates alert status when syncAlerts is turned off', async () => {
          const rule = {
            ...getRuleForAlertTesting(['auditbeat-*']),
            query: 'process.executable: "/usr/bin/sudo"',
          };

          const postedCase = await createCase(supertest, postCaseReq);
          const { id } = await createRule(supertest, log, rule);
          await waitForRuleSuccess({ supertest, log, id });
          await waitForAlertsToBePresent(supertest, log, 1, [id]);
          const signals = await getAlertsByIds(supertest, log, [id]);

          const alert = signals.hits.hits[0];
          expect(alert._source?.[ALERT_WORKFLOW_STATUS]).eql('open');

          const caseUpdated = await createComment({
            supertest,
            caseId: postedCase.id,
            params: {
              alertId: alert._id!,
              index: alert._index,
              type: AttachmentType.alert,
              rule: {
                id: 'id',
                name: 'name',
              },
              owner: 'securitySolutionFixture',
            },
          });

          // Turn sync alerts off
          const caseSettingsUpdated = await updateCase({
            supertest,
            params: {
              cases: [
                {
                  id: caseUpdated.id,
                  version: caseUpdated.version,
                  settings: { syncAlerts: false },
                },
              ],
            },
          });

          // Update the status of the case with sync alerts off
          await updateCase({
            supertest,
            params: {
              cases: [
                {
                  id: caseSettingsUpdated[0].id,
                  version: caseSettingsUpdated[0].version,
                  status: CaseStatuses['in-progress'],
                },
              ],
            },
          });

          const { body: updatedAlert } = await supertest
            .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
            .set('kbn-xsrf', 'true')
            .send(getQueryAlertIds([alert._id!]))
            .expect(200);

          expect(updatedAlert.hits.hits[0]._source['kibana.alert.workflow_status']).eql('open');
        });
      });
    });

    describe('rbac', () => {
      const supertestWithoutAuth = getService('supertestWithoutAuth');

      it('should update a case when the user has the correct permissions', async () => {
        const postedCase = await createCase(supertestWithoutAuth, postCaseReq, 200, {
          user: secOnly,
          space: 'space1',
        });

        const patchedCases = await updateCase({
          supertest: supertestWithoutAuth,
          params: {
            cases: [
              {
                id: postedCase.id,
                version: postedCase.version,
                title: 'new title',
              },
            ],
          },
          auth: { user: secOnly, space: 'space1' },
        });

        expect(patchedCases[0].owner).to.eql('securitySolutionFixture');
      });

      it('should update multiple cases when the user has the correct permissions', async () => {
        const [case1, case2, case3] = await Promise.all([
          createCase(supertestWithoutAuth, postCaseReq, 200, {
            user: superUser,
            space: 'space1',
          }),
          createCase(supertestWithoutAuth, postCaseReq, 200, {
            user: superUser,
            space: 'space1',
          }),
          createCase(supertestWithoutAuth, postCaseReq, 200, {
            user: superUser,
            space: 'space1',
          }),
        ]);

        const patchedCases = await updateCase({
          supertest: supertestWithoutAuth,
          params: {
            cases: [
              {
                id: case1.id,
                version: case1.version,
                title: 'new title',
              },
              {
                id: case2.id,
                version: case2.version,
                title: 'new title',
              },
              {
                id: case3.id,
                version: case3.version,
                title: 'new title',
              },
            ],
          },
          auth: { user: secOnly, space: 'space1' },
        });

        expect(patchedCases[0].owner).to.eql('securitySolutionFixture');
        expect(patchedCases[1].owner).to.eql('securitySolutionFixture');
        expect(patchedCases[2].owner).to.eql('securitySolutionFixture');
      });

      it('should not update a case when the user does not have the correct ownership', async () => {
        const postedCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'observabilityFixture' }),
          200,
          { user: obsOnly, space: 'space1' }
        );

        await updateCase({
          supertest: supertestWithoutAuth,
          params: {
            cases: [
              {
                id: postedCase.id,
                version: postedCase.version,
                title: 'new title',
              },
            ],
          },
          auth: { user: secOnly, space: 'space1' },
          expectedHttpCode: 403,
        });
      });

      it('should not update any cases when the user does not have the correct ownership', async () => {
        const [case1, case2, case3] = await Promise.all([
          createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'observabilityFixture' }),
            200,
            {
              user: superUser,
              space: 'space1',
            }
          ),
          createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'observabilityFixture' }),
            200,
            {
              user: superUser,
              space: 'space1',
            }
          ),
          createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'observabilityFixture' }),
            200,
            {
              user: superUser,
              space: 'space1',
            }
          ),
        ]);

        await updateCase({
          supertest: supertestWithoutAuth,
          params: {
            cases: [
              {
                id: case1.id,
                version: case1.version,
                title: 'new title',
              },
              {
                id: case2.id,
                version: case2.version,
                title: 'new title',
              },
              {
                id: case3.id,
                version: case3.version,
                title: 'new title',
              },
            ],
          },
          auth: { user: secOnly, space: 'space1' },
          expectedHttpCode: 403,
        });

        const resp = await findCases({ supertest, auth: superUserSpace1Auth });
        expect(resp.cases.length).to.eql(3);
        // the update should have failed and none of the title should have been changed
        expect(resp.cases[0].title).to.eql(postCaseReq.title);
        expect(resp.cases[1].title).to.eql(postCaseReq.title);
        expect(resp.cases[2].title).to.eql(postCaseReq.title);
      });

      for (const user of [globalRead, secOnlyRead, obsOnlyRead, obsSecRead, noKibanaPrivileges]) {
        it(`User ${
          user.username
        } with role(s) ${user.roles.join()} - should NOT update a case`, async () => {
          const postedCase = await createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'securitySolutionFixture' }),
            200,
            {
              user: superUser,
              space: 'space1',
            }
          );

          await updateCase({
            supertest: supertestWithoutAuth,
            params: {
              cases: [
                {
                  id: postedCase.id,
                  version: postedCase.version,
                  title: 'new title',
                },
              ],
            },
            auth: { user, space: 'space1' },
            expectedHttpCode: 403,
          });
        });
      }

      it('should NOT create a case in a space with no permissions', async () => {
        const postedCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          {
            user: superUser,
            space: 'space2',
          }
        );

        await updateCase({
          supertest: supertestWithoutAuth,
          params: {
            cases: [
              {
                id: postedCase.id,
                version: postedCase.version,
                title: 'new title',
              },
            ],
          },
          auth: { user: secOnly, space: 'space2' },
          expectedHttpCode: 403,
        });
      });
    });
  });
};
