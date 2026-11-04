/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { useEuiShadow, useEuiTheme } from '@elastic/eui';

const PLATE_COUNT = 3;
const PLATE_SIZE_PX = 40;
const PLATE_OVERLAP_PX = 24;
const LOGO_SIZE_PX = 20;

/**
 * Piled logo plates for a card that stands for many sources: the same 40px rounded plates as
 * the other source cards, overlapped like an avatar group, the front one showing a logo.
 */
export function LogoStack({
  frontLogoSrc,
  'data-test-subj': dataTestSubj,
}: {
  frontLogoSrc: string;
  'data-test-subj'?: string;
}): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const plateShadow = useEuiShadow('xs');

  const stackStyles = css`
    display: flex;
    align-items: center;
    flex-shrink: 0;
  `;
  const plateStyles = (index: number) => css`
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: ${PLATE_SIZE_PX}px;
    height: ${PLATE_SIZE_PX}px;
    margin-left: ${index === 0 ? 0 : -PLATE_OVERLAP_PX}px;
    border-radius: ${euiTheme.size.s};
    background: ${euiTheme.colors.backgroundBasePlain};
    border: 2px solid ${euiTheme.colors.emptyShade};
    position: relative;
    z-index: ${PLATE_COUNT - index};
    overflow: hidden;
    ${plateShadow}
  `;
  const logoStyles = css`
    display: block;
    width: ${LOGO_SIZE_PX}px;
    height: ${LOGO_SIZE_PX}px;
    object-fit: contain;
  `;

  return (
    <span css={stackStyles} aria-hidden={true} data-test-subj={dataTestSubj}>
      {Array.from({ length: PLATE_COUNT }, (_, index) => (
        <span key={index} css={plateStyles(index)}>
          {index === 0 ? <img src={frontLogoSrc} alt="" css={logoStyles} /> : null}
        </span>
      ))}
    </span>
  );
}
