/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useCallback, useState } from 'react';
import type { ComponentType } from 'react';
import { css } from '@emotion/react';
import { GroupedAttachmentRow } from '@kbn/agentic-investigations-common';
import type { FlyoutGroupedAttachmentRendererProps } from '@kbn/agentic-investigations-common';
import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import type { SecurityCanvasEmbeddedBundle } from '../../components/security_redux_embedded_provider';
import { IOCS_TITLE, ENDPOINT_ANALYSIS_SUBTITLE } from '../grouped_attachments';
import { parseIocCategoryRows } from './parse_iocs';
import type { IocCategoryRow } from './parse_iocs';

const LazyIocsFlyoutOpener = React.lazy(() =>
  import(
    /* webpackChunkName: "security_investigation_iocs_flyout" */
    './open_iocs_flyout_on_mount'
  ).then((m) => ({ default: m.InvestigationIocsFlyoutOpener }))
);

export interface IocsGroupRendererDeps {
  resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>;
}

const IocsRow = ({
  categories,
  resolveSecurityCanvasContext,
}: {
  categories: IocCategoryRow[];
  resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>;
}) => {
  const [openCount, setOpenCount] = useState(0);
  const handleClick = useCallback(() => setOpenCount((count) => count + 1), []);

  return (
    <GroupedAttachmentRow
      iconType="radar"
      iconColor="subdued"
      title={IOCS_TITLE}
      subtitle={ENDPOINT_ANALYSIS_SUBTITLE}
      action={{ kind: 'flyout', onClick: handleClick }}
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
    </GroupedAttachmentRow>
  );
};

const firstIocRow = (
  attachments: UnknownAttachment[]
): { id: string; categories: IocCategoryRow[] } | undefined => {
  for (const attachment of attachments) {
    const categories = parseIocCategoryRows(attachment.data);
    if (categories.length > 0) {
      return { id: attachment.id, categories };
    }
  }
};

export const createIocsGroupRenderer = ({
  resolveSecurityCanvasContext,
}: IocsGroupRendererDeps): ComponentType<FlyoutGroupedAttachmentRendererProps> => {
  const IocsGroupRenderer = ({ attachments }: FlyoutGroupedAttachmentRendererProps) => {
    const iocRow = firstIocRow(attachments);
    return (
      <>
        {iocRow ? (
          <IocsRow
            key={iocRow.id}
            categories={iocRow.categories}
            resolveSecurityCanvasContext={resolveSecurityCanvasContext}
          />
        ) : null}
      </>
    );
  };

  return IocsGroupRenderer;
};
