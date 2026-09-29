/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IMPORT_BUFFER_SIZE } from '../../../common/constants.mock';

import { BufferLines } from './buffer_lines';
import { TestReadable } from './test_readable.mock';

describe('buffer_lines', () => {
  test('it will throw if given a buffer size of zero', () => {
    expect(() => {
      new BufferLines({ bufferSize: 0, input: new TestReadable() });
    }).toThrow('bufferSize must be greater than zero');
  });

  test('it will throw if given a buffer size of -1', () => {
    expect(() => {
      new BufferLines({ bufferSize: -1, input: new TestReadable() });
    }).toThrow('bufferSize must be greater than zero');
  });

  test('two identical lines are collapsed into just one line without duplicates', () =>
    new Promise<void>((resolve, reject) => {
      const done = Object.assign((error?: unknown) => (error ? reject(error) : resolve()), {
        fail: reject,
      });

      const input = new TestReadable();
      input.push('--boundary\n');
      input.push('Content-type: text/plain\n');
      input.push('Content-Disposition: form-data; name="fieldName"; filename="filename.text"\n');
      input.push('\n');
      input.push('line one\n');
      input.push('line one\n');
      input.push('--boundary--\n');
      input.push(null);
      const bufferedLine = new BufferLines({ bufferSize: IMPORT_BUFFER_SIZE, input });
      let linesToTest: string[] = [];
      bufferedLine.on('lines', (lines: string[]) => {
        linesToTest = [...linesToTest, ...lines];
      });
      bufferedLine.on('close', () => {
        expect(linesToTest).toEqual(['line one']);
        done();
      });
    }));

  test('it can close out without writing any lines', () =>
    new Promise<void>((resolve, reject) => {
      const done = Object.assign((error?: unknown) => (error ? reject(error) : resolve()), {
        fail: reject,
      });

      const input = new TestReadable();
      input.push(null);
      const bufferedLine = new BufferLines({ bufferSize: IMPORT_BUFFER_SIZE, input });
      let linesToTest: string[] = [];
      bufferedLine.on('lines', (lines: string[]) => {
        linesToTest = [...linesToTest, ...lines];
      });
      bufferedLine.on('close', () => {
        expect(linesToTest).toEqual([]);
        done();
      });
    }));

  test('it can read 200 lines', () =>
    new Promise<void>((resolve, reject) => {
      const done = Object.assign((error?: unknown) => (error ? reject(error) : resolve()), {
        fail: reject,
      });

      const input = new TestReadable();
      const bufferedLine = new BufferLines({ bufferSize: IMPORT_BUFFER_SIZE, input });
      input.push('--boundary\n');
      input.push('Content-type: text/plain\n');
      input.push('Content-Disposition: form-data; name="fieldName"; filename="filename.text"\n');
      input.push('\n');
      let linesToTest: string[] = [];
      const size200: string[] = new Array(200).fill(null).map((_, index) => `${index}\n`);
      size200.forEach((element) => input.push(element));
      input.push('--boundary--\n');
      input.push(null);
      bufferedLine.on('lines', (lines: string[]) => {
        linesToTest = [...linesToTest, ...lines];
      });
      bufferedLine.on('close', () => {
        expect(linesToTest.length).toEqual(200);
        done();
      });
    }));

  test('it can read an example multi-part message', () =>
    new Promise<void>((resolve, reject) => {
      const done = Object.assign((error?: unknown) => (error ? reject(error) : resolve()), {
        fail: reject,
      });

      const input = new TestReadable();
      input.push('--boundary\n');
      input.push('Content-type: text/plain\n');
      input.push('Content-Disposition: form-data; name="fieldName"; filename="filename.text"\n');
      input.push('\n');
      input.push('127.0.0.1\n');
      input.push('127.0.0.2\n');
      input.push('127.0.0.3\n');
      input.push('\n');
      input.push('--boundary--\n');
      input.push(null);
      const bufferedLine = new BufferLines({ bufferSize: IMPORT_BUFFER_SIZE, input });
      let linesToTest: string[] = [];
      bufferedLine.on('lines', (lines: string[]) => {
        linesToTest = [...linesToTest, ...lines];
      });
      bufferedLine.on('close', () => {
        expect(linesToTest).toEqual(['127.0.0.1', '127.0.0.2', '127.0.0.3']);
        done();
      });
    }));

  test('it does not create empty values for lines after the end boundary', () =>
    new Promise<void>((resolve, reject) => {
      const done = Object.assign((error?: unknown) => (error ? reject(error) : resolve()), {
        fail: reject,
      });

      const input = new TestReadable();
      input.push('--boundary\n');
      input.push('Content-type: text/plain\n');
      input.push('Content-Disposition: form-data; name="fieldName"; filename="filename.text"\n');
      input.push('\n');
      input.push('127.0.0.1\n');
      input.push('127.0.0.2\n');
      input.push('127.0.0.3\n');
      input.push('\n');
      input.push('--boundary--\n');
      input.push('\n');
      input.push(null);
      const bufferedLine = new BufferLines({ bufferSize: IMPORT_BUFFER_SIZE, input });
      let linesToTest: string[] = [];
      bufferedLine.on('lines', (lines: string[]) => {
        linesToTest = [...linesToTest, ...lines];
      });
      bufferedLine.on('close', () => {
        expect(linesToTest).toEqual(['127.0.0.1', '127.0.0.2', '127.0.0.3']);
        done();
      });
    }));

  test('it can read an empty multi-part message', () =>
    new Promise<void>((resolve, reject) => {
      const done = Object.assign((error?: unknown) => (error ? reject(error) : resolve()), {
        fail: reject,
      });

      const input = new TestReadable();
      input.push('--boundary\n');
      input.push('Content-type: text/plain\n');
      input.push('Content-Disposition: form-data; name="fieldName"; filename="filename.text"\n');
      input.push('\n');
      input.push('\n');
      input.push('--boundary--\n');
      input.push(null);
      const bufferedLine = new BufferLines({ bufferSize: IMPORT_BUFFER_SIZE, input });
      let linesToTest: string[] = [];
      bufferedLine.on('lines', (lines: string[]) => {
        linesToTest = [...linesToTest, ...lines];
      });
      bufferedLine.on('close', () => {
        expect(linesToTest).toEqual([]);
        done();
      });
    }));

  test('it can read a fileName from a multipart message', () =>
    new Promise<void>((resolve, reject) => {
      const done = Object.assign((error?: unknown) => (error ? reject(error) : resolve()), {
        fail: reject,
      });

      const input = new TestReadable();
      input.push('--boundary\n');
      input.push('Content-type: text/plain\n');
      input.push('Content-Disposition: form-data; name="fieldName"; filename="filename.text"\n');
      input.push('\n');
      input.push('--boundary--\n');
      input.push(null);
      const bufferedLine = new BufferLines({ bufferSize: IMPORT_BUFFER_SIZE, input });
      let fileNameToTest: string;
      bufferedLine.on('fileName', (fileName: string) => {
        fileNameToTest = fileName;
      });
      bufferedLine.on('close', () => {
        expect(fileNameToTest).toEqual('filename.text');
        done();
      });
    }));
});
