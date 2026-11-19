/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import type { UseEuiTheme } from '@elastic/eui';

export const tile = () =>
  css({
    flexGrow: 1,
    blockSize: '100%',
  });

export const disabledTile = ({ euiTheme }: UseEuiTheme) =>
  css({
    flexGrow: 1,
    blockSize: '100%',
    cursor: 'not-allowed',
    color: euiTheme.colors.textDisabled,
  });

export const tileTitle = ({ euiTheme }: UseEuiTheme) =>
  css({
    fontWeight: euiTheme.font.weight.semiBold,
  });

export const selectedTile = ({ euiTheme }: UseEuiTheme) =>
  css({
    flexGrow: 1,
    blockSize: '100%',
    borderColor: euiTheme.colors.borderStrongPrimary,
  });

export const sourcePicker = ({ euiTheme }: UseEuiTheme) =>
  css({
    minInlineSize: euiTheme.base * 14,
    maxInlineSize: euiTheme.base * 24,
  });

/** Keeps the headings of side-by-side panels on one line whether or not they carry a button. */
export const panelHeader = ({ euiTheme }: UseEuiTheme) =>
  css({
    minBlockSize: euiTheme.size.xl,
  });

/** A heading that only receives focus from code, where a focus ring would read as a selection. */
export const focusTargetHeading = () =>
  css({
    '&:focus': { outline: 'none' },
  });

export const readableLine = ({ euiTheme }: UseEuiTheme) =>
  css({
    maxInlineSize: euiTheme.base * 45,
  });

/** The height, in pixels, every expanded query takes while generated queries may replace the built-in ones. */
export const STABLE_QUERY_CODE_SIZE = 192;

export const stableQueryCode = () =>
  css({
    minBlockSize: STABLE_QUERY_CODE_SIZE,
  });

/** Room for the note under the explore description, kept whether or not there is one to show. */
export const reservedNote = ({ euiTheme }: UseEuiTheme) =>
  css({
    minBlockSize: euiTheme.size.xl,
  });

/** Room for the line that says where the questions came from, kept while it is empty. */
export const generationStatusRow = ({ euiTheme }: UseEuiTheme) =>
  css({
    minBlockSize: euiTheme.size.l,
    marginBlockStart: euiTheme.size.s,
  });
