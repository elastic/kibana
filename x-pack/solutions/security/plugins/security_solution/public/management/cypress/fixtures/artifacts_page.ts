/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';
import type { FormAction } from '../tasks/perform_user_actions';

interface FormEditingDescription {
  formActions: FormAction[];

  checkResults: Array<{
    selector: string;
    value: string;
  }>;
}

export interface ArtifactsFixtureType {
  title: string;
  pagePrefix: string;
  tabId: string;
  nextTabId: string;
  artifactName: string;
  privilegePrefix: string;
  urlPath: string;
  emptyState: string;

  create: FormEditingDescription;
  update: FormEditingDescription;

  delete: {
    confirmSelector: string;
    card: string;
  };

  createRequestBody: {
    list_id: string;
    entries: object[];
    os_types: string[];
  };
}

export const getArtifactsListTestsData = (): ArtifactsFixtureType[] => [
  {
    title: 'Trusted applications',
    pagePrefix: 'trustedAppsListPage',
    tabId: 'trustedApps',
    nextTabId: 'eventFilters',
    artifactName: 'Trusted application name',
    privilegePrefix: 'trusted_applications_',
    create: {
      formActions: [
        {
          type: 'input',
          selector: 'trustedApps-form-nameTextField',
          value: 'Trusted application name',
        },
        {
          type: 'input',
          selector: 'trustedApps-form-descriptionField',
          value: 'This is the trusted application description',
        },
        {
          type: 'click',
          selector: 'trustedApps-form-conditionsBuilder-group1-entry0-field',
        },
        {
          type: 'click',
          selector: 'trustedApps-form-conditionsBuilder-group1-entry0-field-type-Hash',
        },
        {
          type: 'input',
          selector: 'trustedApps-form-conditionsBuilder-group1-entry0-value',
          value: 'A4370C0CF81686C0B696FA6261c9d3e0d810ae704ab8301839dffd5d5112f476',
        },
      ],
      checkResults: [
        {
          selector: 'trustedAppsListPage-card-criteriaConditions',
          value:
            ' OSIS WindowsAND process.hash.*IS a4370c0cf81686c0b696fa6261c9d3e0d810ae704ab8301839dffd5d5112f476',
        },
      ],
    },
    update: {
      formActions: [
        {
          type: 'clear',
          selector: 'trustedApps-form-nameTextField',
        },
        {
          type: 'input',
          selector: 'trustedApps-form-nameTextField',
          value: 'Trusted application name edited',
        },
        {
          type: 'clear',
          selector: 'trustedApps-form-descriptionField',
        },
        {
          type: 'input',
          selector: 'trustedApps-form-descriptionField',
          value: 'This is the trusted application description edited',
        },
        {
          type: 'click',
          selector: 'trustedApps-form-conditionsBuilder-group1-entry0-field',
        },
        {
          type: 'click',
          selector: 'trustedApps-form-conditionsBuilder-group1-entry0-field-type-Path',
        },
        {
          type: 'clear',
          selector: 'trustedApps-form-conditionsBuilder-group1-entry0-value',
        },
        {
          type: 'input',
          selector: 'trustedApps-form-conditionsBuilder-group1-entry0-value',
          value: 'c:\\randomFolder\\randomFile.exe, c:\\randomFolder\\randomFile2.exe',
        },
      ],
      checkResults: [
        {
          selector: 'trustedAppsListPage-card-criteriaConditions',
          value:
            ' OSIS WindowsAND process.executable.caselessIS c:\\randomFolder\\randomFile.exe, c:\\randomFolder\\randomFile2.exe',
        },
        {
          selector: 'trustedAppsListPage-card-header-title',
          value: 'Trusted application name edited',
        },
        {
          selector: 'trustedAppsListPage-card-description',
          value: 'This is the trusted application description edited',
        },
      ],
    },
    delete: {
      confirmSelector: 'trustedAppsListPage-deleteModal-submitButton',
      card: 'trustedAppsListPage-card',
    },
    urlPath: 'trusted_apps',
    emptyState: 'trustedAppsListPage-emptyState',
    createRequestBody: {
      list_id: ENDPOINT_ARTIFACT_LISTS.trustedApps.id,
      entries: [
        {
          entries: [
            {
              field: 'trusted',
              operator: 'included',
              type: 'match',
              value: 'true',
            },
            {
              field: 'subject_name',
              operator: 'included',
              type: 'match',
              value: 'abcd',
            },
          ],
          field: 'process.Ext.code_signature',
          type: 'nested',
        },
      ],
      os_types: ['windows'],
    },
  },
  {
    title: 'Event Filters',
    pagePrefix: 'EventFiltersListPage',
    tabId: 'eventFilters',
    nextTabId: 'blocklists',
    artifactName: 'Event filter name',
    privilegePrefix: 'event_filters_',
    create: {
      formActions: [
        {
          type: 'input',
          selector: 'eventFilters-form-name-input',
          value: 'Event filter name',
        },
        {
          type: 'input',
          selector: 'eventFilters-form-description-input',
          value: 'This is the event filter description',
        },

        {
          type: 'input',
          selector: 'fieldAutocompleteComboBox',
          value: '@timestamp',
        },
        {
          type: 'click',
          selector: 'valuesAutocompleteMatch',
        },
        {
          type: 'input',
          selector: 'valuesAutocompleteMatch',
          value: '1234',
        },
        {
          type: 'click',
          selector: 'eventFilters-form-description-input',
        },
      ],
      checkResults: [
        {
          selector: 'EventFiltersListPage-card-criteriaConditions-condition',
          value: 'AND @timestampIS 1234',
        },
      ],
    },
    update: {
      formActions: [
        {
          type: 'clear',
          selector: 'eventFilters-form-name-input',
        },
        {
          type: 'input',
          selector: 'eventFilters-form-name-input',
          value: 'Event filter name edited',
        },
        {
          type: 'clear',
          selector: 'eventFilters-form-description-input',
        },
        {
          type: 'input',
          selector: 'eventFilters-form-description-input',
          value: 'This is the event filter description edited',
        },
        {
          type: 'input',
          selector: 'fieldAutocompleteComboBox',
          value: '{selectAll}agent.name',
        },
        {
          type: 'input',
          selector: 'valuesAutocompleteMatch',
          value: 'test',
        },
        {
          type: 'click',
          selector: 'eventFilters-form-description-input',
        },
      ],
      checkResults: [
        {
          selector: 'EventFiltersListPage-card-criteriaConditions-condition',
          value: 'AND agent.nameIS test',
        },
        {
          selector: 'EventFiltersListPage-card-header-title',
          value: 'Event filter name edited',
        },
        {
          selector: 'EventFiltersListPage-card-description',
          value: 'This is the event filter description edited',
        },
      ],
    },
    delete: {
      confirmSelector: 'EventFiltersListPage-deleteModal-submitButton',
      card: 'EventFiltersListPage-card',
    },
    urlPath: 'event_filters',
    emptyState: 'EventFiltersListPage-emptyState',
    createRequestBody: {
      list_id: ENDPOINT_ARTIFACT_LISTS.eventFilters.id,
      entries: [
        {
          field: 'process.name',
          operator: 'included',
          type: 'match',
          value: 'notepad.exe',
        },
      ],
      os_types: ['windows'],
    },
  },
  {
    title: 'Blocklist',
    pagePrefix: 'blocklistPage',
    tabId: 'blocklists',
    nextTabId: 'hostIsolationExceptions',
    artifactName: 'Blocklist name',
    privilegePrefix: 'blocklist_',
    create: {
      formActions: [
        {
          type: 'input',
          selector: 'blocklist-form-name-input',
          value: 'Blocklist name',
        },
        {
          type: 'input',
          selector: 'blocklist-form-description-input',
          value: 'This is the blocklist description',
        },
        {
          type: 'click',
          selector: 'blocklist-form-field-select',
        },
        {
          type: 'click',
          selector: 'blocklist-form-file.hash.*',
        },
        {
          type: 'input',
          selector: 'blocklist-form-values-input',
          value: 'A4370C0CF81686C0B696FA6261c9d3e0d810ae704ab8301839dffd5d5112f476',
        },
        {
          type: 'click',
          selector: 'blocklist-form-name-input',
        },
      ],
      checkResults: [
        {
          selector: 'blocklistPage-card-criteriaConditions',
          value:
            ' OSIS WindowsAND file.hash.*is one of a4370c0cf81686c0b696fa6261c9d3e0d810ae704ab8301839dffd5d5112f476',
        },
      ],
    },
    update: {
      formActions: [
        {
          type: 'clear',
          selector: 'blocklist-form-name-input',
        },
        {
          type: 'input',
          selector: 'blocklist-form-name-input',
          value: 'Blocklist name edited',
        },
        {
          type: 'clear',
          selector: 'blocklist-form-description-input',
        },
        {
          type: 'input',
          selector: 'blocklist-form-description-input',
          value: 'This is the blocklist description edited',
        },
        {
          type: 'click',
          selector: 'blocklist-form-field-select',
        },
        {
          type: 'click',
          selector: 'blocklist-form-file.path.caseless',
        },
        {
          type: 'click',
          customSelector:
            '[data-test-subj="blocklist-form-values-input-a4370c0cf81686c0b696fa6261c9d3e0d810ae704ab8301839dffd5d5112f476"] > span > button',
        },
        {
          type: 'input',
          selector: 'blocklist-form-values-input',
          value: 'c:\\randomFolder\\randomFile.exe, c:\\randomFolder\\randomFile2.exe',
        },
        {
          type: 'click',
          selector: 'blocklist-form-name-input',
        },
      ],
      checkResults: [
        {
          selector: 'blocklistPage-card-criteriaConditions',
          value:
            ' OSIS WindowsAND file.path.caselessis one of c:\\randomFolder\\randomFile.exe c:\\randomFolder\\randomFile2.exe',
        },
        {
          selector: 'blocklistPage-card-header-title',
          value: 'Blocklist name edited',
        },
        {
          selector: 'blocklistPage-card-description',
          value: 'This is the blocklist description edited',
        },
      ],
    },
    delete: {
      confirmSelector: 'blocklistDeletionConfirm',
      card: 'blocklistCard',
    },
    urlPath: 'blocklist',
    emptyState: 'blocklistPage-emptyState',
    createRequestBody: {
      list_id: ENDPOINT_ARTIFACT_LISTS.blocklists.id,
      entries: [
        {
          field: 'file.hash.sha256',
          value: ['a4370c0cf81686c0b696fa6261c9d3e0d810ae704ab8301839dffd5d5112f476'],
          type: 'match_any',
          operator: 'included',
        },
      ],
      os_types: ['windows'],
    },
  },
  {
    title: 'Host isolation exceptions',
    pagePrefix: 'hostIsolationExceptionsListPage',
    tabId: 'hostIsolationExceptions',
    nextTabId: 'trustedApps',
    artifactName: 'Host Isolation exception name',
    privilegePrefix: 'host_isolation_exceptions_',
    create: {
      formActions: [
        {
          type: 'input',
          selector: 'hostIsolationExceptions-form-name-input',
          value: 'Host Isolation exception name',
        },
        {
          type: 'input',
          selector: 'hostIsolationExceptions-form-description-input',
          value: 'This is the host isolation exception description',
        },
        {
          type: 'input',
          selector: 'hostIsolationExceptions-form-ip-input',
          value: '1.1.1.1',
        },
      ],
      checkResults: [
        {
          selector: 'hostIsolationExceptionsListPage-card-criteriaConditions',
          value: ' OSIS Windows, Linux, MacAND destination.ipIS 1.1.1.1',
        },
      ],
    },
    update: {
      formActions: [
        {
          type: 'clear',
          selector: 'hostIsolationExceptions-form-name-input',
        },
        {
          type: 'input',
          selector: 'hostIsolationExceptions-form-name-input',
          value: 'Host Isolation exception name edited',
        },
        {
          type: 'clear',
          selector: 'hostIsolationExceptions-form-description-input',
        },
        {
          type: 'input',
          selector: 'hostIsolationExceptions-form-description-input',
          value: 'This is the host isolation exception description edited',
        },
        {
          type: 'clear',
          selector: 'hostIsolationExceptions-form-ip-input',
        },
        {
          type: 'input',
          selector: 'hostIsolationExceptions-form-ip-input',
          value: '2.2.2.2/24',
        },
      ],
      checkResults: [
        {
          selector: 'hostIsolationExceptionsListPage-card-criteriaConditions',
          value: ' OSIS Windows, Linux, MacAND destination.ipIS 2.2.2.2/24',
        },
        {
          selector: 'hostIsolationExceptionsListPage-card-header-title',
          value: 'Host Isolation exception name edited',
        },
        {
          selector: 'hostIsolationExceptionsListPage-card-description',
          value: 'This is the host isolation exception description edited',
        },
      ],
    },
    delete: {
      confirmSelector: 'hostIsolationExceptionsDeletionConfirm',
      card: 'hostIsolationExceptionsCard',
    },
    urlPath: 'host_isolation_exceptions',
    emptyState: 'hostIsolationExceptionsListPage-emptyState',
    createRequestBody: {
      list_id: ENDPOINT_ARTIFACT_LISTS.hostIsolationExceptions.id,
      entries: [
        {
          field: 'destination.ip',
          operator: 'included',
          type: 'match',
          value: '1.2.3.4',
        },
      ],
      os_types: ['windows', 'linux', 'macos'],
    },
  },
];
