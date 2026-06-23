/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiThemeComputed } from '@elastic/eui';
import type { CSSProperties } from 'react';
import { HandleStyleOverride } from '../styles';
import type { DocumentAnalysisOutput } from './analyze_documents';

/** Pill height per Figma event component spec (node 11904:1238). */
export const EVENT_PILL_HEIGHT = 32;

/** Pin edge handles to the pill midpoint, not the full node (incl. metadata). */
export const pillHandleStyle: CSSProperties = {
  ...HandleStyleOverride,
  top: EVENT_PILL_HEIGHT / 2,
};

/** Max text width inside a pill (NODE_LABEL_WIDTH minus horizontal padding). */
export const LABEL_PILL_TEXT_MAX_WIDTH = 184;

export type EventPillTone = 'event' | 'alert' | 'mixed';

export interface EventPillColors {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
}

export const getEventPillTone = (analysis: DocumentAnalysisOutput): EventPillTone => {
  if (analysis.uniqueAlertsCount > 0 && analysis.uniqueEventsCount > 0) {
    return 'mixed';
  }
  if (analysis.uniqueAlertsCount > 0) {
    return 'alert';
  }
  return 'event';
};

export const getEventPillColors = (
  tone: EventPillTone,
  isActive: boolean,
  euiTheme: EuiThemeComputed
): EventPillColors => {
  if (tone === 'alert') {
    return {
      backgroundColor: isActive
        ? euiTheme.colors.backgroundLightDanger
        : euiTheme.colors.backgroundBaseDanger,
      borderColor: isActive ? euiTheme.colors.borderStrongDanger : euiTheme.colors.borderBaseDanger,
      textColor: euiTheme.colors.textParagraph,
    };
  }

  return {
    backgroundColor: isActive
      ? euiTheme.colors.backgroundBaseSubdued
      : euiTheme.colors.backgroundBasePlain,
    borderColor: euiTheme.colors.borderBasePlain,
    textColor: euiTheme.colors.textParagraph,
  };
};
