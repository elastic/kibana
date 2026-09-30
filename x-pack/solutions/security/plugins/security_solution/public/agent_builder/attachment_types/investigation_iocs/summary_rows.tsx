/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useState } from 'react';
import type { ReactNode } from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { AttachmentSummaryGroup, AttachmentSummaryRow } from '@kbn/agentic-investigations-common';
import type { SecurityCanvasEmbeddedBundle } from '../../components/security_redux_embedded_provider';
import { parseIocCategoryRows } from './parse_iocs';
import type { IocCategoryRow } from './parse_iocs';

const IOCS_TITLE = i18n.translate(
  'xpack.securitySolution.agentBuilder.investigationIocs.summaryTitle',
  { defaultMessage: 'IOC' }
);

const IOCS_TYPE_NAME = i18n.translate(
  'xpack.securitySolution.agentBuilder.investigationIocs.summaryTypeLabel',
  { defaultMessage: 'IOC' }
);

const LazyIocsFlyoutOpener = React.lazy(() =>
  import(
    /* webpackChunkName: "security_investigation_iocs_flyout" */
    './open_iocs_flyout_on_mount'
  ).then((m) => ({ default: m.InvestigationIocsFlyoutOpener }))
);

interface IocsSummaryRowProps {
  label: string;
  categories: IocCategoryRow[];
  resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>;
}

const IocsSummaryRow = ({
  label,
  categories,
  resolveSecurityCanvasContext,
}: IocsSummaryRowProps) => {
  const [openCount, setOpenCount] = useState(0);

  return (
    <AttachmentSummaryRow
      label={label}
      typeName={IOCS_TYPE_NAME}
      iconType="radar"
      onClick={() => setOpenCount((count) => count + 1)}
    >
      {openCount > 0 ? (
        <div css={css({ display: 'none' })} key={openCount}>
          <Suspense fallback={null}>
            <LazyIocsFlyoutOpener
              categories={categories}
              resolveSecurityCanvasContext={resolveSecurityCanvasContext}
            />
          </Suspense>
        </div>
      ) : null}
    </AttachmentSummaryRow>
  );
};

/** One clickable row for an investigation indicators attachment. The values open in a flyout. */
export const renderInvestigationIocsSummary = (
  attachment: { data?: unknown },
  resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>
): ReactNode => {
  const categories = parseIocCategoryRows(attachment.data);
  if (categories.length === 0) {
    return null;
  }

  return (
    <AttachmentSummaryGroup
      title={IOCS_TITLE}
      rows={[
        <IocsSummaryRow
          key="iocs"
          label={categories.map((category) => category.shortLabel).join(', ')}
          categories={categories}
          resolveSecurityCanvasContext={resolveSecurityCanvasContext}
        />,
      ]}
    />
  );
};
