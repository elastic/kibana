/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const PAGE_TITLE = i18n.translate('xpack.pnd.investigation.pageTitle', {
  defaultMessage: 'Investigation',
});

export const TAB_OVERVIEW = i18n.translate('xpack.pnd.investigation.tab.overview', {
  defaultMessage: 'Overview',
});

export const TAB_PROPOSALS = i18n.translate('xpack.pnd.investigation.tab.proposals', {
  defaultMessage: 'Proposals',
});

export const TAB_TIMELINE = i18n.translate('xpack.pnd.investigation.tab.timeline', {
  defaultMessage: 'Timeline',
});

export const ACTION_APPROVE = i18n.translate('xpack.pnd.investigation.action.approve', {
  defaultMessage: 'Approve',
});

export const ACTION_MODIFY = i18n.translate('xpack.pnd.investigation.action.modify', {
  defaultMessage: 'Modify',
});

export const ACTION_DISMISS = i18n.translate('xpack.pnd.investigation.action.dismiss', {
  defaultMessage: 'Dismiss',
});

export const BACK_TO_BRIEF = i18n.translate('xpack.pnd.investigation.backToBrief', {
  defaultMessage: 'Back to Brief',
});

export const NOT_FOUND = i18n.translate('xpack.pnd.investigation.notFound', {
  defaultMessage: 'Investigation not found',
});

export const LOAD_ERROR_TITLE = i18n.translate('xpack.pnd.investigation.loadError.title', {
  defaultMessage: 'Unable to load investigation',
});

export const LOAD_ERROR_BODY = i18n.translate('xpack.pnd.investigation.loadError.body', {
  defaultMessage: 'Something went wrong while fetching this investigation.',
});

export const LOADING = i18n.translate('xpack.pnd.investigation.loading', {
  defaultMessage: 'Loading investigation…',
});

export const STATUS_UPDATED = i18n.translate('xpack.pnd.investigation.statusUpdated', {
  defaultMessage: 'Proposal status updated (mock)',
});

export const DECISIONS_UNAVAILABLE = i18n.translate(
  'xpack.pnd.investigation.decisionsUnavailable',
  {
    defaultMessage:
      'Proposal decisions are disabled until durable approval workflows are connected.',
  }
);

export const LOADING_PROPOSALS = i18n.translate('xpack.pnd.investigation.loadingProposals', {
  defaultMessage: 'Loading proposals…',
});

export const PROPOSALS_LOAD_ERROR = i18n.translate('xpack.pnd.investigation.proposalsLoadError', {
  defaultMessage: 'Unable to load proposals',
});

export const PROPOSAL_NOT_FOUND = i18n.translate('xpack.pnd.investigation.proposalNotFound', {
  defaultMessage: 'Proposal not found',
});

export const RETRY = i18n.translate('xpack.pnd.investigation.retry', {
  defaultMessage: 'Retry',
});

export const FLOW_STAGE_DETECTED = i18n.translate('xpack.pnd.investigation.flow.stage.detected', {
  defaultMessage: 'Detected',
});

export const FLOW_STAGE_INVESTIGATED = i18n.translate(
  'xpack.pnd.investigation.flow.stage.investigated',
  {
    defaultMessage: 'Investigated',
  }
);

export const FLOW_STAGE_PROPOSED = i18n.translate('xpack.pnd.investigation.flow.stage.proposed', {
  defaultMessage: 'Proposed',
});

export const FLOW_STAGE_DECIDED = i18n.translate('xpack.pnd.investigation.flow.stage.decided', {
  defaultMessage: 'Decided',
});

export const FLOW_EMPTY = i18n.translate('xpack.pnd.investigation.flow.empty', {
  defaultMessage: 'No timeline events recorded for this investigation yet.',
});

export const FLOW_SOURCE_INVESTIGATION = i18n.translate(
  'xpack.pnd.investigation.flow.source.investigation',
  {
    defaultMessage: 'Investigation',
  }
);

export const flowSourceProposal = (proposalType: string): string =>
  i18n.translate('xpack.pnd.investigation.flow.source.proposal', {
    defaultMessage: 'Proposal · {proposalType}',
    values: { proposalType },
  });
