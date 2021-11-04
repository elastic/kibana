/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import path from 'path';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default ({ loadTestFile }: FtrProviderContext): void => {
  describe('Detection pre-packaged rule tests', function () {
    describe('', function () {
      this.tags('ciGroup11');

      const currentFileName = path.basename(__filename);
      const filesToExclude = ['template.ts', 'README.md', currentFileName];
      const filesAndFolders = fs.readdirSync(__dirname);
      const files = filesAndFolders.filter((fileAndFolder) => {
        return !filesToExclude.includes(fileAndFolder);
      });
      files.forEach((file) => {
        loadTestFile(require.resolve(`./${file}`));
      });
    });
  });
};
