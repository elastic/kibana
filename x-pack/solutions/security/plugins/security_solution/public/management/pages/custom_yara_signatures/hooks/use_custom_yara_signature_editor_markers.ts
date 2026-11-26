/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { monaco } from '@kbn/code-editor';
import type { ValidateCustomYaraSignatureDiagnostic } from '../../../../../common/api/endpoint/custom_yara_signatures';

export const CUSTOM_YARA_SIGNATURE_EDITOR_MARKER_OWNER = 'custom-yara-signature';

type MarkerModel = Pick<
  monaco.editor.ITextModel,
  | 'getLineCount'
  | 'getLineMaxColumn'
  | 'getLineFirstNonWhitespaceColumn'
  | 'getLineLastNonWhitespaceColumn'
>;

const toMarkerSeverity = (
  severity: ValidateCustomYaraSignatureDiagnostic['severity']
): monaco.MarkerSeverity =>
  severity === 'error' ? monaco.MarkerSeverity.Error : monaco.MarkerSeverity.Warning;

/** Maps validate API diagnostics onto trimmed whole-line Monaco markers (no column data). */
export const toCustomYaraSignatureEditorMarkers = (
  diagnostics: ValidateCustomYaraSignatureDiagnostic[],
  model: MarkerModel
): monaco.editor.IMarkerData[] => {
  const lineCount = model.getLineCount();

  return diagnostics.flatMap((diagnostic) => {
    // Diagnostic line numbers are 1-indexed, line 0 means no line number, it's only displayed below the editor.
    if (diagnostic.line <= 0 || lineCount < 1) {
      return [];
    }

    const lineNumber = Math.min(diagnostic.line, lineCount);
    const firstNonWhitespaceColumn = model.getLineFirstNonWhitespaceColumn(lineNumber);
    const lastNonWhitespaceColumn = model.getLineLastNonWhitespaceColumn(lineNumber);

    return [
      {
        startLineNumber: lineNumber,
        startColumn: firstNonWhitespaceColumn || 1,
        endLineNumber: lineNumber,
        endColumn: lastNonWhitespaceColumn || model.getLineMaxColumn(lineNumber),
        message: diagnostic.message,
        severity: toMarkerSeverity(diagnostic.severity),
        source: CUSTOM_YARA_SIGNATURE_EDITOR_MARKER_OWNER,
      },
    ];
  });
};

interface UseCustomYaraSignatureEditorMarkersProps {
  editor: monaco.editor.IStandaloneCodeEditor | null;
  errors: ValidateCustomYaraSignatureDiagnostic[];
  warnings: ValidateCustomYaraSignatureDiagnostic[];
}

/** Writes validate API errors/warnings onto the Monaco model. */
export const useCustomYaraSignatureEditorMarkers = ({
  editor,
  errors,
  warnings,
}: UseCustomYaraSignatureEditorMarkersProps): void => {
  useEffect(() => {
    const model = editor?.getModel();
    if (!model || model.isDisposed()) {
      return;
    }

    monaco.editor.setModelMarkers(
      model,
      CUSTOM_YARA_SIGNATURE_EDITOR_MARKER_OWNER,
      toCustomYaraSignatureEditorMarkers([...errors, ...warnings], model)
    );
  }, [editor, errors, warnings]);
};
