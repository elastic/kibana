/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/** The section's heading: everything the queue has already answered. */
export const RESOLVED = i18n.translate('xpack.pnd.brief.resolvedSection.title', {
  defaultMessage: 'Resolved',
});

/**
 * What the section holds and how much of it, read once by the toggle rather than as a bare digit
 * after the heading.
 */
export const resolvedAccordionAriaLabel = (count: number): string =>
  i18n.translate('xpack.pnd.brief.resolvedSection.accordionAriaLabel', {
    defaultMessage:
      '{count, plural, one {Resolved, # entry} other {Resolved, # entries}}, collapsible',
    values: { count },
  });

/** Names how many more rows the record holds, so the count sets the expectation before the click. */
export const showMore = (remaining: number): string =>
  i18n.translate('xpack.pnd.brief.resolvedSection.showMore', {
    defaultMessage: 'Show more ({remaining})',
    values: { remaining },
  });
