/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, memo, Suspense, useCallback, useState } from 'react';
import { EuiBadge } from '@elastic/eui';
import type { FlyoutDescriptor } from '../../../flyout_v2/shared/url_state/flyout_v2_url_param';
import type { SecurityCanvasEmbeddedBundle } from '../../components/security_redux_embedded_provider';

interface LinkPillProps {
  label: string;
  href: string;
}

/** Renders a badge that opens a Security page in a new tab. */
export const LinkPill = ({ label, href }: LinkPillProps) => (
  <EuiBadge href={href} target="_blank" rel="noopener noreferrer" color="hollow">
    {label}
  </EuiBadge>
);

const LazyOpener = lazy(() =>
  import('./flyout_opener').then(({ ConversationDetailsFlyoutOpener }) => ({
    default: ConversationDetailsFlyoutOpener,
  }))
);

interface FlyoutPillProps {
  label: string;
  resolveDescriptor: () => Promise<FlyoutDescriptor | null>;
  resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>;
}

/** Badge that, on click, mounts a hidden flyout opener. Re-clicking after close works via key. */
export const FlyoutPill = memo(
  ({ label, resolveDescriptor, resolveSecurityCanvasContext }: FlyoutPillProps) => {
    const [openCount, setOpenCount] = useState(0);
    const handleClick = useCallback(() => setOpenCount((c) => c + 1), []);

    return (
      <>
        <EuiBadge onClick={handleClick} onClickAriaLabel={label} color="hollow">
          {label}
        </EuiBadge>
        {openCount > 0 && (
          <div style={{ display: 'none' }}>
            <Suspense fallback={null}>
              <LazyOpener
                key={openCount}
                resolveDescriptor={resolveDescriptor}
                resolveSecurityCanvasContext={resolveSecurityCanvasContext}
              />
            </Suspense>
          </div>
        )}
      </>
    );
  }
);
FlyoutPill.displayName = 'FlyoutPill';
