/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLocation } from 'react-router-dom';
import type { VectorPath } from './snippets';

const isVectorPath = (value: string): value is VectorPath =>
  value === 'have-vectors' || value === 'generate-vectors';

export const useWizardPath = (): VectorPath | null => {
  const { search } = useLocation();
  const value = new URLSearchParams(search).get('path');
  return value && isVectorPath(value) ? value : null;
};

export const pathQuery = (path: VectorPath): string => `?path=${path}`;
