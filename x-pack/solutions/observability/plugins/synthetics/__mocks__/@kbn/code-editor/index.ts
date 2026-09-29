/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MockedCodeEditor } from '@kbn/code-editor-mock';

// `@kbn/code-editor` is aliased to this file; the `/index` subpath resolves to the real package.
export * from '@kbn/code-editor/index';
export const CodeEditor = MockedCodeEditor;
