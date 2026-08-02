/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { PndGateId } from '@kbn/pnd-common';

export const PAGE_TITLE = i18n.translate('xpack.pnd.chats.pageTitle', {
  defaultMessage: 'Chats',
});

export const PAGE_SUBTITLE = i18n.translate('xpack.pnd.chats.pageSubtitle', {
  defaultMessage:
    'The Agent Builder conversations this deployment’s watches opened — one per phase of an attack’s lifecycle, plus one sub-investigation per action waiting on an analyst.',
});

export const GREETING = i18n.translate('xpack.pnd.chats.greeting', {
  defaultMessage: 'Ask AlertZero anything — investigations, watches, or next steps.',
});

export const AGENT_BUILDER_UNAVAILABLE = i18n.translate('xpack.pnd.chats.agentBuilderUnavailable', {
  defaultMessage:
    'Agent Builder is not available in this deployment, so there is no chat to open here. Enable the agentBuilder plugin to ask AlertZero a question.',
});

export const LOADING_CHAT = i18n.translate('xpack.pnd.chats.loadingChat', {
  defaultMessage: 'Loading the chat…',
});

export const LOADING_CONVERSATIONS = i18n.translate('xpack.pnd.chats.loadingConversations', {
  defaultMessage: 'Loading conversations…',
});

export const EMPTY_TITLE = i18n.translate('xpack.pnd.chats.emptyTitle', {
  defaultMessage: 'No conversations yet',
});

export const EMPTY_BODY = i18n.translate('xpack.pnd.chats.emptyBody', {
  defaultMessage:
    'AlertZero opens a conversation as a run reaches each phase: one when an investigation starts, one when an incident is opened, and one when a detection tuning is drafted — plus a sub-investigation for each action that stops to ask an analyst. A space with no Attack Discovery yet has none of them.',
});

export const NO_MATCHES_TITLE = i18n.translate('xpack.pnd.chats.noMatchesTitle', {
  defaultMessage: 'No conversations match',
});

export const NO_MATCHES_BODY = i18n.translate('xpack.pnd.chats.noMatchesBody', {
  defaultMessage: 'There are conversations here — none of them match the current filters.',
});

export const SEARCH_PLACEHOLDER = i18n.translate('xpack.pnd.chats.searchPlaceholder', {
  defaultMessage: 'Search by title, attack discovery, or conversation id',
});

export const SEARCH_ARIA_LABEL = i18n.translate('xpack.pnd.chats.searchAriaLabel', {
  defaultMessage: 'Filter conversations',
});

export const KPI_ALL_CHATS = i18n.translate('xpack.pnd.chats.kpiAllChats', {
  defaultMessage: 'All chats',
});

export const KPI_INVESTIGATIONS = i18n.translate('xpack.pnd.chats.kpiInvestigations', {
  defaultMessage: 'Investigations',
});

export const KPI_INCIDENTS = i18n.translate('xpack.pnd.chats.kpiIncidents', {
  defaultMessage: 'Incidents',
});

export const KPI_SUB_INVESTIGATIONS = i18n.translate('xpack.pnd.chats.kpiSubInvestigations', {
  defaultMessage: 'Sub-investigations',
});

export const INCIDENTS_SECTION_TITLE = i18n.translate('xpack.pnd.chats.incidentsSectionTitle', {
  defaultMessage: 'Incidents',
});

export const INVESTIGATIONS_SECTION_TITLE = i18n.translate(
  'xpack.pnd.chats.investigationsSectionTitle',
  {
    defaultMessage: 'Investigations',
  }
);

export const INCIDENTS_PAGINATION_ARIA_LABEL = i18n.translate(
  'xpack.pnd.chats.incidentsPaginationAriaLabel',
  {
    defaultMessage: 'Incidents pages',
  }
);

export const INVESTIGATIONS_PAGINATION_ARIA_LABEL = i18n.translate(
  'xpack.pnd.chats.investigationsPaginationAriaLabel',
  {
    defaultMessage: 'Investigations pages',
  }
);

/**
 * What each HITL gate's proposal is *about*, for the row of a thread paired with it.
 *
 * A `Record` rather than a `switch` with a `default`, for the same reason `emptyCounts` is one:
 * a fifth gate then fails the type check here instead of quietly falling back to the first label.
 *
 * The four strings deliberately match `pages/watches`' `gateLabel` word for word — the autonomy
 * control names the same four decisions — but are **not** imported from it: a page must not depend
 * on another page's copy, and the label is consumed from a shared component's prop. This is the
 * `KIND_PILL_COLOR` / `CONVERSATION_CATEGORY_COLORS` arrangement, and like that pair the two are
 * pinned together
 * by a test (`helpers/describe_thread_gate/index.test.ts`) so they cannot drift apart silently.
 */
