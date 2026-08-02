/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/**
 * What a group header announces. The header itself is a name beside a bare digit — the prototype's
 * treatment — which says nothing read aloud about what the digit counts, and the header is the
 * accordion's own button, so the label has to carry both.
 *
 * ⚠️ Every message id in this file keeps its `brief` bytes, **including the ones added after the Brief
 * was renamed**. The strings moved here with the component that renders them; changing an id retires
 * the translated string in every locale, and a *file* move is not a copy change. New ids follow the
 * same prefix rather than opening a second namespace for one surface — renaming the prefix is one
 * deliberate sweep, not something to do a string at a time.
 */
export const groupAccordionAriaLabel = ({
  count,
  label,
}: {
  count: number;
  label: string;
}): string =>
  i18n.translate('xpack.pnd.brief.groupAccordionAriaLabel', {
    defaultMessage: '{label}, {count, plural, one {# approval} other {# approvals}} waiting on you',
    values: { count, label },
  });

/**
 * The heading of the one group that is **not** an investigation.
 *
 * "Not yet" rather than "no investigation", because the difference is the whole point: the gate that
 * opens an investigation parks before the investigation exists, so these proposals are early rather
 * than orphaned, and the analyst's own approval is what gives them a container. See register `#46`.
 */
export const NOT_YET_IN_AN_INVESTIGATION = i18n.translate(
  'xpack.pnd.brief.notYetInAnInvestigation',
  { defaultMessage: 'Not yet in an investigation' }
);

/**
 * The heading of an investigation whose own title could not be read.
 *
 * Its `[Investigation]` conversation is named after the Attack Discovery it was opened for, so this is
 * the fallback for a container that exists but is absent from `GET /internal/pnd/conversations` — an
 * unreadable conversation, or a read that has not landed. Deliberately not the discovery id: a UUID in
 * a heading is not a name, and the group's rows already say what is in it.
 */
export const UNNAMED_INVESTIGATION = i18n.translate('xpack.pnd.brief.unnamedInvestigation', {
  defaultMessage: 'Investigation',
});

/**
 * Fallback when the group's parent is the incident conversation and that conversation could not
 * be read. Containment and tuning sit under an incident that already exists.
 */
export const UNNAMED_INCIDENT = i18n.translate('xpack.pnd.brief.unnamedIncident', {
  defaultMessage: 'Incident',
});

export const NO_MATCHES_TITLE = i18n.translate('xpack.pnd.brief.noMatchesTitle', {
  defaultMessage: 'No approvals match this filter',
});

export const NO_MATCHES_BODY = i18n.translate('xpack.pnd.brief.noMatchesBody', {
  defaultMessage: 'The queue is not empty — clear the filter to see everything waiting on you.',
});
