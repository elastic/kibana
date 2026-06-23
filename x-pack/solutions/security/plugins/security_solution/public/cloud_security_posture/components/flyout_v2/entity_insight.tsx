/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EntityInsight as EntityInsightBase } from '../entity_insight';

export type { CloudPostureEntityIdentifier } from '../entity_insight';

export type EntityInsightProps = Omit<
  React.ComponentProps<typeof EntityInsightBase>,
  'isPreviewMode'
>;

/**
 * Flyout v2 wrapper around the context-agnostic {@link EntityInsightBase}.
 * The v2 flyout always renders the insights in their non-expandable form, so it
 * composes the v1 component with `isPreviewMode` pinned on rather than duplicating it.
 */
export const EntityInsight = (props: EntityInsightProps) => (
  <EntityInsightBase {...props} isPreviewMode />
);
