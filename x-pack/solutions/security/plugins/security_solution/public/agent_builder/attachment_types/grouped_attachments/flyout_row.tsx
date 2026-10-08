/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, memo, useCallback, useState } from 'react';
import { css } from '@emotion/react';
import { GroupedAttachmentRow } from '@kbn/agentic-investigations-common';
import type { GroupedAttachmentRowProps } from '@kbn/agentic-investigations-common';
import type { FlyoutDescriptor } from '../../../flyout_v2/shared/url_state/flyout_v2_url_param';
import type { SecurityCanvasEmbeddedBundle } from '../../components/security_redux_embedded_provider';

const LazyFlyoutOpener = React.lazy(() =>
  import(
    /* webpackChunkName: "security_grouped_attachment_flyout_opener" */
    './flyout_opener'
  ).then((m) => ({ default: m.GroupedAttachmentFlyoutOpener }))
);

interface FlyoutRowProps extends Omit<GroupedAttachmentRowProps, 'action' | 'children'> {
  descriptor: FlyoutDescriptor;
  resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>;
}

export const FlyoutRow = memo<FlyoutRowProps>(
  ({ descriptor, resolveSecurityCanvasContext, ...rowProps }) => {
    const [openCount, setOpenCount] = useState(0);
    const handleClick = useCallback(() => setOpenCount((count) => count + 1), []);

    return (
      <GroupedAttachmentRow {...rowProps} action={{ kind: 'flyout', onClick: handleClick }}>
        {openCount > 0 ? (
          <div css={css({ display: 'none' })} key={openCount}>
            <Suspense fallback={null}>
              <LazyFlyoutOpener
                descriptor={descriptor}
                resolveSecurityCanvasContext={resolveSecurityCanvasContext}
              />
            </Suspense>
          </div>
        ) : null}
      </GroupedAttachmentRow>
    );
  }
);

FlyoutRow.displayName = 'FlyoutRow';
