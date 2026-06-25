/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, useMemo, useState } from 'react';
import { css, keyframes } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';

const FLASH_DURATION_S = 1;
const FLASH_ITERATIONS = 2;

const createFlashRingAnimation = (primaryColor: string) => keyframes`
  0%, 100% {
    opacity: 0;
    box-shadow: 0 0 0 0 ${primaryColor};
  }
  50% {
    opacity: 1;
    box-shadow: 0 0 0 1px ${primaryColor};
  }
`;

interface ArtifactEntryHighlightWrapperProps {
  isActive: boolean;
  flashKey?: number;
  children: React.ReactNode;
}

export const ArtifactEntryHighlightWrapper = memo(function ArtifactEntryHighlightWrapper({
  isActive,
  flashKey,
  children,
}: ArtifactEntryHighlightWrapperProps): JSX.Element {
  const { euiTheme } = useEuiTheme();
  const [activeFlashKey, setActiveFlashKey] = useState<number | undefined>();

  useEffect(() => {
    if (!isActive || flashKey === undefined) {
      setActiveFlashKey(undefined);
      return;
    }

    setActiveFlashKey(undefined);
    const frame = window.requestAnimationFrame(() => {
      setActiveFlashKey(flashKey);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [flashKey, isActive]);

  const styles = useMemo(
    () => ({
      wrapper: css`
        position: relative;
      `,
      ring: css`
        position: absolute;
        inset: -2px;
        border: 2px solid ${euiTheme.colors.primary};
        border-radius: ${euiTheme.border.radius.medium};
        pointer-events: none;
        z-index: 1;
        animation: ${createFlashRingAnimation(euiTheme.colors.primary)}
          ${FLASH_DURATION_S / FLASH_ITERATIONS}s ease-in-out ${FLASH_ITERATIONS};
      `,
    }),
    [euiTheme.border.radius.medium, euiTheme.colors.primary]
  );

  if (!isActive) {
    return <>{children}</>;
  }

  return (
    <div css={styles.wrapper}>
      {activeFlashKey !== undefined && <div key={activeFlashKey} css={styles.ring} aria-hidden />}
      {children}
    </div>
  );
});
