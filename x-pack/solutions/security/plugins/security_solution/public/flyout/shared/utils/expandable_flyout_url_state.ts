/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode } from '@kbn/rison';

/**
 * Minimal expandable flyout state for URL serialization: right panel only, no left, empty preview.
 */
export const expandableFlyoutStateRightPanelOnly = ({
  id,
  params,
}: {
  id: string;
  params: Record<string, unknown>;
}) => ({
  right: {
    id,
    params,
  },
  left: undefined,
  preview: [],
});

/**
 * If the user already has flyout parameters in the URL (e.g. from a prior share link), keep them.
 * Otherwise encode the provided default state as a rison string.
 */
export const resolveFlyoutUrlParam = (
  currentParamsString: string | null,
  defaultState: Parameters<typeof encode>[0]
): string => {
  if (currentParamsString) {
    return currentParamsString;
  }

  return encode(defaultState);
};
