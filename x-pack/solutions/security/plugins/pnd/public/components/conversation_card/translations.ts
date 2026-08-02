/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/**
 * The verb of each gate's pending decision, named on the card so a queue can be triaged without
 * opening four modals to find out what each one asks.
 *
 * They are the phase catalog's own gate wording (`PHASE_CATALOG_GATES`) in the imperative, so the
 * card, the flyout and the modal cannot come to call the same gate three different things.
 *
 * ⚠️ Every message id here keeps its `proposalRow` bytes. The component moved to
 * `components/conversation_card` and was renamed with it; changing an id retires the translated
 * string in every locale, and a *file* move is not a copy change.
 */
export const PRIMARY_ACTION_OPEN_INVESTIGATION = i18n.translate(
  'xpack.pnd.brief.proposalRow.primaryActionOpenInvestigation',
  {
    defaultMessage: 'Open investigation',
  }
);

/**
 * **"Open an incident", not "Promote to incident"** — the 2026-08-17 Experience/UX sync, decision 6.
 *
 * The message **id** keeps its `primaryActionPromoteIncident` bytes on purpose: the gate is still
 * `promote_incident` in code (decision 6 renamed the copy, and the sync's decision 5 — which would
 * rename the *model* — is explicitly unsettled), and changing an id retires the translated string in
 * every locale. This is the same rule the `proposalRow` prefix above is kept under.
 */
export const PRIMARY_ACTION_PROMOTE_INCIDENT = i18n.translate(
  'xpack.pnd.brief.proposalRow.primaryActionPromoteIncident',
  {
    defaultMessage: 'Open an incident',
  }
);

/** The gate asks whether containment *has happened*, so the analyst confirms rather than contains. */
export const PRIMARY_ACTION_CONFIRM_CONTAINMENT = i18n.translate(
  'xpack.pnd.brief.proposalRow.primaryActionConfirmContainment',
  {
    defaultMessage: 'Confirm containment',
  }
);

export const PRIMARY_ACTION_APPLY_TUNING = i18n.translate(
  'xpack.pnd.brief.proposalRow.primaryActionApplyTuning',
  {
    defaultMessage: 'Apply tuning',
  }
);

/**
 * Every card of a given gate carries the same verb, so the label has to say which card it belongs to
 * — the same reason the chat button and the overflow menu name theirs.
 */
export const primaryActionAriaLabel = ({
  label,
  title,
}: {
  label: string;
  title: string;
}): string =>
  i18n.translate('xpack.pnd.brief.proposalRow.primaryActionAriaLabel', {
    defaultMessage: '{label} for {title}',
    values: { label, title },
  });

/** What the risk circle is a measurement of. The badge itself is a bare two-digit number. */
export const riskScoreAriaLabel = (score: number): string =>
  i18n.translate('xpack.pnd.brief.proposalRow.riskScoreAriaLabel', {
    defaultMessage: 'Risk score {score}',
    values: { score },
  });

/** The chat button's tooltip. Its `aria-label` names the card, so the tooltip need not. */
export const OPEN_IN_CHAT = i18n.translate('xpack.pnd.brief.proposalRow.openInChat', {
  defaultMessage: 'Open in chat',
});

export const openInChatAriaLabel = (title: string): string =>
  i18n.translate('xpack.pnd.brief.proposalRow.openInChatAriaLabel', {
    defaultMessage: 'Open {title} in chat',
    values: { title },
  });

/** The overflow menu's tooltip, shown only while the menu is closed. */
export const MORE_ACTIONS = i18n.translate('xpack.pnd.brief.proposalRow.moreActions', {
  defaultMessage: 'More actions',
});

/** Every card carries the same ellipsis, so the label has to say which card it belongs to. */
export const moreActionsAriaLabel = (title: string): string =>
  i18n.translate('xpack.pnd.brief.proposalRow.moreActionsAriaLabel', {
    defaultMessage: 'More actions for {title}',
    values: { title },
  });

/**
 * The overflow menu's one item: the container the card hangs under, opened as a flyout over the
 * queue (2026-08-18 — *"parent flyout navigation moved to the overflow menu"*).
 *
 * Lives here rather than in the page's translations because the menu is part of the card: a
 * component that reached into a page's copy could not be rendered by a second surface. The id keeps
 * its `brief` bytes for the reason above.
 */
export const VIEW_LIFECYCLE = i18n.translate('xpack.pnd.brief.viewLifecycle', {
  defaultMessage: 'View lifecycle',
});
