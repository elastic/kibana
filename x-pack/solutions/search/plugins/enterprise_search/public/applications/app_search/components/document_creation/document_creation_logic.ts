/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dedent from 'dedent';
import { kea, MakeLogicType } from 'kea';
import { isPlainObject, chunk, uniq } from 'lodash';

import { HttpLogic } from '../../../shared/http';
import { EngineLogic } from '../engine';

import {
  DOCUMENTS_API_JSON_EXAMPLE,
  DOCUMENT_CREATION_ERRORS,
  DOCUMENT_CREATION_WARNINGS,
} from './constants';
import { DocumentCreationMode, DocumentCreationStep, DocumentCreationSummary } from './types';
import { readUploadedFileAsText } from './utils';

export type ActiveJsonTab = 'uploadTab' | 'pasteTab';

interface DocumentCreationValues {
  isDocumentCreationOpen: boolean;
  creationMode: DocumentCreationMode;
  creationStep: DocumentCreationStep;
  activeJsonTab: ActiveJsonTab;
  textInput: string;
  fileInput: File | null;
  isUploading: boolean;
  warnings: string[];
  errors: string[];
  summary: DocumentCreationSummary;
}

interface DocumentCreationActions {
  showCreationModes(): void;
  openDocumentCreation(creationMode: DocumentCreationMode): { creationMode: DocumentCreationMode };
  closeDocumentCreation(): void;
  setCreationStep(creationStep: DocumentCreationStep): { creationStep: DocumentCreationStep };
  setActiveJsonTab(activeJsonTab: ActiveJsonTab): { activeJsonTab: ActiveJsonTab };
  setTextInput(textInput: string): { textInput: string };
  setFileInput(fileInput: File | null): { fileInput: File | null };
  setWarnings(warnings: string[]): { warnings: string[] };
  setErrors(errors: string[] | string): { errors: string[] };
  setSummary(summary: DocumentCreationSummary): { summary: DocumentCreationSummary };
  onSubmitFile(): void;
  onSubmitJson(): void;
  uploadDocuments(args: { documents: object[] }): { documents: object[] };
}

export const DocumentCreationLogic = kea<
  MakeLogicType<DocumentCreationValues, DocumentCreationActions>
