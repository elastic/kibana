/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useAttackDetailsContext } from '../context';
import { getField } from '../../document_details/shared/utils';

const FIELD_SUMMARY_MARKDOWN = 'kibana.alert.attack_discovery.summary_markdown' as const;
const FIELD_SUMMARY_MARKDOWN_WITH_REPLACEMENTS =
  'kibana.alert.attack_discovery.summary_markdown_with_replacements' as const;
const FIELD_DETAILS_MARKDOWN = 'kibana.alert.attack_discovery.details_markdown' as const;
const FIELD_DETAILS_MARKDOWN_WITH_REPLACEMENTS =
  'kibana.alert.attack_discovery.details_markdown_with_replacements' as const;

/**
 * Centralized hook for Attack overview tab only
 */
export const useOverviewTabData = () => {
  const { getFieldsData } = useAttackDetailsContext();

  const summaryMarkdown = useMemo(
    () => getField(getFieldsData(FIELD_SUMMARY_MARKDOWN)) ?? '',
    [getFieldsData]
  );
  const summaryMarkdownWithReplacements = useMemo(
    () => getField(getFieldsData(FIELD_SUMMARY_MARKDOWN_WITH_REPLACEMENTS)) ?? '',
    [getFieldsData]
  );
  const detailsMarkdown = useMemo(
    () => getField(getFieldsData(FIELD_DETAILS_MARKDOWN)) ?? '',
    [getFieldsData]
  );
  const detailsMarkdownWithReplacements = useMemo(
    () => getField(getFieldsData(FIELD_DETAILS_MARKDOWN_WITH_REPLACEMENTS)) ?? '',
    [getFieldsData]
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
