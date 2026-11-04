/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { ValidateCustomYaraSignatureDiagnostic } from '../../../../../common/api/endpoint/custom_yara_signatures';

const mockSetModelMarkers = jest.fn();

jest.mock('@kbn/code-editor', () => ({
  monaco: {
    editor: {
      setModelMarkers: (...args: unknown[]) => mockSetModelMarkers(...args),
    },
    MarkerSeverity: { Error: 8, Warning: 4 },
  },
}));

import {
  CUSTOM_YARA_SIGNATURE_EDITOR_MARKER_OWNER,
  toCustomYaraSignatureEditorMarkers,
  useCustomYaraSignatureEditorMarkers,
} from './use_custom_yara_signature_editor_markers';

const createModel = ({
  lineCount = 5,
  lineMaxColumn = 12,
  firstNonWhitespaceColumn = 1,
  lastNonWhitespaceColumn,
  isDisposed = false,
}: {
  lineCount?: number;
  lineMaxColumn?: number;
  firstNonWhitespaceColumn?: number;
  lastNonWhitespaceColumn?: number;
  isDisposed?: boolean;
} = {}) => ({
  isDisposed: () => isDisposed,
  getLineCount: () => lineCount,
  getLineMaxColumn: jest.fn((lineNumber: number) => (lineNumber <= lineCount ? lineMaxColumn : 1)),
  getLineFirstNonWhitespaceColumn: jest.fn(() => firstNonWhitespaceColumn),
  getLineLastNonWhitespaceColumn: jest.fn(() => lastNonWhitespaceColumn ?? lineMaxColumn),
});

const createEditor = (
  model: ReturnType<typeof createModel> | null
): Parameters<typeof useCustomYaraSignatureEditorMarkers>[0]['editor'] =>
  ({ getModel: () => model } as Parameters<
    typeof useCustomYaraSignatureEditorMarkers
  >[0]['editor']);

describe('toCustomYaraSignatureEditorMarkers', () => {
  const model = createModel({ lineCount: 4, lineMaxColumn: 9 });

  it('maps errors and warnings onto the trimmed diagnostic line', () => {
    const diagnostics: ValidateCustomYaraSignatureDiagnostic[] = [
      { message: 'syntax error', line: 2, severity: 'error' },
      { message: 'unused identifier', line: 4, severity: 'warning' },
    ];

    expect(toCustomYaraSignatureEditorMarkers(diagnostics, model)).toEqual([
      {
        startLineNumber: 2,
        startColumn: 1,
        endLineNumber: 2,
        endColumn: 9,
        message: 'syntax error',
        severity: 8,
        source: CUSTOM_YARA_SIGNATURE_EDITOR_MARKER_OWNER,
      },
      {
        startLineNumber: 4,
        startColumn: 1,
        endLineNumber: 4,
        endColumn: 9,
        message: 'unused identifier',
        severity: 4,
        source: CUSTOM_YARA_SIGNATURE_EDITOR_MARKER_OWNER,
      },
    ]);
  });

  it('skips diagnostics without a line number', () => {
    expect(
      toCustomYaraSignatureEditorMarkers(
        [{ message: 'unknown location', line: 0, severity: 'error' }],
        model
      )
    ).toEqual([]);
  });

  it('clamps diagnostics past the last line onto the last line', () => {
    expect(
      toCustomYaraSignatureEditorMarkers(
        [{ message: 'past eof', line: 99, severity: 'error' }],
        model
      )
    ).toEqual([
      expect.objectContaining({
        startLineNumber: 4,
        endLineNumber: 4,
        endColumn: 9,
        message: 'past eof',
      }),
    ]);
  });

  it('excludes leading and trailing whitespace from the marker range', () => {
    const paddedModel = createModel({
      lineCount: 1,
      lineMaxColumn: 14,
      firstNonWhitespaceColumn: 3,
      lastNonWhitespaceColumn: 11,
    });

    expect(
      toCustomYaraSignatureEditorMarkers(
        [{ message: 'syntax error', line: 1, severity: 'error' }],
        paddedModel
      )
    ).toEqual([
      expect.objectContaining({
        startColumn: 3,
        endColumn: 11,
      }),
    ]);
  });

  it('covers the last non-whitespace character with an exclusive end column', () => {
    const oneCharacterModel = createModel({
      lineCount: 1,
      lineMaxColumn: 2,
      firstNonWhitespaceColumn: 1,
      lastNonWhitespaceColumn: 2,
    });

    expect(
      toCustomYaraSignatureEditorMarkers(
        [{ message: 'syntax error', line: 1, severity: 'error' }],
        oneCharacterModel
      )
    ).toEqual([
      expect.objectContaining({
        startColumn: 1,
        endColumn: 2,
      }),
    ]);
  });

  it('falls back to the full line when the line is only whitespace', () => {
    const whitespaceModel = createModel({
      lineCount: 1,
      lineMaxColumn: 5,
      firstNonWhitespaceColumn: 0,
      lastNonWhitespaceColumn: 0,
    });

    expect(
      toCustomYaraSignatureEditorMarkers(
        [{ message: 'syntax error', line: 1, severity: 'error' }],
        whitespaceModel
      )
    ).toEqual([
      expect.objectContaining({
        startColumn: 1,
        endColumn: 5,
      }),
    ]);
  });
});

describe('useCustomYaraSignatureEditorMarkers', () => {
  beforeEach(() => {
    mockSetModelMarkers.mockClear();
  });

  it('writes error and warning markers onto the editor model', () => {
    const model = createModel();
    const errors: ValidateCustomYaraSignatureDiagnostic[] = [
      { message: 'syntax error', line: 2, severity: 'error' },
    ];
    const warnings: ValidateCustomYaraSignatureDiagnostic[] = [
      { message: 'unused identifier', line: 4, severity: 'warning' },
    ];

    renderHook(() =>
      useCustomYaraSignatureEditorMarkers({
        editor: createEditor(model),
        errors,
        warnings,
      })
    );

    expect(mockSetModelMarkers).toHaveBeenCalledWith(
      model,
      CUSTOM_YARA_SIGNATURE_EDITOR_MARKER_OWNER,
      [
        expect.objectContaining({ message: 'syntax error', startLineNumber: 2, severity: 8 }),
        expect.objectContaining({
          message: 'unused identifier',
          startLineNumber: 4,
          severity: 4,
        }),
      ]
    );
  });

  it('clears markers when there are no diagnostics', () => {
    const model = createModel();

    renderHook(() =>
      useCustomYaraSignatureEditorMarkers({
        editor: createEditor(model),
        errors: [],
        warnings: [],
      })
    );

    expect(mockSetModelMarkers).toHaveBeenCalledWith(
      model,
      CUSTOM_YARA_SIGNATURE_EDITOR_MARKER_OWNER,
      []
    );
  });

  it('does not write markers when the model is disposed', () => {
    renderHook(() =>
      useCustomYaraSignatureEditorMarkers({
        editor: createEditor(createModel({ isDisposed: true })),
        errors: [{ message: 'syntax error', line: 1, severity: 'error' }],
        warnings: [],
      })
    );

    expect(mockSetModelMarkers).not.toHaveBeenCalled();
  });
});
