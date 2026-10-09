/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { DocViewRestorableStateProps } from '@kbn/unified-doc-viewer/types';
import { flyoutChainSchema } from './flyout_descriptor_schema';

/**
 * Shareable state schema for Security doc views in Discover: the open flyout chain (root and
 * optional child), in the same descriptor format as the `flyoutV2` URL param.
 */
export const flyoutV2DocViewerStateSchema = z.object({
  flyoutV2: flyoutChainSchema.optional(),
});

export type FlyoutV2DocViewerState = z.infer<typeof flyoutV2DocViewerStateSchema>;

/** The doc view state props of Security overview tabs rendered in Discover's doc viewer. */
export type FlyoutV2DocViewerStateProps = DocViewRestorableStateProps<FlyoutV2DocViewerState>;
