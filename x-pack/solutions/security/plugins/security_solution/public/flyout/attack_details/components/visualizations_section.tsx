/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import type { EsHitRecord } from '@kbn/discover-utils';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { VisualizationsSection as V2VisualizationsSection } from '../../../flyout_v2/attack/main/components/visualizations_section';
import { useAttackDetailsContext } from '../context';

/**
 * Legacy bridge for the Visualizations section.
 * Reads searchHit from context, builds a DataTableRecord hit, and delegates to v2 VisualizationsSection.
 */
export const VisualizationsSection = memo(() => {
  const { searchHit } = useAttackDetailsContext();
  const hit = useMemo(() => buildDataTableRecord(searchHit as EsHitRecord), [searchHit]);
  return <V2VisualizationsSection hit={hit} />;
});

VisualizationsSection.displayName = 'VisualizationsSection';
