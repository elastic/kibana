/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { download, paths } from '../plugins/screenshotting/server/utils';

export const downloadChromium = async () => {
  // eslint-disable-next-line no-console
  const consoleLogger = (tag: string) => (message: unknown) => console.log(tag, message);
  const logger = {
    get: () => logger,
    debug: consoleLogger('debug'),
    info: consoleLogger('info'),
    warn: consoleLogger('warn'),
    trace: consoleLogger('trace'),
    error: consoleLogger('error'),
    fatal: consoleLogger('fatal'),
    log: consoleLogger('log'),
  };

  // Download Chromium for all platforms
  await Promise.all(paths.packages.map((pkg) => download(pkg, logger)));
};
