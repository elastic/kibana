/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DirectoryLoader } from 'langchain/document_loaders/fs/directory';
import { EncodedSecurityLabsContentLoader } from './encoded_security_labs_content_loader';
import path, { resolve } from 'path';
import globby from 'globby';
import { PLAIN_TEXT_FILE_MICROMATCH_PATTERN } from '@kbn/ai-security-labs-content';

const directoryPath = path.join(__dirname, '../../../knowledge_base/security_labs');
const plainTextFiles: string[] = globby.sync(PLAIN_TEXT_FILE_MICROMATCH_PATTERN, {
  cwd: directoryPath,
});

describe('encoded_security_labs_content_loader', () => {
  it('loads and decrypts security labs content correctly', async () => {
    const docsLoader = new DirectoryLoader(
      resolve(__dirname, '../../../knowledge_base/security_labs'),
      {
        '.md': (p) => new EncodedSecurityLabsContentLoader(p),
      },
      true
    );

    const rawDocs = await docsLoader.load();
    expect(rawDocs.length).toEqual(plainTextFiles.length);
    rawDocs.forEach((doc) => {
      expect(doc.pageContent).toBeDefined();
      // Check if the content is decrypted and contains expected fields
      expect(doc.pageContent).toContain('title:');
      expect(doc.pageContent).toContain('slug:');
    });
  });
});
