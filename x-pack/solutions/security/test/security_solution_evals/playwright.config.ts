/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Path from 'path';
import { createPlaywrightEvalsConfig } from '@kbn/evals';

const baseConfig = createPlaywrightEvalsConfig({
  testDir: Path.join(__dirname, './evals'),
  repetitions: 3,
  timeout: 10 * 60_000, // 10 minutes timeout
});

const reportDir = Path.join(__dirname, 'playwright-report');
const enableHtmlReport = process.env.EVAL_HTML_REPORT === 'true';

export default {
  ...baseConfig,
  reporter: [
    ...(Array.isArray(baseConfig.reporter) ? baseConfig.reporter : []),
    ...(enableHtmlReport
      ? [
          ['html', { open: 'never', outputFolder: reportDir }] as const,
          [
            Path.join(__dirname, './src/eval_html_reporter.ts'),
            { outputFolder: reportDir },
          ] as const,
        ]
      : []),
  ],
};
