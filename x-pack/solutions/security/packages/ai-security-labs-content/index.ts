/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { encryptSecurityLabsContent, decryptSecurityLabsContent } from './src/utils';

/**
 * Micromatch pattern for plain text markdown files in the security labs content.
 */
export const PLAIN_TEXT_FILE_MICROMATCH_PATTERN = ['*.md', '!*.encoded.md'];

/**
 * Micromatch pattern for encoded markdown files in the security labs content.
 */
export const ENCODED_FILE_MICROMATCH_PATTERN = ['*.encoded.md'];
