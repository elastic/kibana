/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { getFieldValue } from '@kbn/discover-utils';

const FIELD_SUMMARY_MARKDOWN = 'kibana.alert.attack_discovery.summary_markdown' as const;
const FIELD_SUMMARY_MARKDOWN_WITH_REPLACEMENTS =
  'kibana.alert.attack_discovery.summary_markdown_with_replacements' as const;
const FIELD_DETAILS_MARKDOWN = 'kibana.alert.attack_discovery.details_markdown' as const;
const FIELD_DETAILS_MARKDOWN_WITH_REPLACEMENTS =
  'kibana.alert.attack_discovery.details_markdown_with_replacements' as const;

/**
 * Centralized hook for Attack overview tab only.
 *
 * All four summary fields are single-string scalars in the document; reads
 * go through `getFieldValue` (which unwraps single-element arrays).
 */
export const useOverviewTabData = (hit: DataTableRecord) => {
  const summaryMarkdown = useMemo(
    () => (getFieldValue(hit, FIELD_SUMMARY_MARKDOWN) as string | undefined) ?? '',
    [hit]
  );
  const summaryMarkdownWithReplacements = useMemo(
    () =>
      (getFieldValue(hit, FIELD_SUMMARY_MARKDOWN_WITH_REPLACEMENTS) as string | undefined) ?? '',
    [hit]
  );
  const detailsMarkdown = useMemo(
    () => (getFieldValue(hit, FIELD_DETAILS_MARKDOWN) as string | undefined) ?? '',
    [hit]
  );
  const detailsMarkdownWithReplacements = useMemo(
    () =>
      (getFieldValue(hit, FIELD_DETAILS_MARKDOWN_WITH_REPLACEMENTS) as string | undefined) ?? '',
    [hit]
  );

  return useMemo(
    () => ({
      summaryMarkdown,
      summaryMarkdownWithReplacements,
      detailsMarkdown,
      detailsMarkdownWithReplacements,
    }),
    [
      detailsMarkdown,
      detailsMarkdownWithReplacements,
      summaryMarkdown,
      summaryMarkdownWithReplacements,
    ]
  );
};
