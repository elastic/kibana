/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EntityType } from '../../../../common/entity_analytics/types';
import type { RiskSummaryProps as RiskSummaryBaseProps } from '../risk_summary_flyout/risk_summary';
import { FlyoutRiskSummary as FlyoutRiskSummaryBase } from '../risk_summary_flyout/risk_summary';

export type RiskSummaryProps<T extends EntityType> = Omit<RiskSummaryBaseProps<T>, 'isPreviewMode'>;

/**
 * Flyout v2 wrapper around the context-agnostic {@link FlyoutRiskSummaryBase}.
 * The v2 flyout always renders the risk panels in their non-expandable form, so it
 * composes the v1 component with `isPreviewMode` pinned on rather than duplicating it.
 */
export const FlyoutRiskSummary = <T extends EntityType>(props: RiskSummaryProps<T>) => (
  <FlyoutRiskSummaryBase {...(props as RiskSummaryBaseProps<T>)} isPreviewMode />
);

FlyoutRiskSummary.displayName = 'RiskSummary';
