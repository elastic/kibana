/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';
import type { Severity } from '@kbn/nightshift-investigations-plugin/common';

/** Shared by the severity tiles, the section headings, and each list row. */
export type SeverityDotColor = 'danger' | 'risk' | 'warning' | 'neutral';

export const SEVERITY_DOT_COLOR: Record<Severity, SeverityDotColor> = {
  critical: 'danger',
  high: 'risk',
  medium: 'warning',
  low: 'neutral',
};

/** Glyphs for severity overview tiles. Medium’s double chevron is rotated to point up. */
export const SEVERITY_TILE_ICON: Record<Severity, { type: IconType; rotateUp?: boolean }> = {
  critical: { type: 'bolt' },
  high: { type: 'warning' },
  medium: { type: 'chevronDoubleRight', rotateUp: true },
  low: { type: 'chevronSingleUp' },
};

type SeverityTileIconColorToken =
  | 'backgroundLightDanger'
  | 'backgroundLightRisk'
  | 'backgroundLightWarning'
  | 'backgroundLightNeutral'
  | 'textDanger'
  | 'textRisk'
  | 'textWarning'
  | 'textNeutral';

/** Light chip fill + glyph color tokens aligned with {@link SEVERITY_DOT_COLOR}. */
export const SEVERITY_TILE_ICON_COLORS: Record<
  Severity,
  { background: SeverityTileIconColorToken; color: SeverityTileIconColorToken }
> = {
  critical: { background: 'backgroundLightDanger', color: 'textDanger' },
  high: { background: 'backgroundLightRisk', color: 'textRisk' },
  medium: { background: 'backgroundLightWarning', color: 'textWarning' },
  low: { background: 'backgroundLightNeutral', color: 'textNeutral' },
};