export const THREAD_GATE_LABEL: Readonly<Record<PndGateId, string>> = {
  apply_tuning: i18n.translate('xpack.pnd.chats.threadGate.applyTuning', {
    defaultMessage: 'Apply a rule tuning',
  }),
  incident_contained: i18n.translate('xpack.pnd.chats.threadGate.incidentContained', {
    defaultMessage: 'Confirm containment',
  }),
  open_investigation: i18n.translate('xpack.pnd.chats.threadGate.openInvestigation', {
    defaultMessage: 'Open an investigation',
  }),
  // "Open an incident", not "Promote to incident" (2026-08-17 sync, decision 6). The id keeps its
  // `promoteIncident` bytes: the gate id is unchanged, and decision 5's model rename is unsettled.
  promote_incident: i18n.translate('xpack.pnd.chats.threadGate.promoteIncident', {
    defaultMessage: 'Open an incident',
  }),
};

/**
 * What the detail panel calls a conversation Agent Builder never titled.
 *
 * PND titles the three alert-keyed kinds itself, but a thread's title is Agent Builder's, and PND
 * is forbidden to rename a conversation (D9) — so a blank one is a real state rather than a bug,
 * and it must not render as an empty heading with a close button beside it.
 */
export const DETAILS_UNTITLED = i18n.translate('xpack.pnd.chats.detailsUntitled', {
  defaultMessage: 'Untitled',
});

export const DETAILS_CLOSE = i18n.translate('xpack.pnd.chats.detailsClose', {
  defaultMessage: 'Close the conversation details',
});

export const DETAILS_GATE = i18n.translate('xpack.pnd.chats.detailsGate', {
  defaultMessage: 'Gate',
});

export const DETAILS_OPEN_IN_AGENT_BUILDER = i18n.translate(
  'xpack.pnd.chats.detailsOpenInAgentBuilder',
  {
    defaultMessage: 'Open in Agent Builder',
  }
);

export const DETAILS_ATTACHMENTS_LOADING = i18n.translate(
  'xpack.pnd.chats.detailsAttachmentsLoading',
  {
    defaultMessage: 'Loading attachments…',
  }
);

export const DETAILS_ATTACHMENTS_ERROR = i18n.translate('xpack.pnd.chats.detailsAttachmentsError', {
  defaultMessage: 'The attachments on this conversation could not be read.',
});

export const DETAILS_ATTACHMENTS_EMPTY = i18n.translate('xpack.pnd.chats.detailsAttachmentsEmpty', {
  defaultMessage: 'Nothing is attached to this conversation.',
});

export const DETAILS_ATTACHMENTS_UNAVAILABLE = i18n.translate(
  'xpack.pnd.chats.detailsAttachmentsUnavailable',
  {
    defaultMessage:
      'This conversation names no attack discovery, so AlertZero has no attachments to read for it.',
  }
);

export const DETAILS_ATTACHMENT_NO_CONTENT = i18n.translate(
  'xpack.pnd.chats.detailsAttachmentNoContent',
  {
    defaultMessage: 'This attachment has no content AlertZero can render inline.',
  }
);

export const detailsAttachmentCount = (count: number): string =>
  i18n.translate('xpack.pnd.chats.detailsAttachmentCount', {
    defaultMessage: '{count, plural, one {# attachment} other {# attachments}}',
    values: { count },
  });

export const openInAgentBuilderAriaLabel = (title: string): string =>
  i18n.translate('xpack.pnd.chats.openInAgentBuilderAriaLabel', {
    defaultMessage: 'Open {title} in Agent Builder',
    values: { title },
  });

export const ASK_PND_TITLE = i18n.translate('xpack.pnd.chats.askPndTitle', {
  defaultMessage: 'Ask AlertZero',
});

export const ASK_PND_DESCRIPTION = i18n.translate('xpack.pnd.chats.askPndDescription', {
  defaultMessage:
    'A general chat with the default agent, separate from the conversations above. It starts a new conversation — the conversations above are also listed in its own conversation picker.',
});

export const ASK_PND_TOGGLE = i18n.translate('xpack.pnd.chats.askPndToggle', {
  defaultMessage: 'Start a chat',
});

export const conversationCount = (count: number): string =>
  i18n.translate('xpack.pnd.chats.conversationCount', {
    defaultMessage: '{count, plural, one {# conversation} other {# conversations}}',
    values: { count },
  });
