/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstSentence, stripFindingTitle, truncateAtWord, techniqueLabel } from './coverage_text';

/** CE allows 512; a headline longer than this stops scanning. */
export const MAX_COVERAGE_TITLE_CHARS = 200;
/** CE allows 2048; one sentence rarely needs more than this. */
export const MAX_COVERAGE_DESCRIPTION_CHARS = 300;

/** `Hunt confirmed for <report id>` / `Hunt complete for <report id>`, the mapper's fallback title. */
const GENERIC_FINDING_TITLE = /^Hunt (confirmed|complete) for /;

/** The technique's own name or id, or the label the SSE title already carries as a prefix. */
const isOnlyTechniqueLabel = (phrase: string, techniqueId: string, techniqueName?: string) => {
  const normalized = phrase.toLowerCase();
  return [
    techniqueId,
    techniqueName,
    techniqueName ? `${techniqueName} (${techniqueId})` : undefined,
  ].some((candidate) => candidate !== undefined && normalized === candidate.toLowerCase());
};

/**
 * The finding phrase for a hit subject: the SSE title once stripped of the hunt's decoration,
 * or, when what is left is only the technique label the headline already starts with, the
 * first sentence of what the finding actually tested.
 */
export const findingPhrase = ({
  sseTitle,
  hypothesis,
  techniqueId,
  techniqueName,
  reportTitle,
}: {
  sseTitle: string;
  hypothesis?: string;
  techniqueId?: string;
  techniqueName?: string;
  reportTitle?: string;
}): string => {
  // The mapper's fallback title for a finding with no behavior names the report by id.
  if (GENERIC_FINDING_TITLE.test(sseTitle)) {
    return reportTitle ?? (hypothesis ? firstSentence(hypothesis) : 'Hunt finding');
  }
  const stripped = stripFindingTitle(sseTitle);
  const redundant =
    techniqueId !== undefined && isOnlyTechniqueLabel(stripped, techniqueId, techniqueName);
  if (stripped === '' || (redundant && hypothesis)) {
    return hypothesis ? firstSentence(hypothesis) : stripped;
  }
  return stripped;
};

/** Scannable headline: `{technique}: {phrase}` for a technique subject, `{phrase}` otherwise. */
export const buildCoverageTitle = ({
  techniqueName,
  techniqueId,
  phrase,
}: {
  techniqueId?: string;
  techniqueName?: string;
  phrase: string;
}): string => {
  const prefix = techniqueId ? techniqueName ?? techniqueId : undefined;
  return truncateAtWord(prefix ? `${prefix}: ${phrase}` : phrase, MAX_COVERAGE_TITLE_CHARS);
};

/** One sentence naming the outcome and what Detection is asked to review. */
export const buildCoverageDescription = ({
  hasConfirmedHit,
  techniqueId,
  techniqueName,
}: {
  hasConfirmedHit: boolean;
  techniqueId?: string;
  techniqueName?: string;
}): string => {
  const outcome = hasConfirmedHit
    ? 'Confirmed in environment.'
    : 'No environment hit in the hunt window.';
  const subject = techniqueId
    ? `${techniqueLabel(techniqueId, techniqueName)}`
    : 'the reported behavior';
  return truncateAtWord(
    `${outcome} Coverage review needed for ${subject}.`,
    MAX_COVERAGE_DESCRIPTION_CHARS
  );
};
