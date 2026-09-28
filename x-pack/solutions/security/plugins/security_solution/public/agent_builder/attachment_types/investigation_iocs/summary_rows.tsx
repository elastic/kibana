/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactNode } from 'react';
import { i18n } from '@kbn/i18n';
import { AttachmentSummaryGroup, AttachmentSummaryRow } from '@kbn/agentic-investigations-common';
import { parseIocCategoryRows } from './parse_iocs';

const IOCS_TITLE = i18n.translate(
  'xpack.securitySolution.agentBuilder.investigationIocs.summaryTitle',
  { defaultMessage: 'Indicators of compromise' }
);

const indicatorIconLabel = (category: string, comment?: string) =>
  comment
    ? i18n.translate('xpack.securitySolution.agentBuilder.investigationIocs.indicatorIconTooltip', {
        defaultMessage: '{category} — {comment}',
        values: { category, comment },
      })
    : category;

/** Read-only indicator section for the investigation flyout summary. */
export const renderInvestigationIocsSummary = (attachment: { data?: unknown }): ReactNode => {
  const categories = parseIocCategoryRows(attachment.data);
  if (categories.length === 0) {
    return null;
  }

  const rows = categories.flatMap(({ id, typeLabel, items }) =>
    items.map((item, index) => (
      <AttachmentSummaryRow
        key={`${id}-${item.value}-${index}`}
        label={item.value}
        typeName={typeLabel}
        iconType="flag"
        iconLabel={indicatorIconLabel(typeLabel, item.comment)}
      />
    ))
  );

  return <AttachmentSummaryGroup title={IOCS_TITLE} rows={rows} />;
};
