/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import { useDocViewerFlyoutId } from '@kbn/unified-doc-viewer-plugin/public';

/**
 * Identifies the doc viewer session the flyout chain of `hit` belongs to: the doc viewer instance
 * and the document it displays. Closing and reopening the doc viewer, or showing the document in
 * another Discover tab, starts a new session.
 */
export const useDocViewerFlyoutChainSessionKey = ({ id: hitId }: DataTableRecord): string => {
  const docViewerFlyoutId = useDocViewerFlyoutId();
  return `${docViewerFlyoutId ?? ''}:${hitId}`;
};
