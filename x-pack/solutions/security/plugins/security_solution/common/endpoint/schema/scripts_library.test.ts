/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line import/no-nodejs-modules
import { Readable } from 'stream';
import type { CreateScriptRequestBody } from '../../api/endpoint/scripts_library';
import { CreateScriptRequestSchema } from '../../api/endpoint/scripts_library';
import type { HapiReadableStream } from '../../../server/types';

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
      reqBody = {
        name: 'foo',
        platform: ['linux', 'macos', 'windows'],
        file: createFileStream(),
      };
    });

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

    // ------------------------------------
    // Field: `description`
    // Field: `instructions`
    // Field: `example`
    // Field: `executable`
    // ------------------------------------
    const optionalStringFields: Array<
      keyof Pick<
        CreateScriptRequestBody,
        'description' | 'instructions' | 'example' | 'pathToExecutable'
      >
    > = ['description', 'instructions', 'example', 'pathToExecutable'];

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

      expect(() => CreateScriptRequestSchema.body.validate(reqBody)).toThrow(
        `[${field}]: Value can not be an empty string`
      );
    });
  });
});
