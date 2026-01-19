/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { decryptSecurityLabsContent } from '@kbn/ai-security-labs-content';
import { TextLoader } from 'langchain/document_loaders/fs/text';

export class EncodedSecurityLabsContentLoader extends TextLoader {
  protected parse(raw: string): Promise<string[]> {
    return Promise.resolve([decryptSecurityLabsContent(raw)]);
  }

  async load() {
    if (typeof this.filePathOrBlob === 'string' && !this.filePathOrBlob.endsWith('encoded.md')) {
      return Promise.resolve([]); // Skip files that are not encoded
    }
    return super.load();
  }
}
