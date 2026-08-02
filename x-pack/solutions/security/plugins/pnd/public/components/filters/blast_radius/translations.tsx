/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/**
 * What the entities every visible proposal's discoveries reached are called, as a heading.
 *
 * ⚠️ Every message id in this file keeps its `brief` bytes. The strings moved here with the chips that
 * render them; changing an id retires the translated string in every locale, and a *file* move is not
 * a copy change.
 */
export const BLAST_RADIUS_TITLE = i18n.translate('xpack.pnd.brief.blastRadiusTitle', {
  defaultMessage: 'Blast radius',
});

/**
 * What a blast radius chip announces. The visible label is a bare term — a hostname, an account, an
 * address — which says nothing read aloud without the field it came from, and the chip is a *filter
 * toggle*, so the label has to say what pressing it does. Whether the filter is currently on is
 * carried by `aria-pressed` rather than repeated here.
 */
export const blastRadiusChipAriaLabel = ({
  count,
  field,
  value,
}: {
  count: number;
  field: string;
  value: string;
}): string =>
  i18n.translate('xpack.pnd.brief.blastRadiusChipAriaLabel', {
    defaultMessage:
      'Filter the queue by {field} {value}, in {count, plural, one {# alert} other {# alerts}}',
    values: { count, field, value },
  });

/** The `+N` chip's visible label, formatted rather than concatenated. */
export const blastRadiusOverflowLabel = (count: number): string =>
  i18n.translate('xpack.pnd.brief.blastRadiusOverflowLabel', {
    defaultMessage: '+{count}',
    values: { count },
  });

/** What the `+N` chip announces, since "+3" alone does not say what the three are. */
export const blastRadiusOverflowAriaLabel = (count: number): string =>
  i18n.translate('xpack.pnd.brief.blastRadiusOverflowAriaLabel', {
    defaultMessage: 'Show {count, plural, one {# more entity} other {# more entities}}',
    values: { count },
  });

export const BLAST_RADIUS_COLLAPSE_ARIA_LABEL = i18n.translate(
  'xpack.pnd.brief.blastRadiusCollapseAriaLabel',
  {
    defaultMessage: 'Show fewer entities',
  }
);
