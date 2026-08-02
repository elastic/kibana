/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CSSObject } from '@emotion/react';
import type { EuiThemeComputed } from '@elastic/eui';

/** The chip's pill radius, larger than any chip is tall so both ends stay semicircular. */
const CHIP_BORDER_RADIUS_PX = 9999;

/** Every chip is the same height, so a wrapped row of them stays even. */
const CHIP_HEIGHT_PX = 32;

/** The tokens a chip interpolates, narrowed so a renamed one fails the type check. */
export type EntityChipColors = Pick<
  EuiThemeComputed['colors'],
  'backgroundBaseDanger' | 'backgroundBaseInteractiveHover' | 'borderStrongDanger' | 'emptyShade'
>;

export interface GetEntityChipStylesParams {
  /** The resting border colour, `euiTheme.border.color`. */
  borderColor: string;
  colors: EntityChipColors;
  /** The border colour under the pointer, `euiTheme.components.forms.borderHovered`. */
  hoverBorderColor: string;
  /** `true` when this chip is the filter the queue is currently under. */
  isActive: boolean;
}

/**
 * The pill an entity is drawn as, ported from the prototype's `useEntityChipStyles` at `10e153f`.
 *
 * The active state is danger-toned rather than primary-toned because of what a blast radius chip
 * says: this host, or this account, is inside what the attack reached. Its hover state deliberately
 * does not move — a chip that lightened under the pointer would read as an invitation to turn the
 * filter off, when pressing it is what turns it off.
 */
export const getEntityChipStyles = ({
  borderColor,
  colors,
  hoverBorderColor,
  isActive,
}: GetEntityChipStylesParams): CSSObject => ({
  alignItems: 'center',
  background: isActive ? colors.backgroundBaseDanger : colors.emptyShade,
  border: `1px solid ${isActive ? colors.borderStrongDanger : borderColor}`,
  borderRadius: `${CHIP_BORDER_RADIUS_PX}px`,
  boxSizing: 'border-box',
  cursor: 'pointer',
  display: 'inline-flex',
  gap: 0,
  height: `${CHIP_HEIGHT_PX}px`,
  padding: '0 6px',
  transition: 'background 0.15s ease, border-color 0.15s ease',
  '&:hover': {
    background: isActive ? colors.backgroundBaseDanger : colors.backgroundBaseInteractiveHover,
    borderColor: isActive ? colors.borderStrongDanger : hoverBorderColor,
  },
});
