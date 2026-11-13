/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import { mkdir, readdir, rm, writeFile } from 'fs/promises';
import { run } from '@kbn/dev-cli-runner';
import { REPO_ROOT } from '@kbn/repo-info';
import { localPrompts } from '../../server/agents/investigation/prompts';
import { NIGHTSHIFT_PROMPTS_PACKAGE_NAME } from '../../server/prompts_package';
import { toPromptSavedObjects } from './to_prompt_saved_objects';

const DEFAULT_OUTPUT_DIR = Path.join(REPO_ROOT, 'target', NIGHTSHIFT_PROMPTS_PACKAGE_NAME);

run(
  async ({ flags, log }) => {
    // An omitted string flag is an empty string, which would resolve to the working directory.
    const outputDir = Path.resolve(
      typeof flags.output === 'string' && flags.output ? flags.output : DEFAULT_OUTPUT_DIR
    );
    await mkdir(outputDir, { recursive: true });

    // Stale files would ship prompts that Kibana no longer bundles. Only this package's files go,
    // so pointing `--output` at the wrong directory cannot delete anything else.
    for (const file of await readdir(outputDir)) {
      if (file.startsWith(`${NIGHTSHIFT_PROMPTS_PACKAGE_NAME}-`) && file.endsWith('.json')) {
        await rm(Path.join(outputDir, file));
      }
    }

    for (const savedObject of toPromptSavedObjects(localPrompts)) {
      const filePath = Path.join(outputDir, `${savedObject.id}.json`);
      await writeFile(filePath, `${JSON.stringify(savedObject, null, 2)}\n`);
      log.info(`Wrote ${Path.relative(REPO_ROOT, filePath)}`);
    }

    log.success(
      `Copy these files into packages/${NIGHTSHIFT_PROMPTS_PACKAGE_NAME}/kibana/security_ai_prompt in elastic/integrations`
    );
  },
  {
    description: `Writes the bundled investigator prompts as the saved objects of the ${NIGHTSHIFT_PROMPTS_PACKAGE_NAME} package.`,
    flags: {
      string: ['output'],
      help: `
        --output  Directory to write to. Defaults to target/${NIGHTSHIFT_PROMPTS_PACKAGE_NAME}.
      `,
    },
  }
);
