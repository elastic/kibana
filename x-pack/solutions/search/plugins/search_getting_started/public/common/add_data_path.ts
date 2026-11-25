/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PLUGIN_ID } from '../../common';

/** Add data path whose back link returns to Getting started instead of Integrations. */
export const getAddDataPath = (tab: 'sampleData' | 'fileDataViz'): string => {
  const params = new URLSearchParams({ returnAppId: PLUGIN_ID, returnPath: '/' });
  return `#/tutorial_directory/${tab}?${params.toString()}`;
};
