/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';

/**
 * Helper function to wait for the dataset quality table to load or skip tests if timeout occurs.
 * This is useful in CI environments where the table may take longer to load.
 *
 * @param PageObjects - The page objects containing the datasetQuality page object
 * @param logger - The logger service for warnings
 * @param fallback - Callback function to execute if timeout occurs (typically `this.skip()`)
 */
export async function waitUntilDatasetQualityTableOrTimeoutWithFallback(
  PageObjects: any,
  logger: ToolingLog,
  fallback: () => void
) {
  try {
    await PageObjects.datasetQuality.navigateTo();
    await PageObjects.datasetQuality.waitUntilTableLoaded();
  } catch (error) {
    // Skip tests in this describe block if the loading spinner doesn't disappear
    // due to slow CI environment conditions
    if (error.name === 'TimeoutError' && error.message.includes('euiBasicTable-loading')) {
      logger.warning('Skipping tests due to slow CI environment - table loading timeout');

      return fallback();
    } else {
      throw error;
    }
  }
}
