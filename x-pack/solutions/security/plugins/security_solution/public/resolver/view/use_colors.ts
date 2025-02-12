/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { useMemo } from 'react';

type ResolverColorNames =
  | 'descriptionText'
  | 'full'
  | 'graphControls'
  | 'graphControlsBackground'
  | 'graphControlsBorderColor'
  | 'resolverBackground'
  | 'resolverEdge'
  | 'resolverEdgeText'
  | 'resolverBreadcrumbBackground'
  | 'pillStroke'
  | 'triggerBackingFill'
  | 'processBackingFill';
type ColorMap = Record<ResolverColorNames, string>;

/**
 * Get access to Kibana-theme based colors.
 */
export function useColors(): ColorMap {
  const { euiTheme, colorMode } = useEuiTheme();
  const darkMode = useMemo(() => colorMode === 'DARK', [colorMode]);

  return useMemo(
    () => ({
      descriptionText: euiTheme.colors.textParagraph,
      full: euiTheme.colors.fullShade,
      graphControls: euiTheme.colors.darkestShade,
      graphControlsBackground: euiTheme.colors.emptyShade,
      graphControlsBorderColor: euiTheme.colors.lightShade,
      processBackingFill: `${euiTheme.colors.primary}${darkMode ? '1F' : '0F'}`, // Add opacity 0F = 6% , 1F = 12%
      resolverBackground: euiTheme.colors.emptyShade,
      resolverEdge: darkMode ? euiTheme.colors.lightShade : euiTheme.colors.lightestShade,
      resolverBreadcrumbBackground: euiTheme.colors.lightestShade,
      resolverEdgeText: darkMode ? euiTheme.colors.fullShade : euiTheme.colors.darkShade,
      triggerBackingFill: `${euiTheme.colors.danger}${darkMode ? '1F' : '0F'}`,
      pillStroke: euiTheme.colors.lightShade,
    }),
    [darkMode, euiTheme]
  );
}
