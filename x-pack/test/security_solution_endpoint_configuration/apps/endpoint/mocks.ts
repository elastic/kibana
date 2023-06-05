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
          selector: 'button[title="agent.type"]',
        },
        {
          type: 'click',
          selector: 'valuesAutocompleteMatch',
        },
        {
          type: 'customClick',
          selector: 'button[title="endpoint"]',
        },
      ],
      checkResults: [
        {
          selector: 'EventFiltersListPage-card-criteriaConditions-condition',
          value: 'AND agent.typeIS endpoint',
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
          type: 'customClick',
          selector: 'button[title="agent.name"]',
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
          value: 'AND agent.nameIS test super large value',
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
      waitForValue: 'AND agent.nameIS test super large value',
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
        body: 'eJxVzFEKgCAQBNC77Ld0AK8SEYtusWAqukYh3b1F+on5ezNMB4pSmCrYuYPcmcBC5SMHAvPrNqbgtcRddRpLAylTQUlFnaMLzZNX/W7oQierwzrwxNCGRp8TR4Fn0bwiRSx6',
        package_name: 'endpoint',
        created: '2000-01-01T00:00:00.000Z',
        relative_url:
          '/api/fleet/artifacts/endpoint-eventfilterlist-windows-v1/54e692d3d896a72ba8b0ccc1e174d9c24d43e427ea88a42ddba8ec0839a37fec',
        compression_algorithm: 'zlib',
        decoded_size: 128,
        decoded_sha256: '54e692d3d896a72ba8b0ccc1e174d9c24d43e427ea88a42ddba8ec0839a37fec',
        encryption_algorithm: 'none',
        encoded_sha256: '3f3f689efc895ada36b232b71d63f93b9b9552f84d395689f828429017016b46',
        encoded_size: 99,
      }),
      getExpectedUpdatedArtifactBodyWhenCreate: (): ArtifactBodyType => ({
        entries: [
          {
            type: 'simple',
            entries: [
              {
                field: 'agent.type',
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
        body: 'eJxVjFEKgzAQRK8S9rt4AK8ipSzJKIE1huxGWsS7u9L+lPl7b2YOQrGWoTROB9mngkbSvFYBPf7cnCHJJS9Oh8LrXdgqGtvWnOcSpSckp78bvDnaK7JCoOp8Z+m3MKgF7b4Nwm1B+Irz6bkASPAywg==',
        package_name: 'endpoint',
        created: '2000-01-01T00:00:00.000Z',
        relative_url:
          '/api/fleet/artifacts/endpoint-eventfilterlist-windows-v1/49b7181f97ea4c92dd8457cabb6d67bde7e05d02a7f41ce8ae40ff2e5819e098',
        compression_algorithm: 'zlib',
        decoded_size: 145,
        decoded_sha256: '49b7181f97ea4c92dd8457cabb6d67bde7e05d02a7f41ce8ae40ff2e5819e098',
        encryption_algorithm: 'none',
        encoded_sha256: 'f852031403be242a4190b9c5ea2726706877bb0d45fe9b21f8b297ed11ab1d7c',
        encoded_size: 112,
      }),
      getExpectedUpdatedArtifactBodyWhenUpdate: (): ArtifactBodyType => ({
        entries: [
          {
            type: 'simple',
            entries: [
              {
                field: 'agent.name',
                operator: 'included',
                type: 'exact_caseless',
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
            'OSIS Windows\nAND file.hash.*IS ONE OF\nA4370C0CF81686C0B696FA6261c9d3e0d810ae704ab8301839dffd5d5112f476',
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
          selector: 'blocklist-form-file.path',
        },
        {
          type: 'clear',
          selector:
            'blocklist-form-values-input-A4370C0CF81686C0B696FA6261c9d3e0d810ae704ab8301839dffd5d5112f476',
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
            'OSIS Windows\nAND file.pathIS ONE OF\nc:\\randomFolder\\randomFile.exe\nc:\\randomFolder\\randomFile2.exe',
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
        'OSIS Windows\nAND file.pathIS ONE OF\nc:\\randomFolder\\randomFile.exe\nc:\\randomFolder\\randomFile2.exe',
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
          '/api/fleet/artifacts/endpoint-blocklist-windows-v1/d2b12779ee542a6c4742d505cd0c684b0f55436a97074c62e7de7155344c74bc',
        body: 'eJxVzEEKgzAUBNC7ZF0kMRqjOyt4CSnym/+DgVTFxFKR3r0pdFNmN2+Yk9EcN0eBNcPJ4rESa1hwj9UTu/yZdeQxoXWesgnClIUJ8lKl2bLSBnHZkrrZ+B0JU/s7oxeYOBoIhCPMR4In+D3JwNpCVrzjXa+F0qrjV1WrvlW5EqZGSRy14EAVL+CuJRda1mgtllgKkduiUuz2/uYDrE49EA==',
        encryption_algorithm: 'none',
        package_name: 'endpoint',
        encoded_size: 160,
        encoded_sha256: '8620957e33599029c5f96fa689e0df2206960f582130ccdea64f22403fc05e50',
        decoded_size: 196,
        decoded_sha256: 'd2b12779ee542a6c4742d505cd0c684b0f55436a97074c62e7de7155344c74bc',
        compression_algorithm: 'zlib',
        created: '2000-01-01T00:00:00.000Z',
      }),
      getExpectedUpdatedArtifactBodyWhenCreate: (): ArtifactBodyType => ({
        entries: [
          {
            type: 'simple',
            entries: [
              {
                field: 'file.hash.sha256',
                operator: 'included',
                type: 'exact_cased_any',
                value: ['A4370C0CF81686C0B696FA6261c9d3e0d810ae704ab8301839dffd5d5112f476'],
              },
            ],
          },
        ],
      }),
      getExpectedUpdatedArtifactWhenUpdate: (): ArtifactElasticsearchProperties => ({
        type: 'blocklist',
        identifier: 'endpoint-blocklist-windows-v1',
        relative_url:
          '/api/fleet/artifacts/endpoint-blocklist-windows-v1/2df413b3c01b54be7e9106e92c39297ca72d32bcd626c3f7eb7d395db8e905fe',
        body: 'eJx9jcEKwjAQRH9F9iwePOYD/IlWypKdYmCbhCSVltJ/dysieJE5zbxhZiPEVgIquW6jtmaQoxqmrKDzDxsDVAyOQXHJ3B7GU0bhlorFIXqdBWLpZwUL+zZ4rpCB42rgyTob6ci7vi8cJU23pILydcc2luP69K9zfZfu+6EXorpEbA==',
        encryption_algorithm: 'none',
        package_name: 'endpoint',
        encoded_size: 130,
        encoded_sha256: '3fb42b56c16ef38f8ecb62c082a7f3dddf4a52998a83c97d16688e854e15a502',
        decoded_size: 194,
        decoded_sha256: '2df413b3c01b54be7e9106e92c39297ca72d32bcd626c3f7eb7d395db8e905fe',
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
                type: 'exact_cased_any',
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
