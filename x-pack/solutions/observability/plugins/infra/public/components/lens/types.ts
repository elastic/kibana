/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRange } from '@kbn/es-query';
import type { LensAttributes } from '@kbn/lens-embeddable-utils/config_builder';
import type { LensEmbeddableInput, TypedLensByValueInput } from '@kbn/lens-plugin/public';
import type { Action } from '@kbn/ui-actions-plugin/public';

export type LensWrapperProps = Omit<
  TypedLensByValueInput,
  'timeRange' | 'attributes' | 'viewMode'
> & {
  attributes: LensAttributes | null;
  dateRange: TimeRange;
  extraActions: Action[];
  loading?: boolean;
};

export type BrushEndArgs = Parameters<NonNullable<LensEmbeddableInput['onBrushEnd']>>[0];
export type OnFilterEvent = Parameters<NonNullable<LensEmbeddableInput['onFilter']>>[0];

export type BaseChartProps = Pick<
  LensWrapperProps,
  | 'id'
  | 'dateRange'
  | 'disableTriggers'
  | 'filters'
  | 'hidePanelTitles'
  | 'lastReloadRequestTime'
  | 'loading'
  | 'overrides'
  | 'onBrushEnd'
  | 'onFilter'
  | 'query'
  | 'title'
> & {
  height?: number;
};
