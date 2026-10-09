/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';
import type { IndexedFleetEndpointPolicyResponse } from '../../../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import { login } from '../../tasks/login';
import { createAgentPolicyTask, getEndpointIntegrationVersion } from '../../tasks/fleet';
import {
  blocklistFormSelectors,
  createArtifactList,
  createPerPolicyArtifact,
  removeExceptionsList,
} from '../../tasks/artifacts';

const {
  deleteBlocklistItem,
  validateSuccessPopup,
  submitBlocklist,
  selectOperator,
  validateRenderedCondition,
  fillOutBlocklistFlyout,
  setSingleValue,
  setMultiValue,
  openBlocklist,
  selectSignatureField,
  selectField,
} = blocklistFormSelectors;

describe(
  'Blocklist',
  {
    tags: ['@ess', '@serverless', '@serverlessQA'],
  },
  () => {
    let indexedPolicy: IndexedFleetEndpointPolicyResponse;

    before(() => {
      getEndpointIntegrationVersion().then((version) => {
        createAgentPolicyTask(version).then((data) => {
          indexedPolicy = data;
        });
      });
    });

    beforeEach(() => {
      login();
    });

    after(() => {
      if (indexedPolicy) {
        cy.task('deleteIndexedFleetEndpointPolicies', indexedPolicy);
      }
    });

    const createArtifactBodyRequest = (type: 'match' | 'match_any') => {
      return {
        list_id: ENDPOINT_ARTIFACT_LISTS.blocklists.id,
        entries: [
          {
            entries: [
              {
                field: 'subject_name',
                value: type === 'match' ? 'Elastic, Inc.' : ['Elastic', 'Inc.'],
                type,
                operator: 'included',
              },
            ],
            field: 'file.Ext.code_signature',
            type: 'nested',
          },
        ],
        os_types: ['windows'],
      };
    };

    describe('Handles CRUD with operator field', () => {
      const IS_EXPECTED_CONDITION = /AND\s*file.Ext.code_signature\s*IS\s*Elastic,\s*Inc\./i;
      const IS_ONE_OF_EXPECTED_CONDITION =
        /AND\s*file.Ext.code_signature\s*is\s*one\s*of\s*Elastic\s*Inc\./i;

      afterEach(() => {
        removeExceptionsList(ENDPOINT_ARTIFACT_LISTS.blocklists.id);
      });

      it('Create a blocklist item with single operator', () => {
        openBlocklist({ create: true });
        fillOutBlocklistFlyout();
        selectSignatureField();
        selectOperator('is');
        setSingleValue();
        submitBlocklist();
        validateSuccessPopup('create');
        validateRenderedCondition(IS_EXPECTED_CONDITION);
      });

      it('Create a blocklist item with multi operator', () => {
        openBlocklist({ create: true });
        fillOutBlocklistFlyout();
        selectSignatureField();
        selectOperator('is one of');
        setMultiValue();
        submitBlocklist();
        validateSuccessPopup('create');
        validateRenderedCondition(IS_ONE_OF_EXPECTED_CONDITION);
      });

      describe('Updates and deletes blocklist match_any item', () => {
        let itemId: string;

        beforeEach(() => {
          createArtifactList(ENDPOINT_ARTIFACT_LISTS.blocklists.id);
          createPerPolicyArtifact('Test Blocklist', createArtifactBodyRequest('match_any')).then(
            (response) => {
              itemId = response.body.item_id;
            }
          );
        });

        it('Updates a match_any blocklist item', () => {
          openBlocklist({ itemId });
          selectOperator('is');
          submitBlocklist();
          validateSuccessPopup('update');
          validateRenderedCondition(IS_EXPECTED_CONDITION);
        });

        it('Deletes a blocklist item', () => {
          openBlocklist();
          deleteBlocklistItem();
          validateSuccessPopup('delete');
        });

        after(() => {
          removeExceptionsList(ENDPOINT_ARTIFACT_LISTS.blocklists.id);
        });
      });

      describe('Updates and deletes blocklist match item', () => {
        let itemId: string;

        beforeEach(() => {
          createArtifactList(ENDPOINT_ARTIFACT_LISTS.blocklists.id);
          createPerPolicyArtifact('Test Blocklist', createArtifactBodyRequest('match')).then(
            (response) => {
              itemId = response.body.item_id;
            }
          );
        });

        it('Updates a match blocklist item', () => {
          openBlocklist({ itemId });
          selectOperator('is one of');
          submitBlocklist();
          validateSuccessPopup('update');
          validateRenderedCondition(IS_ONE_OF_EXPECTED_CONDITION);
        });

        it('Deletes a blocklist item', () => {
          openBlocklist();
          deleteBlocklistItem();
          validateSuccessPopup('delete');
        });

        after(() => {
          removeExceptionsList(ENDPOINT_ARTIFACT_LISTS.blocklists.id);
        });
      });
    });

    describe('Handles CRUD with the Match (wildcard) operator', () => {
      const MATCH_PATH_CONDITION = /AND\s*file\.path\.caseless\s*MATCHES\s*C:\\foo\\\*\.exe/i;
      // Default OS for these flyout tests is Windows, which is case-insensitive, so the Match
      // operator resolves File Name to the `file.name.caseless` field.
      const MATCH_FILE_NAME_CONDITION = /AND\s*file\.name\.caseless\s*MATCHES\s*\*\.exe/i;

      afterEach(() => {
        removeExceptionsList(ENDPOINT_ARTIFACT_LISTS.blocklists.id);
      });

      it('Create a blocklist item with the Match operator for the Path field', () => {
        openBlocklist({ create: true });
        fillOutBlocklistFlyout();
        selectField('file.path.caseless');
        selectOperator('Match');
        setSingleValue('C:\\foo\\*.exe');
        submitBlocklist();
        validateSuccessPopup('create');
        validateRenderedCondition(MATCH_PATH_CONDITION);
      });

      it('Create a blocklist item with the Match operator for the File Name field', () => {
        openBlocklist({ create: true });
        fillOutBlocklistFlyout();
        selectField('file.name');
        selectOperator('Match');
        setSingleValue('*.exe');
        submitBlocklist();
        validateSuccessPopup('create');
        validateRenderedCondition(MATCH_FILE_NAME_CONDITION);
      });
    });
  }
);
