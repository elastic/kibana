/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateFile } from './validations';
import { MAX_FILE_SIZE_BYTES } from './constants';

const formatBytes = (bytes: number) => `${bytes} bytes`;

describe('validateFile', () => {
  it('should return valid for a valid CSV file', () => {
    const file = new File(['type,user.name\nuser,john'], 'test.csv', { type: 'text/csv' });

    const result = validateFile(file, formatBytes);

    expect(result).toEqual({ valid: true });
  });

  it('should return valid for text/plain type', () => {
    const file = new File(['type,user.name\nuser,john'], 'test.csv', { type: 'text/plain' });

    const result = validateFile(file, formatBytes);

    expect(result).toEqual({ valid: true });
  });

  it('should return valid when the MIME type is empty (Windows fallback)', () => {
    const file = new File(['type,user.name\nuser,john'], 'test.csv', { type: '' });

    const result = validateFile(file, formatBytes);

    expect(result).toEqual({ valid: true });
  });

  it('should return an error for unsupported file types', () => {
    const file = new File(['content'], 'test.json', { type: 'application/json' });

    const result = validateFile(file, formatBytes);

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errorMessage).toContain('Invalid file format');
      expect(result.errorMessage).toContain('CSV');
    }
  });

  it('should return an error for an empty file', () => {
    const file = new File([], 'empty.csv', { type: 'text/csv' });

    const result = validateFile(file, formatBytes);

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errorMessage).toBe('The selected file is empty.');
    }
  });

  it('should return an error when file exceeds max size', () => {
    const largeContent = 'x'.repeat(MAX_FILE_SIZE_BYTES + 1);
    const file = new File([largeContent], 'large.csv', { type: 'text/csv' });

    const result = validateFile(file, formatBytes);

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errorMessage).toContain('exceeds the maximum file size');
    }
  });
});
