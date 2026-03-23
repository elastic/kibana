/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

import * as fs from 'fs/promises';

import * as path from 'path';
import globby from 'globby';
import { existsSync } from 'fs';
import {
  ENCODED_FILE_MICROMATCH_PATTERN,
  PLAIN_TEXT_FILE_MICROMATCH_PATTERN,
  encryptSecurityLabsContent,
} from '@kbn/ai-security-labs-content';

// Path to the security labs markdown files
export const SECURITY_LABS_DIR = path.resolve(__dirname, '../server/knowledge_base/security_labs');

export const deleteFilesByPattern = async ({
  directoryPath,
  pattern,
}: {
  directoryPath: string;
  pattern: string | string[];
}): Promise<void> => {
  try {
    console.log(`Deleting files matching pattern "${pattern}" in directory "${directoryPath}"`);
    const files = await globby(pattern, { cwd: directoryPath });

    if (files.length === 0) {
      console.log(`No files found matching pattern "${pattern}" in directory "${directoryPath}".`);
      return;
    }

    for (const file of files) {
      const filePath = path.join(directoryPath, file);
      await fs.unlink(filePath);
      console.log(`Deleted file: "${filePath}"`);
    }
  } catch (error) {
    console.error(`Error deleting files: ${error.message}`);
    throw error;
  }
};

const encodedFile = async (fileName: string) => {
  const filePath = path.join(SECURITY_LABS_DIR, fileName);
  const content = await fs.readFile(filePath, 'utf-8');
  const encodedContent = encryptSecurityLabsContent(content);
  const fileNameWithoutExtension = path.basename(fileName, path.extname(fileName));
  const outputFilePath = path.join(SECURITY_LABS_DIR, `${fileNameWithoutExtension}.encoded.md`);
  await fs.writeFile(outputFilePath, encodedContent, 'utf-8');
  console.log(`Encoded file: ${fileName} -> ${outputFilePath}`);
  return outputFilePath;
};

/**
 * Main function to encode all markdown files in the security labs directory
 */
export const encodeSecurityLabsContent = async () => {
  console.log('Encoding files from:', SECURITY_LABS_DIR);
  if (!existsSync(SECURITY_LABS_DIR)) {
    throw new Error(`Input directory does not exist: ${SECURITY_LABS_DIR}`);
  }
  await deleteFilesByPattern({
    directoryPath: SECURITY_LABS_DIR,
    pattern: ENCODED_FILE_MICROMATCH_PATTERN,
  });

  const files = await globby(PLAIN_TEXT_FILE_MICROMATCH_PATTERN, {
    cwd: SECURITY_LABS_DIR,
  });
  files.forEach((file) => {
    encodedFile(file);
  });
};
