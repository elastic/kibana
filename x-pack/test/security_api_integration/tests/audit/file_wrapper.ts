/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import type { RetryService } from '@kbn/ftr-common-functional-services';

export class FileWrapper {
  delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  constructor(private readonly path: string, private readonly retry: RetryService) {}
  async reset() {
    // "touch" each file to ensure it exists and is empty before each test
    await Fs.promises.writeFile(this.path, '');
  }
  async read() {
    const content = await Fs.promises.readFile(this.path, { encoding: 'utf8' });
    return content.trim().split('\n');
  }
  async readJSON() {
    return this.retry.try(async () => {
      const content = await this.read();
      try {
        return content.map((l) => JSON.parse(l));
      } catch (err) {
        const contentString = content.join('\n');
        throw new Error(
          `Failed to parse audit log JSON, error: "${err.message}", audit.log contents:\n${contentString}`
        );
      }
    });
  }
  // writing in a file is an async operation. we use this method to make sure logs have been written.
  async isWritten() {
    // attempt at determinism - wait for the size of the file to stop changing.
    await this.retry.waitForWithTimeout(`file '${this.path}' to be written`, 5000, async () => {
      const sizeBefore = Fs.statSync(this.path).size;
      await this.delay(500);
      const sizeAfter = Fs.statSync(this.path).size;
      return sizeAfter === sizeBefore;
    });

    return Fs.statSync(this.path).size > 0;
  }
}
