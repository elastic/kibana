/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import type { EsHitRecord } from '@kbn/discover-utils';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { AISummarySection as V2AISummarySection } from '../../../flyout_v2/attack/main/components/ai_summary_section';
import { useAttackDetailsContext } from '../context';

/**
 * Legacy bridge for the AI Summary section.
 * Reads searchHit from context, builds a DataTableRecord hit, and delegates to v2 AISummarySection.
 */
export const AISummarySection = memo(() => {
  const { searchHit } = useAttackDetailsContext();
  const hit = useMemo(() => buildDataTableRecord(searchHit as EsHitRecord), [searchHit]);
  return <V2AISummarySection hit={hit} />;
});

AISummarySection.displayName = 'AISummarySection';
