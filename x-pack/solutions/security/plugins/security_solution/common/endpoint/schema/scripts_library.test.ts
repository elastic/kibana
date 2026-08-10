/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line import/no-nodejs-modules
import { Readable } from 'stream';
import type { CreateScriptRequestBody } from '../../api/endpoint/scripts_library';
import {
  GetOneScriptRequestSchema,
  DownloadScriptRequestSchema,
  PatchUpdateScriptRequestSchema,
  CreateScriptRequestSchema,
  DeleteScriptRequestSchema,
} from '../../api/endpoint/scripts_library';
import {
  ScriptNameSchema,
  ScriptPathToExecutableSchema,
} from '../../api/endpoint/scripts_library/common';
import type { HapiReadableStream } from '../../../server/types';
import { ListScriptsRequestSchema } from '../../api/endpoint/scripts_library/list_scripts';
import type { SortableScriptLibraryFields } from '../types';

describe('Scripts library schemas', () => {
  const createFileStream = (): HapiReadableStream => {
    const fileStream = Readable.from(['test']) as HapiReadableStream;

    fileStream.hapi = {
      filename: 'foo.txt',
      headers: {
        'content-type': 'application/text',
      },
    };

    return fileStream;
  };

  describe('Create API request schema', () => {
    let reqBody: CreateScriptRequestBody;

    beforeEach(() => {
      // NOTE: should include only a minimum set of attributes needed for the API
      // @ts-ignore pathToExecutable is conditionally required
      reqBody = {
        name: 'foo',
        platform: ['linux', 'macos', 'windows'],
        file: createFileStream(),
        fileType: 'script',
      };
    });

    describe('Required fields', () => {
      it('should accept minimal required input', () => {
        expect(CreateScriptRequestSchema.body.validate(reqBody)).toBeTruthy();
      });

      // ------------------------------------
      // Field: `name`
      // ------------------------------------
      it('should accept `name` property', () => {
        expect(CreateScriptRequestSchema.body.validateKey('name', 'foo')).toBeTruthy();
      });

      it('should error if `name` is not provided', () => {
        // @ts-expect-error
        delete reqBody.name;

        expect(() => CreateScriptRequestSchema.body.validate(reqBody)).toThrow();
      });

      it('should error if `name` is not a string', () => {
        // @ts-expect-error
        reqBody.name = [];

        expect(() => CreateScriptRequestSchema.body.validate(reqBody)).toThrow();
      });

      it('should error if `name` is an empty string', () => {
        reqBody.name = '     ';

        expect(() => CreateScriptRequestSchema.body.validate(reqBody)).toThrow(
          '[name]: Value can not be an empty string'
        );
      });

      // ------------------------------------
      // Field: `platform`
      // ------------------------------------
      it('should accept list of `platform` values', () => {
        expect(() => CreateScriptRequestSchema.body.validate(reqBody)).not.toThrow();
      });

      it('should error if `platform` is not provided', () => {
        // @ts-expect-error
        delete reqBody.platform;

        expect(() => CreateScriptRequestSchema.body.validate(reqBody)).toThrow();
      });

      it('should error if `platform` is not an array', () => {
        // @ts-expect-error
        reqBody.platform = 'foo';

        expect(() => CreateScriptRequestSchema.body.validate(reqBody)).toThrow();
      });

      it('should error if `platform` includes invalid values', () => {
        // @ts-expect-error
        reqBody.platform = ['foo'];

        expect(() => CreateScriptRequestSchema.body.validate(reqBody)).toThrow();
      });

      it('should error if `platform` includes duplicate values', () => {
        reqBody.platform = ['linux', 'linux'];

        expect(() => CreateScriptRequestSchema.body.validate(reqBody)).toThrow(
          '[platform]: Duplicate values are not allowed'
        );
      });

      // ------------------------------------
      // Field: `file`
      // ------------------------------------
      it('should accept a `file`', () => {
        expect(() => CreateScriptRequestSchema.body.validate(reqBody)).not.toThrow();
      });

      it('should error if `file` is not provided', () => {
        // @ts-expect-error
        delete reqBody.file;

        expect(() => CreateScriptRequestSchema.body.validate(reqBody)).toThrow();
      });

      it('should error if `file` is not a stream', () => {
        // @ts-expect-error
        reqBody.file = {};

        expect(() => CreateScriptRequestSchema.body.validate(reqBody)).toThrow();
      });

      it('should error if `fileType` is not provided', () => {
        // @ts-expect-error
        delete reqBody.fileType;

        expect(() => CreateScriptRequestSchema.body.validate(reqBody)).toThrow();
      });

      it('should expect `pathToExecutable` if `fileType` is "archive"', () => {
        reqBody.fileType = 'archive';

        expect(() => CreateScriptRequestSchema.body.validate(reqBody)).toThrow(
          '[pathToExecutable]: expected value of type [string] but got [undefined]'
        );
      });

      it('should not allow `pathToExecutable` if `fileType` is "script"', () => {
        reqBody.fileType = 'script';
        reqBody.pathToExecutable = 'some/path';

        expect(() => CreateScriptRequestSchema.body.validate(reqBody)).toThrow(
          "[pathToExecutable]: a value wasn't expected to be present"
        );
      });
    });

    describe('Optional fields', () => {
      // ------------------------------------
      // Field: `requiresInput`
      // ------------------------------------
      it('should accept `requiresInput` boolean', () => {
        reqBody.requiresInput = true;

        expect(() => CreateScriptRequestSchema.body.validate(reqBody)).not.toThrow();
      });

      it('should not error if `requiresInput` is missing', () => {
        delete reqBody.requiresInput;

        expect(() => CreateScriptRequestSchema.body.validate(reqBody)).not.toThrow();
      });

      it('should error is `requiresInput` is not a boolean', () => {
        // @ts-expect-error
        reqBody.requiresInput = [true];

        expect(() => CreateScriptRequestSchema.body.validate(reqBody)).toThrow();
      });

      it('should accept `tags` array with valid values', () => {
        reqBody.tags = ['dataCollection', 'threatHunting'];
        expect(() => CreateScriptRequestSchema.body.validate(reqBody)).not.toThrow();
      });

      it('should error if `tags` is not an array', () => {
        // @ts-expect-error
        reqBody.tags = 'invalid';
        expect(() => CreateScriptRequestSchema.body.validate(reqBody)).toThrow();
      });

      it('should error if `tags` contains invalid values', () => {
        reqBody.tags = ['invalid'];
        expect(() => CreateScriptRequestSchema.body.validate(reqBody)).toThrow();
      });

      it('should error if `tags` contains duplicates', () => {
        reqBody.tags = ['dataCollection', 'dataCollection'];
        expect(() => CreateScriptRequestSchema.body.validate(reqBody)).toThrow(
          '[tags]: Duplicate values are not allowed'
        );
      });

      // ------------------------------------
      // Field: `description`
      // Field: `instructions`
      // Field: `example`
      // ------------------------------------
      const optionalStringFields: Array<
        keyof Pick<CreateScriptRequestBody, 'description' | 'instructions' | 'example'>
      > = ['description', 'instructions', 'example'];

      it.each(optionalStringFields)('should accept `%s` value', (field) => {
        reqBody[field] = 'some value';

        expect(() => CreateScriptRequestSchema.body.validate(reqBody)).not.toThrow();
      });

      it.each(optionalStringFields)('should not error if `%s` is missing', (field) => {
        delete reqBody[field];

        expect(() => CreateScriptRequestSchema.body.validate(reqBody)).not.toThrow();
      });

      it.each(optionalStringFields)('should error if `%s` is not a string', (field) => {
        // @ts-expect-error
        reqBody[field] = ['some value'];

        expect(() => CreateScriptRequestSchema.body.validate(reqBody)).toThrow();
      });

      it.each(optionalStringFields)('should error if `%s` is an empty string', (field) => {
        reqBody[field] = '     ';

        expect(() => CreateScriptRequestSchema.body.validate(reqBody)).not.toThrow();
      });
    });
  });

  describe('List API request schema', () => {
    it('should accept empty query (all query params are optional)', () => {
      expect(ListScriptsRequestSchema.query.validate({})).toBeTruthy();
    });

    it('should accept a `page` param', () => {
      expect(ListScriptsRequestSchema.query.validate({ page: 1 })).toBeTruthy();
    });

    it('should error if `page` value is less than 1', () => {
      expect(() => ListScriptsRequestSchema.query.validate({ page: 0 })).toThrow();
    });

    it('should accept a `pageSize` param', () => {
      expect(ListScriptsRequestSchema.query.validate({ pageSize: 1 })).toBeTruthy();
    });

    it('should error if `pageSize` is less than 1', () => {
      expect(() => ListScriptsRequestSchema.query.validate({ pageSize: 0 })).toThrow();
    });

    it('should error if `pageSize` is greater than 1000', () => {
      expect(() => ListScriptsRequestSchema.query.validate({ pageSize: 1001 })).toThrow();
    });

    const sortFields: Array<SortableScriptLibraryFields> = [
      'name',
      'createdAt',
      'createdBy',
      'updatedAt',
      'updatedBy',
      'fileSize',
    ];
    it.each(sortFields)('should accept a `sortField` param with value %s', (sortField) => {
      expect(ListScriptsRequestSchema.query.validate({ sortField })).toBeTruthy();
    });

    it('should error `sortField` has an invalid field name', () => {
      expect(() => ListScriptsRequestSchema.query.validate({ sortField: 'foo' })).toThrow();
    });

    it.each(['asc', 'desc'])(
      'should accept a `sortDirection` param with value of %s',
      (sortDirection) => {
        expect(ListScriptsRequestSchema.query.validate({ sortDirection })).toBeTruthy();
      }
    );

    it('should error if `sortDirection` has invalid value', () => {
      expect(() => ListScriptsRequestSchema.query.validate({ sortDirection: 'foo' })).toThrow();
    });

    it('should accept a `kuery` param', () => {
      expect(ListScriptsRequestSchema.query.validate({ kuery: 'name:foo' })).toBeTruthy();
    });

    it('should error if `kuery` is longer than 30000 characters', () => {
      expect(() => ListScriptsRequestSchema.query.validate({ kuery: 'a'.repeat(30001) })).toThrow();
    });

    it('should accept `kuery` exactly 30000 characters long', () => {
      expect(ListScriptsRequestSchema.query.validate({ kuery: 'a'.repeat(30000) })).toBeTruthy();
    });

    it('should error if `kuery` uses invalid fields', () => {
      expect(() => ListScriptsRequestSchema.query.validate({ kuery: 'foo:bar' })).toThrow(
        '[kuery]: Invalid KQL filter field: foo'
      );
    });
  });

  describe('Patch Update API request schema', () => {
    // NOTE:
    // The definition of the individual fields accepted by the Update API
    // are shared with the `create` API, thus they are already tested/covered
    // with those tests above.

    it('should accept full payload', () => {
      expect(
        PatchUpdateScriptRequestSchema.body.validate({
          name: 'foo',
          platform: ['linux'],
          requiresInput: true,
          description: 'some description',
          instructions: 'some instructions',
          example: 'some example',
          fileType: 'script',
          file: createFileStream(),
          version: 'someVersionString',
        })
      ).toBeTruthy();
    });

    it.each([
      { field: 'description', value: '' },
      { field: 'instructions', value: '' },
      { field: 'example', value: '' },
      { field: 'tags', value: [] },
    ])('should accept `$field` field with `$value` value', ({ field, value }) => {
      expect(
        PatchUpdateScriptRequestSchema.body.validate({
          [field]: value,
        })
      ).toBeTruthy();
    });

    it.each`
      title              | bodyPayload
      ----------             -------------
      ${'name'}          | ${{ name: 'foo' }}
      ${'platform'}      | ${{ platform: ['windows'] }}
      ${'tags'}          | ${{ tags: ['dataCollection'] }}
      ${'file'}          | ${{ file: createFileStream() }}
      ${'requiresInput'} | ${{ requiresInput: true }}
      ${'description'}   | ${{ description: 'some description' }}
      ${'instructions'}  | ${{ instructions: 'some instruction' }}
      ${'example'}       | ${{ example: 'some example' }}
    `('should accept partial updates with only `$title`', ({ bodyPayload }) => {
      expect(PatchUpdateScriptRequestSchema.body.validate(bodyPayload)).toBeTruthy();
    });

    it('should error if no updates are provided', () => {
      expect(() => PatchUpdateScriptRequestSchema.body.validate({})).toThrow(
        'At least one field must be defined for update'
      );
    });

    it('should error if only `version` is provided', () => {
      expect(() => PatchUpdateScriptRequestSchema.body.validate({ version: 'fdfd' })).toThrow(
        'At least one field must be defined for update'
      );
    });

    it('should not allow `pathToExecutable` if `fileType` is "script"', () => {
      expect(() =>
        PatchUpdateScriptRequestSchema.body.validate({
          fileType: 'script',
          pathToExecutable: 'some/path',
        })
      ).toThrow("[pathToExecutable]: a value wasn't expected to be present");
    });

    it('should expect `pathToExecutable` if `fileType` is "archive"', () => {
      expect(() => PatchUpdateScriptRequestSchema.body.validate({ fileType: 'archive' })).toThrow(
        '[pathToExecutable]: expected value of type [string] but got [undefined]'
      );
    });
  });

  describe('Download API', () => {
    it('should accept a script_id URL param', () => {
      expect(DownloadScriptRequestSchema.params.validate({ script_id: 'foo' })).toBeTruthy();
    });
  });

  describe('Get one API', () => {
    it('should accept a script_id URL param', () => {
      expect(GetOneScriptRequestSchema.params.validate({ script_id: 'foo' })).toBeTruthy();
    });
  });

  describe('Bounds enforcement (maxLength)', () => {
    const str = (len: number) => 'a'.repeat(len);

    describe('ScriptNameSchema', () => {
      it('should accept a name at the 256-char limit', () => {
        expect(() => ScriptNameSchema.validate(str(256))).not.toThrow();
      });

      it('should reject a name exceeding 256 chars', () => {
        expect(() => ScriptNameSchema.validate(str(257))).toThrow();
      });
    });

    describe('ScriptPathToExecutableSchema', () => {
      it('should accept a path at the 4096-char limit', () => {
        expect(() => ScriptPathToExecutableSchema.validate(str(4096))).not.toThrow();
      });

      it('should reject a path exceeding 4096 chars', () => {
        expect(() => ScriptPathToExecutableSchema.validate(str(4097))).toThrow();
      });
    });

    describe('Create API free-text fields', () => {
      it.each(['description', 'instructions', 'example'] as const)(
        'should accept `%s` at the 10000-char limit',
        (field) => {
          expect(() =>
            CreateScriptRequestSchema.body.validate({
              name: 'foo',
              platform: ['linux'],
              file: createFileStream(),
              fileType: 'script',
              [field]: str(10000),
            })
          ).not.toThrow();
        }
      );

      it.each(['description', 'instructions', 'example'] as const)(
        'should reject `%s` exceeding 10000 chars',
        (field) => {
          expect(() =>
            CreateScriptRequestSchema.body.validate({
              name: 'foo',
              platform: ['linux'],
              file: createFileStream(),
              fileType: 'script',
              [field]: str(10001),
            })
          ).toThrow();
        }
      );
    });

    describe('Update API bounds', () => {
      it('should accept `version` at the 256-char limit', () => {
        expect(() =>
          PatchUpdateScriptRequestSchema.body.validate({ version: str(256), description: 'x' })
        ).not.toThrow();
      });

      it('should reject `version` exceeding 256 chars', () => {
        expect(() =>
          PatchUpdateScriptRequestSchema.body.validate({ version: str(257), description: 'x' })
        ).toThrow();
      });

      it.each(['description', 'instructions', 'example'] as const)(
        'should reject `%s` exceeding 10000 chars',
        (field) => {
          expect(() =>
            PatchUpdateScriptRequestSchema.body.validate({ [field]: str(10001) })
          ).toThrow();
        }
      );

      it('should reject `script_id` param exceeding 256 chars', () => {
        expect(() =>
          PatchUpdateScriptRequestSchema.params.validate({ script_id: str(257) })
        ).toThrow();
      });

      it('should accept `script_id` param at the 256-char limit', () => {
        expect(() =>
          PatchUpdateScriptRequestSchema.params.validate({ script_id: str(256) })
        ).not.toThrow();
      });
    });

    describe('script_id param bounds (get/delete/download)', () => {
      it('should accept script_id at 256 chars for GetOne', () => {
        expect(() =>
          GetOneScriptRequestSchema.params.validate({ script_id: str(256) })
        ).not.toThrow();
      });

      it('should reject script_id over 256 chars for GetOne', () => {
        expect(() => GetOneScriptRequestSchema.params.validate({ script_id: str(257) })).toThrow();
      });

      it('should accept script_id at 256 chars for Delete', () => {
        expect(() =>
          DeleteScriptRequestSchema.params.validate({ script_id: str(256) })
        ).not.toThrow();
      });

      it('should reject script_id over 256 chars for Delete', () => {
        expect(() => DeleteScriptRequestSchema.params.validate({ script_id: str(257) })).toThrow();
      });

      it('should accept script_id at 256 chars for Download', () => {
        expect(() =>
          DownloadScriptRequestSchema.params.validate({ script_id: str(256) })
        ).not.toThrow();
      });

      it('should reject script_id over 256 chars for Download', () => {
        expect(() =>
          DownloadScriptRequestSchema.params.validate({ script_id: str(257) })
        ).toThrow();
      });
    });
  });
});