>({
  path: ['enterprise_search', 'app_search', 'document_creation_logic'],
  actions: () => ({
    showCreationModes: () => null,
    openDocumentCreation: (creationMode) => ({ creationMode }),
    closeDocumentCreation: () => null,
    setCreationStep: (creationStep) => ({ creationStep }),
    setActiveJsonTab: (activeJsonTab) => ({ activeJsonTab }),
    setTextInput: (textInput) => ({ textInput }),
    setFileInput: (fileInput) => ({ fileInput }),
    setWarnings: (warnings) => ({ warnings }),
    setErrors: (errors) => ({ errors }),
    setSummary: (summary) => ({ summary }),
    onSubmitJson: () => null,
    onSubmitFile: () => null,
    uploadDocuments: ({ documents }) => ({ documents }),
  }),
  reducers: () => ({
    isDocumentCreationOpen: [
      false,
      {
        showCreationModes: () => true,
        openDocumentCreation: () => true,
        closeDocumentCreation: () => false,
      },
    ],
    creationMode: [
      'api',
      {
        openDocumentCreation: (_, { creationMode }) => creationMode,
      },
    ],
    activeJsonTab: [
      'uploadTab',
      {
        setActiveJsonTab: (_, { activeJsonTab }) => activeJsonTab,
      },
    ],
    creationStep: [
      DocumentCreationStep.AddDocuments,
      {
        showCreationModes: () => DocumentCreationStep.ShowCreationModes,
        openDocumentCreation: () => DocumentCreationStep.AddDocuments,
        setCreationStep: (_, { creationStep }) => creationStep,
      },
    ],
    textInput: [
      dedent(DOCUMENTS_API_JSON_EXAMPLE),
      {
        setTextInput: (_, { textInput }) => textInput,
        closeDocumentCreation: () => dedent(DOCUMENTS_API_JSON_EXAMPLE),
        setActiveJsonTab: () => dedent(DOCUMENTS_API_JSON_EXAMPLE),
      },
    ],
    fileInput: [
      null,
      {
        setFileInput: (_, { fileInput }) => fileInput,
        closeDocumentCreation: () => null,
        setActiveJsonTab: () => null,
      },
    ],
    isUploading: [
      false,
      {
        onSubmitFile: () => true,
        onSubmitJson: () => true,
        setErrors: () => false,
        setSummary: () => false,
        setActiveJsonTab: () => false,
      },
    ],
    warnings: [
      [],
      {
        onSubmitJson: () => [],
        setWarnings: (_, { warnings }) => warnings,
        closeDocumentCreation: () => [],
        setActiveJsonTab: () => [],
      },
    ],
    errors: [
      [],
      {
        onSubmitJson: () => [],
        setErrors: (_, { errors }) => (Array.isArray(errors) ? errors : [errors]),
        closeDocumentCreation: () => [],
        setActiveJsonTab: () => [],
      },
    ],
    summary: [
      {} as DocumentCreationSummary,
      {
        setSummary: (_, { summary }) => summary,
      },
    ],
  }),
  listeners: ({ values, actions }) => ({
    onSubmitFile: async () => {
      const { fileInput } = values;

      if (!fileInput) {
        return actions.setErrors([DOCUMENT_CREATION_ERRORS.NO_FILE]);
      }
      try {
        const textInput = await readUploadedFileAsText(fileInput);
        actions.setTextInput(textInput);
        actions.onSubmitJson();
      } catch {
        actions.setErrors([DOCUMENT_CREATION_ERRORS.NO_VALID_FILE]);
      }
    },
    onSubmitJson: () => {
      const { textInput } = values;

      const MAX_UPLOAD_BYTES = 50 * 1000000; // 50 MB
      if (Buffer.byteLength(textInput) > MAX_UPLOAD_BYTES) {
        actions.setWarnings([DOCUMENT_CREATION_WARNINGS.LARGE_FILE]);
      }

      let documents;
      try {
        documents = JSON.parse(textInput);
      } catch (error) {
        return actions.setErrors([error.message]);
      }

      if (Array.isArray(documents)) {
        actions.uploadDocuments({ documents });
      } else if (isPlainObject(documents)) {
        actions.uploadDocuments({ documents: [documents] });
      } else {
        actions.setErrors([DOCUMENT_CREATION_ERRORS.NOT_VALID]);
      }
    },
    uploadDocuments: async ({ documents }) => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      const CHUNK_SIZE = 100;
      const MAX_EXAMPLES = 5;

      const promises = chunk(documents, CHUNK_SIZE).map((documentsChunk) => {
        const body = JSON.stringify({ documents: documentsChunk });
        return http.post<DocumentCreationSummary>(
          `/internal/app_search/engines/${engineName}/documents`,
          { body }
        );
      });

      try {
        const responses = await Promise.all(promises);
        const summary: DocumentCreationSummary = {
          errors: [],
          validDocuments: { total: 0, examples: [] },
          invalidDocuments: { total: 0, examples: [] },
          newSchemaFields: [],
        };
        responses.forEach((response) => {
          if (response.errors?.length > 0) {
            summary.errors = uniq([...summary.errors, ...response.errors]);
            return;
          }
          summary.validDocuments.total += response.validDocuments.total;
          summary.invalidDocuments.total += response.invalidDocuments.total;
          summary.validDocuments.examples = [
            ...summary.validDocuments.examples,
            ...response.validDocuments.examples,
          ].slice(0, MAX_EXAMPLES);
          summary.invalidDocuments.examples = [
            ...summary.invalidDocuments.examples,
            ...response.invalidDocuments.examples,
          ].slice(0, MAX_EXAMPLES);
          summary.newSchemaFields = uniq([...summary.newSchemaFields, ...response.newSchemaFields]);
        });

        if (summary.errors.length > 0) {
          actions.setErrors(summary.errors);
        } else {
          actions.setSummary(summary);
          actions.setCreationStep(DocumentCreationStep.ShowSummary);
        }
      } catch ({ body, message }) {
        const errors = body ? `[${body.statusCode} ${body.error}] ${body.message}` : message;
        actions.setErrors(errors);
      }
    },
  }),
});
