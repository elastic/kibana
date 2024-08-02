/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FullAgentPolicy } from '@kbn/fleet-plugin/common/types';
import { ArtifactElasticsearchProperties } from '@kbn/fleet-plugin/server/services/artifacts/types';
import { InternalUnifiedManifestBaseSchema } from '@kbn/security-solution-plugin/server/endpoint/schemas/artifacts';
import { TranslatedExceptionListItem } from '@kbn/security-solution-plugin/server/endpoint/schemas/artifacts/lists';

export interface AgentPolicyResponseType {
  _index: string;
  _id: string;
  _score: number;
  _source: { data: FullAgentPolicy };
}

export interface InternalUnifiedManifestSchemaResponseType {
  _index: string;
  _id: string;
  _score: number;
  _source: {
    'endpoint:unified-user-artifact-manifest': InternalUnifiedManifestBaseSchema;
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
        body: 'eJxVzNEKgyAUgOF3OdcxNMvMVxkxTp4jCa5EbWxE7z422MVuvx/+A3itOXABez2gvhKDhRLuKTI0f80HjgQWUt4cl3JZsCyXsmDba2hgS5yxbhkshNXFnZig+f34ia7eHJYvPjDuH8VODcIJ543URjsx61F71K2WbiTFgowUyIPocDZKSKNG8p566qVsfTdoOKdzOt89hz0Q',
        package_name: 'endpoint',
        created: '2000-01-01T00:00:00.000Z',
        relative_url:
          '/api/fleet/artifacts/endpoint-trustlist-windows-v1/016bec11c5b1d6f8609fd3525202aa12baf0132484abf368d5011100d5ec1ec4',
        compression_algorithm: 'zlib',
        decoded_size: 193,
        decoded_sha256: '016bec11c5b1d6f8609fd3525202aa12baf0132484abf368d5011100d5ec1ec4',
        encryption_algorithm: 'none',
        encoded_sha256: '814aabc04d674ccdeb7c1acfe74120cb52ad1392d6924a7d813e08f8b6cd0f0f',
        encoded_size: 153,
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
        body: 'eJx9jEEKwjAUBa8ibx1cuMwBvIQtEpMnBH6TkJ9KpeTuEkHBjcthhtnB1Gqkwl52tGchLDQuRQjz4+6REmBRavZUPXKjX5u7vcNcWF3LFRYxeVkDA8xnx835dvVOKVSFwcPJOoS301RdCnk5ZwmsX4rC8TeHf8VpJOhzn/sLJpZG8A==',
        package_name: 'endpoint',
        created: '2000-01-01T00:00:00.000Z',
        relative_url:
          '/api/fleet/artifacts/endpoint-trustlist-windows-v1/ac2bf74a73885f9a5a1700c328bf1a5a8f6cb72f2465a575335ea99dac0d4c10',
        compression_algorithm: 'zlib',
        decoded_size: 198,
        decoded_sha256: 'ac2bf74a73885f9a5a1700c328bf1a5a8f6cb72f2465a575335ea99dac0d4c10',
        encryption_algorithm: 'none',
        encoded_sha256: '28d81b2787cea23fcb88d02b1c09940858963a62c60cdfd7a2b7564cfc251708',
        encoded_size: 130,
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
        body: 'eJxVzFEKwjAQRdG9vO/iArKVUsqQPHVgmoRkWpSSvYvFH3/PhXuC2ZuyI8wn/F2JgK5bNWL6a3elJQTIg9lvrE9ubGKrJkwolU28NARojrYnfvW340uir1H6hYfYfmlOtWh2jGUs4wOrCC+X',
        package_name: 'endpoint',
        created: '2000-01-01T00:00:00.000Z',
        relative_url:
          '/api/fleet/artifacts/endpoint-eventfilterlist-windows-v1/b3373c93ffc795d954f22c625c084dc5874a156ec0cb3d4af1c3dab0b965fa30',
        compression_algorithm: 'zlib',
        decoded_size: 136,
        decoded_sha256: 'b3373c93ffc795d954f22c625c084dc5874a156ec0cb3d4af1c3dab0b965fa30',
        encryption_algorithm: 'none',
        encoded_sha256: 'cc9bc4e3cc2c2767c3f56b17ebf4901dbe7e82f15720d48c745370e028c5e887',
        encoded_size: 108,
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
        body: 'eJxVzEEKwyAURdGtyBuHLsCtlFA++hoEa+T7LQnBvZc0nXR6LtwDLKaJDf5+wPZKeLT0qpmY/tozMUd4yMJitxQxYa1UsVXhkUrIPfLU34SbBHsEaV98S+6nGpu51ivVZdGF7gpjHvP4ADqUMJs=',
        package_name: 'endpoint',
        created: '2000-01-01T00:00:00.000Z',
        relative_url:
          '/api/fleet/artifacts/endpoint-eventfilterlist-windows-v1/e4f00c88380d2c429eeb2741ad19383b94d76f79744b098b095befc24003e158',
        compression_algorithm: 'zlib',
        decoded_size: 140,
        decoded_sha256: 'e4f00c88380d2c429eeb2741ad19383b94d76f79744b098b095befc24003e158',
        encryption_algorithm: 'none',
        encoded_sha256: 'e371e2a28b59bd942ca7ef9665dae7c9b27409ad6f2ca3bff6357a98deb23c12',
        encoded_size: 110,
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
        body: 'eJylzk1qw0AMQOG7aG3C/GpmfJVggkbSYIPjmNgpDcF3LxS66LLN+sHje4Eu+33SDfrzC/bnqtDDNl3XWaH71dqks0APbZr1NNI2nq4SoYPbqnfab3foYVp4fogKdD8n/STeL0ybyoWWJ3TwQfNDoT9DCjagoxq8Jeec95xyqkS1VIyeEwzHcHR/NW0j2TdQpFJdKupTrirITqrnIlzUukroo5rqi+V/41zEd3jBJ8OGW7aYkU3Fgo3QoeUiXo1ka0iTCVSzNzb7Iq1JlGitayHhN3s4vgDTjqDt',
        encryption_algorithm: 'none',
        package_name: 'endpoint',
        encoded_size: 219,
        encoded_sha256: 'e803c1ee6aec0885092bfd6c288839f42b31107dd6d0bb2c8e2d2b9f8fc8b293',
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
        body: 'eJx9jUEKwjAURK8isw4uXOYAXqKV8kmmGPhNQpJKS/HuEkHBjcxqmMebA4ytBFbY4UDbM2FRw5KVMD/bHKgeFnNQnrO0OwxSZpGWCixCdLp6epiPhZu4NjmpVNY6Sdxh8BBdCTvA2XEsEn1arkk9y7d1Pbf+fvrHXN7Q7dnzAojqRb8=',
        encryption_algorithm: 'none',
        package_name: 'endpoint',
        encoded_size: 131,
        encoded_sha256: 'f0e2dc2aa8d968b704baa11bf3100db91a85991d5de431f8c389b7417335a701',
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
        body: 'eJxVjEEKgzAUBe/y1kFwm6uIyCd5hQ9pEpKvWCR3LxVclNnNwFxgtqbs8MsF+1TCo+u7JsL9tZcyRXhEdtMspiVPWuFQKptYafDQHNIeGeGeFU8JtgXptzwk7T87TzcY61jHF647LBE=',
        encryption_algorithm: 'none',
        package_name: 'endpoint',
        encoded_size: 104,
        encoded_sha256: 'f958ada742a0be63d136901317c6bfd04b2ab5f52cdd0e872461089b0009bb3e',
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
        body: 'eJxVjEEKwyAUBe/y1pJC6MqrlBA++gofrIr+hJbg3UsCXZTZzcAcYLam7PCPA/aphEfXV02E+2tPZYrwiOymWUxLnrTCoVQ2sdLgoTmkLTLC/VZ8S7A1SL/kLmk77Txd3OY7xjKW8QUwWyyq',
        encryption_algorithm: 'none',
        package_name: 'endpoint',
        encoded_size: 108,
        encoded_sha256: '84df618343078f43a54299bcebef03010f3ec4ffdf7160448882fee9bafa1adb',
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
      body: 'eJzNjlEKwjAQBe+y38ED5ABewhaJySsubJuwu5VK6d0lgoI38PMxj2F2wuLKMIqXnfzZQJGM5yag8MMmhhSK1LRmmJ2wIa+ebu9jbdDkVSkSL1nWgkLho8OWsl9zMgjMKNAjydpBjsOgaSl1Plcp0O9iQff7nbXQMR7h79ImVvOeNh4vUR5zdA==',
      package_name: 'endpoint',
      created: '2000-01-01T00:00:00.000Z',
      relative_url:
        '/api/fleet/artifacts/endpoint-trustlist-windows-v1/329fc9176a24d64f4376d2c25d5db5b31cf86b288dac83c8a004dfe5bbfdc7d0',
      compression_algorithm: 'zlib',
      decoded_size: 323,
      decoded_sha256: '329fc9176a24d64f4376d2c25d5db5b31cf86b288dac83c8a004dfe5bbfdc7d0',
      encryption_algorithm: 'none',
      encoded_sha256: '4d9eecb830948eabd721563fd2473900207d043126e66eac2ef78f9e05a80adb',
      encoded_size: 136,
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
      body: 'eJzNjlEKwjAQRO8y38ED5ABewhaJyYiBbRJ2U6mU3l1aUPAGfg5veLwVLF0zDf6yor8a4WF5akK4H3bPlASPpjXS7MSFce7hdhxro4ZeFR65RJkTE9xHxyXEfo3BKDSDwzPIvIPoh0FDSXU6V0nU78rC3d8fWRO2cXN/l2aMtRxt4/YGxIFzyA==',
      package_name: 'endpoint',
      created: '2000-01-01T00:00:00.000Z',
      relative_url:
        '/api/fleet/artifacts/endpoint-trustlist-windows-v1/3be2ce848f9b49d6531e6dc80f43579e00adbc640d3f785c14c8f9fa2652500a',
      compression_algorithm: 'zlib',
      decoded_size: 324,
      decoded_sha256: '3be2ce848f9b49d6531e6dc80f43579e00adbc640d3f785c14c8f9fa2652500a',
      encryption_algorithm: 'none',
      encoded_sha256: '68304c35bbe863d0fbb15cf7e5ae5c84bad17aa7a3bc26828f9f0b20e0df6ed8',
      encoded_size: 136,
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
