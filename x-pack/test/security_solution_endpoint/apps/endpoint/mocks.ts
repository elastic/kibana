/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ArtifactElasticsearchProperties } from '@kbn/fleet-plugin/server/services/artifacts/types';
import { TranslatedExceptionListItem } from '@kbn/security-solution-plugin/server/endpoint/schemas/artifacts/lists';

export interface ArtifactResponseType {
  _index: string;
  _id: string;
  _score: number;
  _source: ArtifactElasticsearchProperties;
}

export interface ArtifactBodyType {
  entries: TranslatedExceptionListItem[];
}

export const getArtifactsListTestsData = () => [
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
      getExpectedUpdatedtArtifactWhenCreate: (): ArtifactResponseType => ({
        _index: '.fleet-artifacts-7',
        _id: 'endpoint:endpoint-blocklist-windows-v1-d2b12779ee542a6c4742d505cd0c684b0f55436a97074c62e7de7155344c74bc',
        _score: 0,
        _source: {
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
        },
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
      getExpectedUpdatedArtifactWhenUpdate: (): ArtifactResponseType => ({
        _index: '.fleet-artifacts-7',
        _id: 'endpoint:endpoint-blocklist-windows-v1-2df413b3c01b54be7e9106e92c39297ca72d32bcd626c3f7eb7d395db8e905fe',
        _score: 0,
        _source: {
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
        },
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
      getExpectedUpdatedtArtifactWhenCreate: (): ArtifactResponseType => ({
        _index: '.fleet-artifacts-7',
        _id: 'endpoint:endpoint-hostisolationexceptionlist-windows-v1-2c3ee2b5e7f86f8c336a3df7e59a1151b11d7eec382442032e69712d6a6459e0',
        _score: 0,
        _source: {
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
        },
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
      getExpectedUpdatedArtifactWhenUpdate: (): ArtifactResponseType => ({
        _index: '.fleet-artifacts-7',
        _id: 'endpoint:endpoint-hostisolationexceptionlist-windows-v1-4b62473b4cf057277b3297896771cc1061c3bea2c4f7ec1ef5c2546f33d5d9e8',
        _score: 0,
        _source: {
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
        },
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
