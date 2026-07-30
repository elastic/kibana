/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';

export type WizardStep = 'ingest' | 'search';
export type VectorPath = 'have-vectors' | 'generate-vectors';

export interface DocsPanelProps {
  id: string;
  title: string;
  description: ReactNode;
  docsLabel: string;
  docsHref: string;
}

export interface OnboardingPill {
  id: string;
  label: string;
  content: ReactNode;
}
