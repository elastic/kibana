/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense, useCallback, useState } from 'react';
import type { FlyoutDescriptor } from '../../../flyout_v2/shared/url_state/flyout_v2_url_param';
import type { SecurityCanvasEmbeddedBundle } from '../../components/security_redux_embedded_provider';
import { ActionPill } from './attachment_pill';

const LazyOpener = lazy(() =>
  import('./flyout_opener').then(({ ConversationDetailsFlyoutOpener }) => ({
    default: ConversationDetailsFlyoutOpener,
  }))
);

interface UseFlyoutPillOptions {
  label: string;
  resolveDescriptor: () => Promise<FlyoutDescriptor | null>;
  resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>;
}

/**
 * Returns an `<ActionPill>` that, on click, mounts a hidden flyout opener inside a zero-size
 * container. Bumping `openCount` remounts the opener so re-clicks work after the flyout is closed.
 */
export const useFlyoutPill = ({
  label,
  resolveDescriptor,
  resolveSecurityCanvasContext,
}: UseFlyoutPillOptions): React.ReactNode => {
  const [openCount, setOpenCount] = useState(0);

  const handleClick = useCallback(() => {
    setOpenCount((c) => c + 1);
  }, []);

  return (
    <>
      <ActionPill label={label} onClick={handleClick} />
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
};
