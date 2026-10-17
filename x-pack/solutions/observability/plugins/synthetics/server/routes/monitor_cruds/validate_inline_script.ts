/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { Script } from 'vm';

/**
 * Returns why a browser inline script cannot compile, or undefined when it compiles.
 * The script is compiled only, never executed.
 */
export const getInlineScriptError = (script: string): string | undefined => {
  try {
    // Wrapped in an async function so top-level await and return compile, as they do in the runner.
    new Script(`(async () => {\n${script}\n})`);
    return undefined;
  } catch (error) {
    return i18n.translate('xpack.synthetics.server.monitors.invalidInlineScriptSyntaxError', {
      defaultMessage: 'The script has a syntax error: {message}',
      values: { message: error instanceof Error ? error.message : String(error) },
    });
  }
};
