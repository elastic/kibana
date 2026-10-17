/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { PER_HUNT_MS, HUNT_REPORTS_PER_PHASE } from './phases';

/**
 * Sizes the Playwright budget from the fixture count. The shipped
 * playwright.config.ts needs a live connector env to import
 * (createPlaywrightEvalsConfig throws without EVAL_CONNECTOR_ID), so the
 * timeout literal is read textually from the file itself (NB-9: a local
 * constant tests nothing about the shipped config). If the config moves to
 * dynamic construction this regex stops matching and the suite goes red.
 */
const PHASES = 3;
const configSource = readFileSync(join(__dirname, '../../playwright.config.ts'), 'utf8');
const match = configSource.match(/timeout:\s*([\d\s*_*]+?),\s*\n/);
const CONFIG_TIMEOUT_MS = match ? eval(match[1]) : NaN; // eslint-disable-line no-eval

describe('playwright budget sized from the fixture count', () => {
  it(`timeout ${CONFIG_TIMEOUT_MS}ms covers reports x phases at the per-hunt budget`, () => {
    expect(Number.isNaN(CONFIG_TIMEOUT_MS)).toBe(false);
    expect(CONFIG_TIMEOUT_MS).toBeGreaterThanOrEqual(PER_HUNT_MS * HUNT_REPORTS_PER_PHASE * PHASES);
  });
});
