/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FullAgentPolicy } from '@kbn/fleet-plugin/common/types';
import { ArtifactElasticsearchProperties } from '@kbn/fleet-plugin/server/services/artifacts/types';
import { InternalManifestSchema } from '@kbn/security-solution-plugin/server/endpoint/schemas/artifacts';
import { TranslatedExceptionListItem } from '@kbn/security-solution-plugin/server/endpoint/schemas/artifacts/lists';

export interface AgentPolicyResponseType {
  _index: string;
  _id: string;
  _score: number;
  _source: { data: FullAgentPolicy };
}

export interface InternalManifestSchemaResponseType {
  _index: string;
  _id: string;
  _score: number;
  _source: {
    'endpoint:user-artifact-manifest': InternalManifestSchema;
  };
}

export interface ArtifactBodyType {
  entries: TranslatedExceptionListItem[];
}

export type ArtifactActionsType = ReturnType<typeof getArtifactsListTestsData>[0];
export type MultipleArtifactActionsType = ReturnType<typeof getCreateMultipleData>;

export const getArtifactsListTestsData = () => [
  {
    title: 'Trusted applications',
    pagePrefix: 'trustedAppsListPage',
    create: {
      formFields: [
        {
          type: 'input',
          selector: 'trustedApps-form-descriptionField',
          value: 'This is the trusted application description',
        },
        {
          type: 'input',
          selector: 'trustedApps-form-nameTextField',
          value: 'Trusted application name',
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
            'OSIS Windows\nAND process.hash.*IS a4370c0cf81686c0b696fa6261c9d3e0d810ae704ab8301839dffd5d5112f476',
        },
      ],
    },
    update: {
      formFields: [
        {
          type: 'input',
          selector: 'trustedApps-form-descriptionField',
          value: 'This is the trusted application description edited',
        },
        {
          type: 'input',
          selector: 'trustedApps-form-nameTextField',
          value: 'Trusted application name edited',
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
          type: 'input',
          selector: 'trustedApps-form-conditionsBuilder-group1-entry0-value',
          value: 'c:\\randomFolder\\randomFile.exe, c:\\randomFolder\\randomFile2.exe',
        },
      ],
      checkResults: [
        {
          selector: 'trustedAppsListPage-card-criteriaConditions',
          value:
            'OSIS Windows\nAND process.executable.caselessIS c:\\randomFolder\\randomFile.exe, c:\\randomFolder\\randomFile2.exe',
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
      waitForValue:
        'OSIS Windows\nAND process.executable.caselessIS c:\\randomFolder\\randomFile.exe, c:\\randomFolder\\randomFile2.exe',
    },
    delete: {
      confirmSelector: 'trustedAppsListPage-deleteModal-submitButton',
      card: 'trustedAppsListPage-card',
    },
    urlPath: 'trusted_apps',
    pageObject: 'trustedApps',
    fleetArtifact: {
      identifier: 'endpoint-trustlist-windows-v1',
      type: 'trustedApplications',
      getExpectedUpdatedtArtifactWhenCreate: (): ArtifactElasticsearchProperties => ({
        type: 'trustlist',
        identifier: 'endpoint-trustlist-windows-v1',
        body: 'eJxVjEEKwjAQRe+StZSkadO0VxGR6cyEBmIbklSU4t2N4kb+7r3HPwSvJXnOYjofojwji0lkf4uBxenPOc+BqoxpQ865WSAvTV6g7U0tt8gJypZq4FcMOzFV+vvjB2C5IuQvvEPYPxQ6PUiU6Kwy1qCczWgcmNYoHEmzJKsk8CA7mK2WyuqRnKOeeqVa1w1GvC51bz2HPRA=',
        package_name: 'endpoint',
        created: '2000-01-01T00:00:00.000Z',
        relative_url:
          '/api/fleet/artifacts/endpoint-trustlist-windows-v1/016bec11c5b1d6f8609fd3525202aa12baf0132484abf368d5011100d5ec1ec4',
        compression_algorithm: 'zlib',
        decoded_size: 193,
        decoded_sha256: '016bec11c5b1d6f8609fd3525202aa12baf0132484abf368d5011100d5ec1ec4',
        encryption_algorithm: 'none',
        encoded_sha256: 'ce6a4e9bf54d3d70b2bdcc8ca0b28ffd7f16fa42412bccb6d7399c0250442c13',
        encoded_size: 152,
      }),
      getExpectedUpdatedArtifactBodyWhenCreate: (): ArtifactBodyType => ({
        entries: [
          {
            type: 'simple',
            entries: [
              {
                field: 'process.hash.sha256',
                operator: 'included',
                type: 'exact_cased',
                value: 'a4370c0cf81686c0b696fa6261c9d3e0d810ae704ab8301839dffd5d5112f476',
              },
            ],
          },
        ],
      }),
      getExpectedUpdatedArtifactWhenUpdate: (): ArtifactElasticsearchProperties => ({
        type: 'trustlist',
        identifier: 'endpoint-trustlist-windows-v1',
        body: 'eJx9jEsKAjEQRK8ivR5cuMwBvIQj0nZKCPQkIR8ZGby7HRHBjfSq6r2ujRBbCajkThu1RwY5qmHJCpp+2C1AvcFckqDWPVZIb3x9iymjcEvFeIii3cNb+5nDytIuwhVqj9bfWfsA4ua5cPRpOSb1KN8UFGN/2v0zDkOh59nuBSaWRvA=',
        package_name: 'endpoint',
        created: '2000-01-01T00:00:00.000Z',
        relative_url:
          '/api/fleet/artifacts/endpoint-trustlist-windows-v1/ac2bf74a73885f9a5a1700c328bf1a5a8f6cb72f2465a575335ea99dac0d4c10',
        compression_algorithm: 'zlib',
        decoded_size: 198,
        decoded_sha256: 'ac2bf74a73885f9a5a1700c328bf1a5a8f6cb72f2465a575335ea99dac0d4c10',
        encryption_algorithm: 'none',
        encoded_sha256: '90baa7e228dbffc00864707d2df784593a754466f3903841f40cbab9dc015177',
        encoded_size: 131,
      }),
      getExpectedUpdatedArtifactBodyWhenUpdate: (): ArtifactBodyType => ({
        entries: [
          {
            type: 'simple',
            entries: [
              {
                field: 'process.executable',
                operator: 'included',
                type: 'exact_caseless',
                value: 'c:\\randomFolder\\randomFile.exe, c:\\randomFolder\\randomFile2.exe',
              },
            ],
          },
        ],
      }),
    },
  },
  {
    title: 'Event Filters',
    pagePrefix: 'EventFiltersListPage',
    create: {
      formFields: [
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
          type: 'click',
          selector: 'fieldAutocompleteComboBox',
        },
        {
          type: 'customClick',
          selector: 'button[title="agent.ephemeral_id"]',
        },
        {
          type: 'click',
          selector: 'valuesAutocompleteMatch',
        },
        {
          type: 'input',
          selector: 'valuesAutocompleteMatch',
          value: 'endpoint',
        },
      ],
      checkResults: [
        {
          selector: 'EventFiltersListPage-card-criteriaConditions-condition',
          value: 'AND agent.ephemeral_idIS endpoint',
        },
      ],
    },
    update: {
      formFields: [
        {
          type: 'input',
          selector: 'eventFilters-form-name-input',
          value: 'Event filter name edited',
        },
        {
          type: 'input',
          selector: 'eventFilters-form-description-input',
          value: 'This is the event filter description edited',
        },
        {
          type: 'click',
          selector: 'fieldAutocompleteComboBox',
        },
        {
          type: 'input',
          selector: 'fieldAutocompleteComboBox',
          value: 'agent.id',
        },
        {
          type: 'customClick',
          selector: 'button[title="agent.id"]',
        },
        {
          type: 'input',
          selector: 'valuesAutocompleteMatch',
          value: 'test super large value',
        },
        {
          type: 'click',
          selector: 'eventFilters-form-description-input',
        },
      ],
      checkResults: [
        {
          selector: 'EventFiltersListPage-card-criteriaConditions-condition',
          value: 'AND agent.idIS test super large value',
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
      waitForValue: 'AND agent.idIS test super large value',
    },
    delete: {
      confirmSelector: 'EventFiltersListPage-deleteModal-submitButton',
      card: 'EventFiltersListPage-card',
    },
    urlPath: 'event_filters',
    pageObject: 'eventFilters',
    fleetArtifact: {
      identifier: 'endpoint-eventfilterlist-windows-v1',
      type: 'eventfilterlist',
      getExpectedUpdatedtArtifactWhenCreate: (): ArtifactElasticsearchProperties => ({
        type: 'eventfilterlist',
        identifier: 'endpoint-eventfilterlist-windows-v1',
        body: 'eJxVjEEKwzAMBP+ic+kD8pUSgrA3qUCxha2EltC/Vwm9lL0sM8sehOJN0Gl4HORvAw3UZTUF3f7cLNAckpegd9gTKxrrJDmG1aJ7beGlJN0yTvq7w4uTT4n7BXfW7aIlW5Xi9BkjX6sIL5c=',
        package_name: 'endpoint',
        created: '2000-01-01T00:00:00.000Z',
        relative_url:
          '/api/fleet/artifacts/endpoint-eventfilterlist-windows-v1/b3373c93ffc795d954f22c625c084dc5874a156ec0cb3d4af1c3dab0b965fa30',
        compression_algorithm: 'zlib',
        decoded_size: 136,
        decoded_sha256: 'b3373c93ffc795d954f22c625c084dc5874a156ec0cb3d4af1c3dab0b965fa30',
        encryption_algorithm: 'none',
        encoded_sha256: 'c1b30df9457ba007065fff1388c026ad269e63fbed535b506ac559fd616aabe9',
        encoded_size: 107,
      }),
      getExpectedUpdatedArtifactBodyWhenCreate: (): ArtifactBodyType => ({
        entries: [
          {
            type: 'simple',
            entries: [
              {
                field: 'agent.ephemeral_id',
                operator: 'included',
                type: 'exact_cased',
                value: 'endpoint',
              },
            ],
          },
        ],
      }),
      getExpectedUpdatedArtifactWhenUpdate: (): ArtifactElasticsearchProperties => ({
        type: 'eventfilterlist',
        identifier: 'endpoint-eventfilterlist-windows-v1',
        body: 'eJxVzEEKwkAMheGrDFmLB+hVikiYeS2B2A6TjCildze1biS77+dlIyzeBEbDuJG/K2ggk0dV0OWvTQItEXkOvUqJvFY09rWFypK1Fxz6e4IXZ79nti8+WfuhDvNkPYZJuc1IZ9hvcR86lDCb',
        package_name: 'endpoint',
        created: '2000-01-01T00:00:00.000Z',
        relative_url:
          '/api/fleet/artifacts/endpoint-eventfilterlist-windows-v1/e4f00c88380d2c429eeb2741ad19383b94d76f79744b098b095befc24003e158',
        compression_algorithm: 'zlib',
        decoded_size: 140,
        decoded_sha256: 'e4f00c88380d2c429eeb2741ad19383b94d76f79744b098b095befc24003e158',
        encryption_algorithm: 'none',
        encoded_sha256: '99386e3d9a67eac88f0a4cc4ac36ad42cfda42598ce0ee1c11a8afc50bf004fe',
        encoded_size: 108,
      }),
      getExpectedUpdatedArtifactBodyWhenUpdate: (): ArtifactBodyType => ({
        entries: [
          {
            type: 'simple',
            entries: [
              {
                field: 'agent.id',
                operator: 'included',
                type: 'exact_cased',
                value: 'test super large value',
              },
            ],
          },
        ],
      }),
    },
  },
  {
    title: 'Blocklist',
    pagePrefix: 'blocklistPage',
    create: {
      formFields: [
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
          value:
            'A4370C0CF81686C0B696FA6261c9d3e0d810ae704ab8301839dffd5d5112f476,aedb279e378BED6C2DB3C9DC9e12ba635e0b391c,741462ab431a22233C787BAAB9B653C7',
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
            'OSIS Windows\nAND file.hash.*IS ONE OF\n741462ab431a22233c787baab9b653c7\naedb279e378bed6c2db3c9dc9e12ba635e0b391c\na4370c0cf81686c0b696fa6261c9d3e0d810ae704ab8301839dffd5d5112f476',
        },
      ],
    },
    update: {
      formFields: [
        {
          type: 'input',
          selector: 'blocklist-form-name-input',
          value: 'Blocklist name edited',
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
          type: 'clear',
          selector:
            'blocklist-form-values-input-a4370c0cf81686c0b696fa6261c9d3e0d810ae704ab8301839dffd5d5112f476',
        },
        {
          type: 'clear',
          selector: 'blocklist-form-values-input-741462ab431a22233c787baab9b653c7',
        },
        {
          type: 'clear',
          selector: 'blocklist-form-values-input-aedb279e378bed6c2db3c9dc9e12ba635e0b391c',
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
            'OSIS Windows\nAND file.path.caselessIS ONE OF\nc:\\randomFolder\\randomFile.exe\nc:\\randomFolder\\randomFile2.exe',
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
      waitForValue:
        'OSIS Windows\nAND file.path.caselessIS ONE OF\nc:\\randomFolder\\randomFile.exe\nc:\\randomFolder\\randomFile2.exe',
    },
    delete: {
      confirmSelector: 'blocklistDeletionConfirm',
      card: 'blocklistCard',
    },
    pageObject: 'blocklist',
    urlPath: 'blocklist',
    fleetArtifact: {
      identifier: 'endpoint-blocklist-windows-v1',
      type: 'blocklist',
      getExpectedUpdatedtArtifactWhenCreate: (): ArtifactElasticsearchProperties => ({
        type: 'blocklist',
        identifier: 'endpoint-blocklist-windows-v1',
        relative_url:
          '/api/fleet/artifacts/endpoint-blocklist-windows-v1/637f1e8795406904980ae2ab4a69cea967756571507f6bd7fc94cde0add20df2',
        body: 'eJylzsFqwzAMgOF38bkU27Jlu69SQpEtmQTSNCTpWCl595qyy45bj9IvxPdUMm3LIKs6nZ9qe8yiTmodrvMo6vCr1UFGbrEOoxx7WvvjlX27uc2y0HZbWhqmMt5ZuG1/Psk3le1SaBW+0PRo4YvGeytnFZxxaCk7MGStBSghhkyUU0bfBtXt3X74q2ntyXyAIuFsQxIIMQtjsZyhJC5JjM2E4EVnSKb8G2c9fsJzEHTRpUaDEYvOmLASWjQNCaI5Gk0StKMcQZsIiWtlz94YW13AN7vbX9OOoO0=',
        encryption_algorithm: 'none',
        package_name: 'endpoint',
        encoded_size: 218,
        encoded_sha256: '751aacf865573055bef82795d23d99b7ab695eb5fb2a36f1231f02f52da8adc0',
        decoded_size: 501,
        decoded_sha256: '637f1e8795406904980ae2ab4a69cea967756571507f6bd7fc94cde0add20df2',
        compression_algorithm: 'zlib',
        created: '2000-01-01T00:00:00.000Z',
      }),
      getExpectedUpdatedArtifactBodyWhenCreate: (): ArtifactBodyType => ({
        entries: [
          {
            type: 'simple',
            entries: [
              {
                field: 'file.hash.md5',
                operator: 'included',
                type: 'exact_cased_any',
                value: ['741462ab431a22233c787baab9b653c7'],
              },
            ],
          },
          {
            type: 'simple',
            entries: [
              {
                field: 'file.hash.sha1',
                operator: 'included',
                type: 'exact_cased_any',
                value: ['aedb279e378bed6c2db3c9dc9e12ba635e0b391c'],
              },
            ],
          },
          {
            type: 'simple',
            entries: [
              {
                field: 'file.hash.sha256',
                operator: 'included',
                type: 'exact_cased_any',
                value: ['a4370c0cf81686c0b696fa6261c9d3e0d810ae704ab8301839dffd5d5112f476'],
              },
            ],
          },
        ],
      }),
      getExpectedUpdatedArtifactWhenUpdate: (): ArtifactElasticsearchProperties => ({
        type: 'blocklist',
        identifier: 'endpoint-blocklist-windows-v1',
        relative_url:
          '/api/fleet/artifacts/endpoint-blocklist-windows-v1/3ead6ce4e34cb4411083a44bfe813d9442d296981ee8d56e727e6cff14dea0f0',
        body: 'eJx9jUEKwzAQA79S9lx66NEP6CeSEhZboYaNbWynJIT8vetSArkUnaQR0kYINXsUMt1GdU0gQ8VPSUDXExs9xCkcveCWuL6Ux4TMNWaNfbAyOzhNfytY2NbBcoGglIHDquzNMivsyJq+zxxcnB5RHPLh2jyW9n7517l/S8+96QOI6kW/',
        encryption_algorithm: 'none',
        package_name: 'endpoint',
        encoded_size: 132,
        encoded_sha256: '9f81934389ff29599c0b0f16aa91b9f5cebd95d51271a47ea469662a61a29884',
        decoded_size: 197,
        decoded_sha256: '3ead6ce4e34cb4411083a44bfe813d9442d296981ee8d56e727e6cff14dea0f0',
        compression_algorithm: 'zlib',
        created: '2000-01-01T00:00:00.000Z',
      }),
      getExpectedUpdatedArtifactBodyWhenUpdate: (): ArtifactBodyType => ({
        entries: [
          {
            type: 'simple',
            entries: [
              {
                field: 'file.path',
                operator: 'included',
                type: 'exact_caseless_any',
                value: ['c:\\randomFolder\\randomFile.exe', ' c:\\randomFolder\\randomFile2.exe'],
              },
            ],
          },
        ],
      }),
    },
  },
  {
    title: 'Host isolation exceptions',
    pagePrefix: 'hostIsolationExceptionsListPage',
    create: {
      formFields: [
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
          value: 'OSIS Windows, Linux, Mac\nAND destination.ipIS 1.1.1.1',
        },
      ],
    },
    update: {
      formFields: [
        {
          type: 'input',
          selector: 'hostIsolationExceptions-form-name-input',
          value: 'Host Isolation exception name edited',
        },
        {
          type: 'input',
          selector: 'hostIsolationExceptions-form-description-input',
          value: 'This is the host isolation exception description edited',
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
          value: 'OSIS Windows, Linux, Mac\nAND destination.ipIS 2.2.2.2/24',
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
      waitForValue: 'OSIS Windows, Linux, Mac\nAND destination.ipIS 2.2.2.2/24',
    },
    delete: {
      confirmSelector: 'hostIsolationExceptionsDeletionConfirm',
      card: 'hostIsolationExceptionsCard',
    },
    pageObject: 'hostIsolationExceptions',
    urlPath: 'host_isolation_exceptions',
    fleetArtifact: {
      identifier: 'endpoint-hostisolationexceptionlist-windows-v1',
      type: 'hostisolationexceptionlist',
      getExpectedUpdatedtArtifactWhenCreate: (): ArtifactElasticsearchProperties => ({
        type: 'hostisolationexceptionlist',
        identifier: 'endpoint-hostisolationexceptionlist-windows-v1',
        relative_url:
          '/api/fleet/artifacts/endpoint-hostisolationexceptionlist-windows-v1/2c3ee2b5e7f86f8c336a3df7e59a1151b11d7eec382442032e69712d6a6459e0',
        body: 'eJxVjEEKgDAMBP+Sswhe/YqIhHaFQG1LG0UR/24ULzK3mWVPQtQiqNQPJ+mRQT1VWXIANb82C4K36FFVIquk2Eq2UcoorKlYk+jC6uHNflfY2enkuL5y47A+tmtf6BqNG647LBE=',
        encryption_algorithm: 'none',
        package_name: 'endpoint',
        encoded_size: 101,
        encoded_sha256: 'ee949ea39fe547e06add448956fa7d94ea14d1c30a368dce7058a1cb6ac278f9',
        decoded_size: 131,
        decoded_sha256: '2c3ee2b5e7f86f8c336a3df7e59a1151b11d7eec382442032e69712d6a6459e0',
        compression_algorithm: 'zlib',
        created: '2000-01-01T00:00:00.000Z',
      }),
      getExpectedUpdatedArtifactBodyWhenCreate: (): ArtifactBodyType => ({
        entries: [
          {
            type: 'simple',
            entries: [
              {
                field: 'destination.ip',
                operator: 'included',
                type: 'exact_cased',
                value: '1.1.1.1',
              },
            ],
          },
        ],
      }),
      getExpectedUpdatedArtifactWhenUpdate: (): ArtifactElasticsearchProperties => ({
        type: 'hostisolationexceptionlist',
        identifier: 'endpoint-hostisolationexceptionlist-windows-v1',
        relative_url:
          '/api/fleet/artifacts/endpoint-hostisolationexceptionlist-windows-v1/4b62473b4cf057277b3297896771cc1061c3bea2c4f7ec1ef5c2546f33d5d9e8',
        body: 'eJxVjEEKgzAQRe8ya4kgXeUqIjIkvzAQk5CMYpHevVPpprzde59/EbI2QSc/X6SvCvLUZasJNPy1pyBFixFdJbNKyU6qjUpFYy3NmuSQ9oho9neFk4OugfstD077107uZpwe9F6MDzBbLKo=',
        encryption_algorithm: 'none',
        package_name: 'endpoint',
        encoded_size: 107,
        encoded_sha256: 'dbcc8f50044d43453fbffb4edda6aa0cd42075621827986393d625404f2b6b81',
        decoded_size: 134,
        decoded_sha256: '4b62473b4cf057277b3297896771cc1061c3bea2c4f7ec1ef5c2546f33d5d9e8',
        compression_algorithm: 'zlib',
        created: '2000-01-01T00:00:00.000Z',
      }),
      getExpectedUpdatedArtifactBodyWhenUpdate: (): ArtifactBodyType => ({
        entries: [
          {
            type: 'simple',
            entries: [
              {
                field: 'destination.ip',
                operator: 'included',
                type: 'exact_cased',
                value: '2.2.2.2/24',
              },
            ],
          },
        ],
      }),
    },
  },
];

export const getCreateMultipleData = () => ({
  title: 'Trusted applications',
  pagePrefix: 'trustedAppsListPage',
  create: {
    formFields: [
      {
        type: 'input',
        selector: 'trustedApps-form-descriptionField',
        value: 'This is the trusted application description',
      },
      {
        type: 'input',
        selector: 'trustedApps-form-nameTextField',
        value: 'Trusted application name',
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
        type: 'input',
        selector: 'trustedApps-form-conditionsBuilder-group1-entry0-value',
        value: 'c:\\randomFolder\\randomFile.exe',
      },
    ],
  },

  urlPath: 'trusted_apps',
  pageObject: 'trustedApps',
  fleetArtifact: {
    identifier: 'endpoint-trustlist-windows-v1',
    type: 'trustedApplications',
    getExpectedUpdatedArtifactWhenCreateMultipleFirst: (): ArtifactElasticsearchProperties => ({
      type: 'trustlist',
      identifier: 'endpoint-trustlist-windows-v1',
      body: 'eJzNjlEKwjAQRO+y38UD9ABewhaJyRQXtknYbKRSencTEcEb+DnzZobZCdGUUWi87GTPDBqp8JoFNPywhSGhwazJo5QTNvhq7vYOpgx1lrRxjl5qQGjuZw6b83b1rkBasfkPJ7UDP06TuhjSek4SoF/Fgr5vd9ZAx3wMf3dtYS3Wr83HC1Eec3Q=',
      package_name: 'endpoint',
      created: '2000-01-01T00:00:00.000Z',
      relative_url:
        '/api/fleet/artifacts/endpoint-trustlist-windows-v1/329fc9176a24d64f4376d2c25d5db5b31cf86b288dac83c8a004dfe5bbfdc7d0',
      compression_algorithm: 'zlib',
      decoded_size: 323,
      decoded_sha256: '329fc9176a24d64f4376d2c25d5db5b31cf86b288dac83c8a004dfe5bbfdc7d0',
      encryption_algorithm: 'none',
      encoded_sha256: '89be728e6132d4442f887657b092c3603199df71eb832881164f7d297fad2c4f',
      encoded_size: 137,
    }),
    getExpectedUpdatedArtifactBodyWhenCreateMultipleFirst: (
      firstSuffix: string,
      secondSuffix: string
    ): ArtifactBodyType => ({
      entries: [
        {
          type: 'simple',
          entries: [
            {
              field: 'process.executable',
              operator: 'included',
              type: 'exact_caseless',
              value: `c:\\randomFolder\\randomFile.exe${firstSuffix}`,
            },
          ],
        },
        {
          entries: [
            {
              field: 'process.executable',
              operator: 'included',
              type: 'exact_caseless',
              value: `c:\\randomFolder\\randomFile.exe${secondSuffix}`,
            },
          ],
          type: 'simple',
        },
      ],
    }),
    getExpectedUpdatedArtifactWhenCreateMultipleSecond: (): ArtifactElasticsearchProperties => ({
      type: 'trustlist',
      identifier: 'endpoint-trustlist-windows-v1',
      body: 'eJzNjlEKwjAQRO+y38UD5ABewhaJmxEXtknYJFIpvbtpEcEb+DnzZoZZCbGaoJC7rFRfGeSoyJwVNPywu0BDh9kSo5QTFnCr/nYEU4b5mqxziawtIHT3M4fFc72yL9Be7P7Ta9sBu3E0H0Oaz0kD7KtEse/Xh1igbdqGv7tWwCke36btDcSBc8g=',
      package_name: 'endpoint',
      created: '2000-01-01T00:00:00.000Z',
      relative_url:
        '/api/fleet/artifacts/endpoint-trustlist-windows-v1/3be2ce848f9b49d6531e6dc80f43579e00adbc640d3f785c14c8f9fa2652500a',
      compression_algorithm: 'zlib',
      decoded_size: 324,
      decoded_sha256: '3be2ce848f9b49d6531e6dc80f43579e00adbc640d3f785c14c8f9fa2652500a',
      encryption_algorithm: 'none',
      encoded_sha256: 'eb1cb904f23c233fb10a8909e40902ad69d11d0fe42759d385307a7f84bdc111',
      encoded_size: 137,
    }),
    getExpectedUpdatedArtifactBodyWhenCreateMultipleSecond: (
      firstSuffix: string,
      secondSuffix: string
    ): ArtifactBodyType => ({
      entries: [
        {
          type: 'simple',
          entries: [
            {
              field: 'process.executable',
              operator: 'included',
              type: 'exact_caseless',
              value: `c:\\randomFolder\\randomFile.exe${firstSuffix}`,
            },
          ],
        },
        {
          entries: [
            {
              field: 'process.executable',
              operator: 'included',
              type: 'exact_caseless',
              value: `c:\\randomFolder\\randomFile.exe${secondSuffix}`,
            },
          ],
          type: 'simple',
        },
      ],
    }),
  },
});
