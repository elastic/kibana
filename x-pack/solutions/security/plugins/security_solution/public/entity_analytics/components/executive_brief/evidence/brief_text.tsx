/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import type {
  EntityId,
  Evidence,
} from '../../../../../common/entity_analytics/executive_brief/evidence';
import type { TriageRequest } from '../actions/brief_actions_context';
import { useBriefActions } from '../actions/brief_actions_context';

// The AI writes entity ids (the prompt is IDs-only) and sometimes inline citations like "(F-3, L-2)".
const CITATION_GROUP = /\s*\((?:\s*(?:F|L)-\d+\s*[,;]?)+\)/g;
const LOOSE_CITATION = /\b(?:F|L)-\d+\b/g;
const ENTITY_TOKEN = /\b(ENT-\d+)\b/;

const stripCitations = (text: string): string =>
  text.replace(CITATION_GROUP, '').replace(LOOSE_CITATION, '').replace(/ {2,}/g, ' ');

/** Plain-text prose with entity ids replaced by names and citations removed (for chat prompts). */
export const resolveProse = (text: string, evidence: Evidence): string =>
  stripCitations(text).replace(
    /\bENT-\d+\b/g,
    (id) => evidence.entities[id as EntityId]?.name ?? id
  );

/** Renders AI prose with entity ids as clickable entity names. */
export const BriefText: React.FC<{ text: string; evidence: Evidence }> = ({ text, evidence }) => {
  const actions = useBriefActions();
  const parts = stripCitations(text).split(ENTITY_TOKEN);
  return (
    <>
      {parts.map((part, index) => {
        const entity = ENTITY_TOKEN.test(part) ? evidence.entities[part as EntityId] : undefined;
        if (!entity) {
          return <React.Fragment key={index}>{part}</React.Fragment>;
        }
        return actions ? (
          <EuiLink
            key={index}
            onClick={() => actions.openEntity(entity)}
            data-test-subj={`executiveBriefProseEntity-${entity.id}`}
          >
            {entity.name}
          </EuiLink>
        ) : (
          <strong key={index}>{entity.name}</strong>
        );
      })}
    </>
  );
};

const resolveEntityNames = (text: string, evidence: Evidence): string =>
  text.replace(/\bENT-\d+\b/g, (id) => evidence.entities[id as EntityId]?.name ?? id);

/**
 * Names entities in a triage request so the AI Agent sees names, not ids. Only standalone citation
 * groups like "(F-3, L-2)" are removed; fact ids used as labels in the evidence list are kept.
 */
export const resolveTriageRequest = (
  request: TriageRequest,
  evidence: Evidence
): TriageRequest => ({
  instruction: resolveEntityNames(request.instruction.replace(CITATION_GROUP, ''), evidence),
  evidenceMarkdown: resolveEntityNames(
    request.evidenceMarkdown.replace(CITATION_GROUP, ''),
    evidence
  ),
});
