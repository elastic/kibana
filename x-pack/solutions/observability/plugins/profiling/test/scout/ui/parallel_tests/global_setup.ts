/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */
import { globalSetupHook } from '@kbn/scout-oblt';

globalSetupHook(
  'Set up Profiling Resources and Data',
  { tag: ['@ess'] },
  async ({ profilingSetup }) => {
    try {
      // Check profiling status
      console.info('Checking profiling status...');
      const status = await profilingSetup.checkStatus();
      console.info('Profiling status:', status);

      // Set up profiling resources if needed
      if (!status.has_setup) {
        console.info('Setting up Universal profiling resources...');
        await profilingSetup.setupResources();
        console.info('[Done] Setting up Universal profiling resources.');
      } else {
        console.info('Profiling resources already set up.');
      }

      // Load profiling data if needed
      if (!status.has_data) {
        console.info('Loading Universal profiling data...');
        await profilingSetup.loadData();
        console.info('[Done] Loading Universal profiling data.');
      } else {
        console.info('Profiling data already loaded.');
      }
    } catch (error) {
      console.error('Error setting up profiling:', error);
      throw error;
    }
  }
);
