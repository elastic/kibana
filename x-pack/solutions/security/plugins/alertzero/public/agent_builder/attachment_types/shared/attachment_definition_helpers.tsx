/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSkeletonText } from '@elastic/eui';
import { ActionButtonType } from '@kbn/agent-builder-browser/attachments';
import type { ActionButton } from '@kbn/agent-builder-browser/attachments';
import type { AttachmentNavigationDeps } from '../navigation';
import { buildDiscoverEsqlUrl } from '../navigation';

/**
 * Builds the single "Open ... in Discover" secondary action button the readonly attachment
 * types all expose, or an empty array when there's nothing to link to (no esql, or no href
 * because share isn't wired up).
 */
export const buildDiscoverActionButton = ({
  share,
  esql,
  label,
}: {
  share: AttachmentNavigationDeps['share'];
  esql: string | undefined;
  label: string;
}): ActionButton[] => {
  if (!esql) {
    return [];
  }
  const href = buildDiscoverEsqlUrl({ share, esql });
  if (!href) {
    return [];
  }
  return [
    {
      label,
      icon: 'discoverApp',
      type: ActionButtonType.SECONDARY,
      href,
      openInNewTab: true,
      handler: () => undefined,
    },
  ];
};

/**
 * Wraps a lazily-imported inline content component in a `Suspense` boundary with the given
 * skeleton line count, so each attachment definition doesn't repeat the same
 * `React.lazy(() => import(...).then(...))` + `Suspense` wrapper.
 */
export const lazyInlineContent = <P extends object>(
  importer: () => Promise<{ default: React.ComponentType<P> }>,
  skeletonLines: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
): React.FC<P> => {
  const LazyComponent = React.lazy(importer) as unknown as React.FC<P>;
  const Wrapped: React.FC<P> = (props) => (
    <React.Suspense fallback={<EuiSkeletonText lines={skeletonLines} />}>
      <LazyComponent {...props} />
    </React.Suspense>
  );
  return Wrapped;
};

/**
 * Joins subtitle parts with the shared ' · ' separator, dropping falsy parts, and returns
 * `undefined` (instead of an empty string) when nothing survives the filter.
 */
export const joinSubtitle = (...parts: Array<string | undefined>): string | undefined => {
  const joined = parts.filter(Boolean).join(' · ');
  return joined || undefined;
};
