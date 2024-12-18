/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { CSSObject } from '@emotion/react';
import { useEuiTheme } from '../../../hooks';

export const useStyles = (depth: number) => {
  const { euiTheme } = useEuiTheme();

  const cached = useMemo(() => {
    const { size, colors, border } = euiTheme;

    const loadMoreButton: CSSObject = {
      position: 'relative',
      textAlign: 'center',
      width: `calc(100% + ${depth * 24}px)`,
      marginLeft: `-${depth * 24}px`,
      '&::after': {
        content: `''`,
        position: 'absolute',
        top: '50%',
        width: '100%',
        border: `${border.width.thin} dashed ${colors.mediumShade}`,
        left: 0,
      },
      '&:hover, &:focus': {
        backgroundColor: 'transparent',
      },
      '.euiTreeView__nodeLabel': {
        width: '100%',
      },
    };
    const loadMoreBadge: CSSObject = {
      position: 'relative',
      cursor: 'pointer',
      zIndex: 2,
      '.euiBadge__content': {
        gap: size.xs,
      },
    };
    const nonInteractiveItem: CSSObject = {
      pointerEvents: 'none',
      '&:hover, &:focus': {
        backgroundColor: 'transparent',
      },
    };
    const euiTreeViewWrapper: CSSObject = {
      ul: {
        marginLeft: '0 !important',
        fontSize: 'inherit',
      },
      // Override default EUI max-height - `DynamicTreeView` has its own scrolling container
      '.euiTreeView__node': {
        maxBlockSize: 'none',
      },
    };

    return {
      loadMoreButton,
      loadMoreBadge,
      nonInteractiveItem,
      euiTreeViewWrapper,
    };
  }, [euiTheme, depth]);

  return cached;
};
