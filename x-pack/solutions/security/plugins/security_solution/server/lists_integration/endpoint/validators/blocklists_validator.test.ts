/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { CreateExceptionListItemOptions } from '@kbn/lists-plugin/server';
import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';
import { OperatingSystem } from '@kbn/securitysolution-utils';
import { BlocklistValidator } from './blocklist_validator';
import { createMockEndpointAppContextService } from '../../../endpoint/mocks';
import { GLOBAL_ARTIFACT_TAG } from '../../../../common/endpoint/service/artifacts/constants';
import { EndpointArtifactExceptionValidationError } from './errors';

describe('Blocklists API validations', () => {
  it('should initialize', () => {
    expect(
      new BlocklistValidator(
        createMockEndpointAppContextService(),
        httpServerMock.createKibanaRequest()
      )
    ).not.toBeUndefined();
  });

  describe('entry value length bounds', () => {
    let validator: BlocklistValidator;

    beforeEach(() => {
      validator = new BlocklistValidator(
        createMockEndpointAppContextService(),
        httpServerMock.createKibanaRequest()
      );
    });

    const buildItem = (
      entries: CreateExceptionListItemOptions['entries'],
      osTypes: string[] = ['windows']
    ): CreateExceptionListItemOptions =>
      ({
        listId: ENDPOINT_ARTIFACT_LISTS.blocklists.id,
        name: 'Test blocklist',
        description: '',
        namespaceType: 'agnostic',
        osTypes,
        tags: [GLOBAL_ARTIFACT_TAG],
        entries,
      } as unknown as CreateExceptionListItemOptions);

    const filePathEntry = (value: string[]): CreateExceptionListItemOptions['entries'] => [
      { field: 'file.path', type: 'match_any', operator: 'included', value },
    ];

    const hashEntry = (value: string[]): CreateExceptionListItemOptions['entries'] => [
      { field: 'file.hash.sha256', type: 'match_any', operator: 'included', value },
    ];

    const signerEntry = (value: string[]): CreateExceptionListItemOptions['entries'] => [
      {
        field: 'file.Ext.code_signature',
        type: 'nested',
        entries: [{ field: 'subject_name', type: 'match_any', operator: 'included', value }],
      },
    ];

    const signerMatchEntry = (value: string): CreateExceptionListItemOptions['entries'] => [
      {
        field: 'file.Ext.code_signature',
        type: 'nested',
        entries: [{ field: 'subject_name', type: 'match', operator: 'included', value }],
      },
    ];

    it('accepts a file path value at the 4096 character limit', async () => {
      await expect(
        validator.validatePreCreateItem(buildItem(filePathEntry(['a'.repeat(4096)])))
      ).resolves.toBeDefined();
    });

    it('rejects a file path value over the 4096 character limit', async () => {
      await expect(
        validator.validatePreCreateItem(buildItem(filePathEntry(['a'.repeat(4097)])))
      ).rejects.toThrow(EndpointArtifactExceptionValidationError);
      await expect(
        validator.validatePreCreateItem(buildItem(filePathEntry(['a'.repeat(4097)])))
      ).rejects.toThrow(/maximum length of \[4096\]/);
    });

    it('accepts a valid hash value', async () => {
      await expect(
        validator.validatePreCreateItem(buildItem(hashEntry(['a'.repeat(64)])))
      ).resolves.toBeDefined();
    });

    it('rejects a hash value over the 4096 character limit', async () => {
      await expect(
        validator.validatePreCreateItem(buildItem(hashEntry(['a'.repeat(4097)])))
      ).rejects.toThrow(EndpointArtifactExceptionValidationError);
      await expect(
        validator.validatePreCreateItem(buildItem(hashEntry(['a'.repeat(4097)])))
      ).rejects.toThrow(/maximum length of \[4096\]/);
    });

    it('accepts a signer subject_name match_any value at the 4096 character limit', async () => {
      await expect(
        validator.validatePreCreateItem(buildItem(signerEntry(['a'.repeat(4096)])))
      ).resolves.toBeDefined();
    });

    it('rejects a signer subject_name match_any value over the 4096 character limit', async () => {
      await expect(
        validator.validatePreCreateItem(buildItem(signerEntry(['a'.repeat(4097)])))
      ).rejects.toThrow(EndpointArtifactExceptionValidationError);
      await expect(
        validator.validatePreCreateItem(buildItem(signerEntry(['a'.repeat(4097)])))
      ).rejects.toThrow(/maximum length of \[4096\]/);
    });

    it('accepts a signer subject_name match value at the 4096 character limit', async () => {
      await expect(
        validator.validatePreCreateItem(buildItem(signerMatchEntry('a'.repeat(4096))))
      ).resolves.toBeDefined();
    });

    it('rejects a signer subject_name match value over the 4096 character limit', async () => {
      await expect(
        validator.validatePreCreateItem(buildItem(signerMatchEntry('a'.repeat(4097))))
      ).rejects.toThrow(EndpointArtifactExceptionValidationError);
      await expect(
        validator.validatePreCreateItem(buildItem(signerMatchEntry('a'.repeat(4097))))
      ).rejects.toThrow(/maximum length of \[4096\]/);
    });

    const hashEntries = (count: number): CreateExceptionListItemOptions['entries'] =>
      Array.from({ length: count }, () => ({
        field: 'file.hash.sha256',
        type: 'match_any',
        operator: 'included',
        value: ['a'.repeat(64)],
      }));

    it.each([OperatingSystem.WINDOWS, OperatingSystem.LINUX, OperatingSystem.MAC])(
      'rejects more than 250 hash entries for %s',
      async (os) => {
        await expect(
          validator.validatePreCreateItem(buildItem(hashEntries(251), [os]))
        ).rejects.toThrow('array size is [251], but cannot be greater than [250]');
      }
    );

    it.each([OperatingSystem.WINDOWS, OperatingSystem.LINUX, OperatingSystem.MAC])(
      'rejects more than one non-hash entry for %s',
      async (os) => {
        const entries: CreateExceptionListItemOptions['entries'] = [
          ...filePathEntry(['C:\\Program Files\\app-one.exe']),
          ...filePathEntry(['C:\\Program Files\\app-two.exe']),
        ];

        await expect(validator.validatePreCreateItem(buildItem(entries, [os]))).rejects.toThrow(
          'Only one entry is allowed when not using hash field type'
        );
      }
    );
  });

  describe('file.name field and wildcard (Match) operator', () => {
    let validator: BlocklistValidator;

    beforeEach(() => {
      validator = new BlocklistValidator(
        createMockEndpointAppContextService(),
        httpServerMock.createKibanaRequest()
      );
    });

    const buildItem = (
      entries: CreateExceptionListItemOptions['entries'],
      osTypes: CreateExceptionListItemOptions['osTypes'] = ['windows']
    ): CreateExceptionListItemOptions =>
      ({
        listId: ENDPOINT_ARTIFACT_LISTS.blocklists.id,
        name: 'Test blocklist',
        description: '',
        namespaceType: 'agnostic',
        osTypes,
        tags: [GLOBAL_ARTIFACT_TAG],
        entries,
      } as unknown as CreateExceptionListItemOptions);

    const fileNameMatchAnyEntry = (value: string[]): CreateExceptionListItemOptions['entries'] => [
      { field: 'file.name', type: 'match_any', operator: 'included', value },
    ];

    const wildcardEntry = (
      field: 'file.path' | 'file.path.caseless' | 'file.name' | 'file.name.caseless',
      value: string
    ): CreateExceptionListItemOptions['entries'] => [
      { field, type: 'wildcard', operator: 'included', value },
    ];

    it.each([['windows'], ['linux'], ['macos']] as const)(
      'accepts a file.name match_any entry on %s',
      async (os) => {
        await expect(
          validator.validatePreCreateItem(buildItem(fileNameMatchAnyEntry(['notepad.exe']), [os]))
        ).resolves.toBeDefined();
      }
    );

    it.each([
      ['file.path'],
      ['file.path.caseless'],
      ['file.name'],
      ['file.name.caseless'],
    ] as const)('accepts a wildcard (Match) entry for field %s', async (field) => {
      await expect(
        validator.validatePreCreateItem(buildItem(wildcardEntry(field, 'C:\\foo\\*.exe')))
      ).resolves.toBeDefined();
    });

    it('rejects a wildcard entry over the 4096 character limit', async () => {
      await expect(
        validator.validatePreCreateItem(buildItem(wildcardEntry('file.name', 'a'.repeat(4097))))
      ).rejects.toThrow(EndpointArtifactExceptionValidationError);
    });

    it('rejects a wildcard type for the hash field', async () => {
      await expect(
        validator.validatePreCreateItem(
          buildItem([
            { field: 'file.hash.sha256', type: 'wildcard', operator: 'included', value: '*' },
          ] as unknown as CreateExceptionListItemOptions['entries'])
        )
      ).rejects.toThrow(EndpointArtifactExceptionValidationError);
    });

    it('rejects an array value for a wildcard entry', async () => {
      await expect(
        validator.validatePreCreateItem(
          buildItem([
            {
              field: 'file.name',
              type: 'wildcard',
              operator: 'included',
              value: ['a.exe', 'b.exe'],
            },
          ] as unknown as CreateExceptionListItemOptions['entries'])
        )
      ).rejects.toThrow(EndpointArtifactExceptionValidationError);
    });
  });

  // -----------------------------------------------------------------------------
  //
  //  API TESTS FOR THIS ARTIFACT TYPE SHOULD BE COVERED WITH INTEGRATION TESTS.
  //  ADD THEM HERE:
  //
  //  `x-pack/solutions/security/test/security_solution_api_integration/test_suites/edr_workflows`
  //
  // -----------------------------------------------------------------------------
});
