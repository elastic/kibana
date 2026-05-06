/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactElement } from 'react';

export type AttackDetailsPanelPaths = 'overview' | 'table' | 'json';

export interface AttackDetailsPanelTabType {
  id: AttackDetailsPanelPaths;
  name: ReactElement;
  content: React.ReactElement;
  'data-test-subj': string;
}
