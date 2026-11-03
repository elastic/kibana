/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Reference } from '@kbn/content-management-utils';
import type { DrilldownTransforms } from '@kbn/embeddable-plugin/common';
import type { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import { UX_OVERVIEW_PANEL_EMBEDDABLE_ID } from '../../common/embeddables/overview_panel/constants';
import {
  getUxOverviewPanelEmbeddableSchema,
  type UxOverviewPanelEmbeddableState,
} from './overview_panel_schema';

export const registerUxOverviewPanelEmbeddable = (embeddable: EmbeddableSetup): void => {
  embeddable.registerEmbeddableServerDefinition(UX_OVERVIEW_PANEL_EMBEDDABLE_ID, {
    title: 'User Experience overview panel',
    getSchema: getUxOverviewPanelEmbeddableSchema,
    getTransforms: (_drilldownTransforms: DrilldownTransforms) => ({
      transformOut: (state: UxOverviewPanelEmbeddableState) => state,
      transformIn: (state: UxOverviewPanelEmbeddableState) => ({
        state,
        references: [] as Reference[],
      }),
    }),
  });
};
