/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityChipColors } from '.';
import { getEntityChipStyles } from '.';

const colors: EntityChipColors = {
  backgroundBaseDanger: 'BACKGROUND_BASE_DANGER',
  backgroundBaseInteractiveHover: 'BACKGROUND_BASE_INTERACTIVE_HOVER',
  borderStrongDanger: 'BORDER_STRONG_DANGER',
  emptyShade: 'EMPTY_SHADE',
};

const defaultParams = {
  borderColor: 'BORDER_COLOR',
  colors,
  hoverBorderColor: 'HOVER_BORDER_COLOR',
  isActive: false,
};

describe('getEntityChipStyles', () => {
  it('draws a pill', () => {
    expect(getEntityChipStyles(defaultParams).borderRadius).toEqual('9999px');
  });

  it('gives every chip the same height, so a wrapped row stays even', () => {
    expect(getEntityChipStyles(defaultParams).height).toEqual('32px');
  });

  it('sits an inactive chip on the panel background', () => {
    expect(getEntityChipStyles(defaultParams).background).toEqual('EMPTY_SHADE');
  });

  it('borders an inactive chip in the ordinary border colour', () => {
    expect(getEntityChipStyles(defaultParams).border).toEqual('1px solid BORDER_COLOR');
  });

  /** The blast radius is what an attack reached, so the chip filtering by it reads as danger. */
  it('fills an active chip with the danger background', () => {
    expect(getEntityChipStyles({ ...defaultParams, isActive: true }).background).toEqual(
      'BACKGROUND_BASE_DANGER'
    );
  });

  it('borders an active chip in the strong danger colour', () => {
    expect(getEntityChipStyles({ ...defaultParams, isActive: true }).border).toEqual(
      '1px solid BORDER_STRONG_DANGER'
    );
  });

  it('lifts an inactive chip on hover', () => {
    expect(getEntityChipStyles(defaultParams)['&:hover']).toEqual({
      background: 'BACKGROUND_BASE_INTERACTIVE_HOVER',
      borderColor: 'HOVER_BORDER_COLOR',
    });
  });

  /** Hovering the chip that is already filtering must not look like it would turn the filter off. */
  it('leaves an active chip unchanged on hover', () => {
    expect(getEntityChipStyles({ ...defaultParams, isActive: true })['&:hover']).toEqual({
      background: 'BACKGROUND_BASE_DANGER',
      borderColor: 'BORDER_STRONG_DANGER',
    });
  });

  it('interpolates whatever the theme provides, rather than hard-coded colours', () => {
    expect(getEntityChipStyles(defaultParams)).toEqual({
      alignItems: 'center',
      background: 'EMPTY_SHADE',
      border: '1px solid BORDER_COLOR',
      borderRadius: '9999px',
      boxSizing: 'border-box',
      cursor: 'pointer',
      display: 'inline-flex',
      gap: 0,
      height: '32px',
      padding: '0 6px',
      transition: 'background 0.15s ease, border-color 0.15s ease',
      '&:hover': {
        background: 'BACKGROUND_BASE_INTERACTIVE_HOVER',
        borderColor: 'HOVER_BORDER_COLOR',
      },
    });
  });
});
