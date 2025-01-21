/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LogMeta, Logger } from '@kbn/logging';
import { ToolingLog } from '@kbn/tooling-log';
import sinon from 'sinon';

export const createFakeLogger = (log: ToolingLog) => {
  const fakeLogger = <Meta extends LogMeta = LogMeta>(msg: string, meta?: Meta) =>
    meta ? log.debug(msg, meta) : log.debug(msg);

  return {
    trace: fakeLogger,
    debug: fakeLogger,
    info: fakeLogger,
    warn: fakeLogger,
    error: fakeLogger,
    fatal: fakeLogger,
    log: sinon.stub(),
    get: sinon.stub(),
    isLevelEnabled: sinon.stub(),
  } as Logger;
};
