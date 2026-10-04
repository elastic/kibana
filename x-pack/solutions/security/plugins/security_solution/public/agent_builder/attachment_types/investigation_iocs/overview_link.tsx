/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useState } from 'react';
import type { ReactNode } from 'react';
import { css } from '@emotion/react';
import { EuiLink, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SecurityCanvasEmbeddedBundle } from '../../components/security_redux_embedded_provider';
import { parseIocCategoryRows } from './parse_iocs';
import type { IocCategoryRow } from './parse_iocs';

const IOCS_LINK_TEXT = i18n.translate(
  'xpack.securitySolution.agentBuilder.investigationIocs.overviewLinkText',
  { defaultMessage: 'IOCs' }
);

const LazyIocsFlyoutOpener = React.lazy(() =>
  import(
    /* webpackChunkName: "security_investigation_iocs_flyout" */
    './open_iocs_flyout_on_mount'
  ).then((m) => ({ default: m.InvestigationIocsFlyoutOpener }))
);

interface IocsOverviewLinkProps {
  categories: IocCategoryRow[];
  resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>;
}

const IocsOverviewLink = ({ categories, resolveSecurityCanvasContext }: IocsOverviewLinkProps) => {
  const [openCount, setOpenCount] = useState(0);

  return (
    <EuiText size="s">
      <EuiLink
        color="primary"
        data-test-subj="investigationIocsOverviewLink"
        onClick={(event) => {
          event.currentTarget.blur();
          setOpenCount((count) => count + 1);
        }}
      >
        {IOCS_LINK_TEXT}
      </EuiLink>
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
    </EuiText>
  );
};

/** IOCs link for the conversation details flyout. The click opens the indicators flyout. */
export const renderInvestigationIocsDetails = (
  attachment: { data?: unknown },
  resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>
): ReactNode => {
  const categories = parseIocCategoryRows(attachment.data);
  if (categories.length === 0) {
    return null;
  }

  return (
    <IocsOverviewLink
      categories={categories}
      resolveSecurityCanvasContext={resolveSecurityCanvasContext}
    />
  );
};
