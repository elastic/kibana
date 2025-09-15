/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReactNode } from 'react';

export interface AlertDetailsSource {
  label: ReactNode | string;
  value: ReactNode | string | number;
}

export interface AlertDetailsAppSectionProps {
  setSources: React.Dispatch<React.SetStateAction<AlertDetailsSource[] | undefined>>;
}

export const TAB_IDS = [
  'overview',
  'metadata',
  'related_alerts',
  'investigation_guide',
  'related_dashboards',
] as const;

export type TabId = (typeof TAB_IDS)[number];
