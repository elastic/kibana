/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { FlyoutV2UrlParamValue } from './flyout_v2_url_param';
import { FLYOUT_DESCRIPTOR_KIND } from './flyout_v2_url_param';

const MAX_DESCRIPTOR_STRING_LENGTH = 1024;
const MAX_DESCRIPTOR_ARRAY_SIZE = 100;

const descriptorValueSchema = z.union([
  z.string().max(MAX_DESCRIPTOR_STRING_LENGTH),
  z.array(z.string().max(MAX_DESCRIPTOR_STRING_LENGTH)).max(MAX_DESCRIPTOR_ARRAY_SIZE),
]);

// Descriptors only hold identifying strings (or string arrays), so every field other than `kind`
// is bounded generically; per-kind shapes are trusted by the restorers, as for the URL param.
const flyoutDescriptorSchema = z
  .object({ kind: z.enum(FLYOUT_DESCRIPTOR_KIND) })
  .catchall(descriptorValueSchema);

/**
 * Shareable state schema for Security doc views in Discover: the open flyout chain (root and
 * optional child), in the same descriptor format as the `flyoutV2` URL param.
 */
export const flyoutV2DocViewerStateSchema = z.object({
  flyoutV2: z.array(flyoutDescriptorSchema).min(1).max(2).optional(),
});

export interface FlyoutV2DocViewerState {
  flyoutV2?: FlyoutV2UrlParamValue;
}
