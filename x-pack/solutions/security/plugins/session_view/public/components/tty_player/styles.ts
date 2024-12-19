/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { CSSObject, css } from '@emotion/react';
import { transparentize } from '@elastic/eui';
import { useEuiTheme } from '../../hooks';
import type { Teletype } from '../../../common';

export const useStyles = (tty?: Teletype, show?: boolean) => {
  const { euiTheme, euiVars } = useEuiTheme();
  const cached = useMemo(() => {
    const { size, font, colors, border } = euiTheme;

    const container: CSSObject = {
      position: 'absolute',
      top: 0,
      opacity: show ? 1 : 0,
      transition: 'opacity .2s',
      pointerEvents: show ? 'auto' : 'none',
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      zIndex: 10,
      '.euiRangeTick,.euiRangeLevel': {
        transition: 'left 500ms',
      },
    };

    const header: CSSObject = {
      visibility: show ? 'visible' : 'hidden',
      backgroundColor: `${euiVars.euiFormBackgroundDisabledColor}`,
      padding: `${size.m} ${size.base}`,
    };

    const windowBoundsColor = transparentize(colors.ghost, 0.6);

    const terminal: CSSObject = {
      minHeight: '100%',
      '.xterm': css`
        display: inline-block;
      `,
      '.xterm-screen': css`
        overflow-y: visible;
        border: ${border.width.thin} dotted ${windowBoundsColor};
        border-top: 0;
        border-left: 0;
        box-sizing: content-box;
      `,
    };

    if (tty?.rows) {
      terminal['.xterm-screen:after'] = css`
        position: absolute;
        right: ${size.s};
        top: ${size.s};
        content: '${tty?.columns}x${tty?.rows}';
        color: ${windowBoundsColor};
        font-family: ${font.familyCode};
        font-size: ${size.m};
      `;
    }

    const scrollPane: CSSObject = {
      position: 'relative',
      transform: `translateY(${show ? 0 : '100%'})`,
      transition: 'transform .2s ease-in-out',
      width: '100%',
      height: 'calc(100% - 112px)',
      overflow: 'auto',
      backgroundColor: colors.ink,
    };

    return {
      container,
      header,
      terminal,
      scrollPane,
    };
  }, [euiTheme, show, euiVars.euiFormBackgroundDisabledColor, tty?.rows, tty?.columns]);

  return cached;
};
