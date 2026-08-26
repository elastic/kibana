/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import type { Filter } from '@kbn/es-query';

export interface AttacksKpiPanelBaseProps {
  /** Filters to apply to the panel query */
  filters?: Filter[];
  /** The title component for the panel */
  title: ReactNode;
  /** Whether the panel is expanded */
  isExpanded: boolean;
  /** Callback to toggle expansion state */
  setIsExpanded: (isExpanded: boolean) => void;
}
