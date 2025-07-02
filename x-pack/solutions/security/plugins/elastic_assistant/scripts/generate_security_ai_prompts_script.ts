/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

import { Prompt } from '@kbn/security-ai-prompts';
import * as fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import * as path from 'path';
import globby from 'globby';
import { v4 as uuidv4 } from 'uuid';

import { localPrompts } from '../server/lib/prompt/local_prompt_object';
import { localToolPrompts } from '../server/lib/prompt/tool_prompts';

export const OUTPUT_DIR = '../../../../../target/security_ai_prompts';
export const DELETE_FILES_PATTERN = '*.json';
export const SAVED_OBJECT_ID_PREFIX = 'security_ai_prompts-';

interface SecurityAiPromptSavedObject {
  attributes: Prompt;
  id: string;
  type: 'security-ai-prompt';
}

export const createOutputDir = () => {
  if (!existsSync(OUTPUT_DIR)) {
    console.log(`Creating output directory: ${OUTPUT_DIR}`);
    mkdirSync(OUTPUT_DIR);
  }
};

export const deleteFilesByPattern = async ({
  directoryPath,
  pattern,
}: {
  directoryPath: string;
  pattern: string;
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

export const writeSavedObjects = async ({
  direcotryPath,
  savedObjects,
}: {
  direcotryPath: string;
  savedObjects: SecurityAiPromptSavedObject[];
}) => {
  for (const savedObject of savedObjects) {
    const filePath = path.join(direcotryPath, `${savedObject.id}.json`);

    await fs.writeFile(filePath, `${JSON.stringify(savedObject, null, 2)}\n`);
    console.log(`Wrote saved object to file: "${filePath}"`);
  }
};

export const generateSavedObject = (prompt: Prompt): SecurityAiPromptSavedObject => ({
  attributes: {
    ...prompt,
    prompt: {
      default: `${prompt.prompt.default}`,
    },
  },
  id: `${SAVED_OBJECT_ID_PREFIX}${uuidv4()}`,
  type: 'security-ai-prompt',
});

export const generateSavedObjects = (prompts: Prompt[]): SecurityAiPromptSavedObject[] =>
  prompts.map(generateSavedObject);

export const generateSecurityAiPrompts = async () => {
  console.log('Generating Security AI prompts');

  createOutputDir();

  await deleteFilesByPattern({
    directoryPath: OUTPUT_DIR,
    pattern: DELETE_FILES_PATTERN,
  });

  const prompts = [...localPrompts, ...localToolPrompts];

  console.log('--> prompts', JSON.stringify(prompts, null, 2));

  const savedObjects = generateSavedObjects(prompts);

  console.log('--> savedObjects', JSON.stringify(savedObjects, null, 2));

  await writeSavedObjects({
    direcotryPath: OUTPUT_DIR,
    savedObjects,
  });

  console.log('Done');
};
