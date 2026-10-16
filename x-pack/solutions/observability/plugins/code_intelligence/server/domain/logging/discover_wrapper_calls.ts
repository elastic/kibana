/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { candidateIdFor } from '../models/candidate_id_codec';
import { MAX_CLASSIFICATION_EVIDENCE } from '../models/classification_codec';
import type { ResolvedRepository } from '../models/repository_codec';
import type { SourceReader } from '../ports/source_reader';
import type { SourceLocation } from '../source_location_codec';
import {
  compareLocations,
  discoverPatternLocations,
  readCandidateWindows,
  type LoggingCandidate,
  type LoggingDiscoveryDiagnostic,
} from './discover_logging_candidates';
import {
  wrapperAliasesOn,
  wrapperAliasPattern,
  wrapperCallPattern,
  type LoggingWrapper,
} from './logging_wrappers';

/** Most wrappers searched in one repository; the rest are reported, not searched. */
export const MAX_LOGGING_WRAPPERS = 20;
/** Most wrapper call sites classified in one repository; the rest are reported, not classified. */
export const MAX_WRAPPER_CALL_CANDIDATES = 400;

/** Second-pass output, including how much the caps left out. */
export interface WrapperCallDiscoveryResult {
  readonly candidates: readonly LoggingCandidate[];
  readonly diagnostics: readonly LoggingDiscoveryDiagnostic[];
  /** Call sites found but not classified because of `MAX_WRAPPER_CALL_CANDIDATES`. */
  readonly skippedCalls: number;
  /** Wrappers not searched because of `MAX_LOGGING_WRAPPERS`. */
  readonly skippedWrappers: number;
}

/** A wrapper with the names it is called by. */
interface SearchedWrapper {
  /** Lines that assign the wrapper to an alias, so a classifier can link `.event(` to `emit`. */
  readonly aliasEvidence: readonly SourceLocation[];
  readonly bareNames: readonly string[];
  readonly memberNames: readonly string[];
  readonly wrapper: LoggingWrapper;
}

/** Finds properties in the wrapper's own file that the wrapper is assigned to, such as `event: emit`. */
const aliasesOf = async ({
  reader,
  repository,
  wrapper,
}: {
  readonly reader: SourceReader;
  readonly repository: ResolvedRepository;
  readonly wrapper: LoggingWrapper;
}): Promise<{
  readonly aliases: readonly string[];
  readonly diagnostics: readonly LoggingDiscoveryDiagnostic[];
  readonly evidence: readonly SourceLocation[];
}> => {
  const found = await discoverPatternLocations({
    caseSensitive: true,
    path: wrapper.path,
    pattern: wrapperAliasPattern(wrapper.name),
    reader,
    repository,
  });
  const aliases: Set<string> = new Set();
  const evidence: SourceLocation[] = [];
  for (const location of [...found.locations.values()].sort(compareLocations)) {
    if (location.path !== wrapper.path) continue;
    const named: readonly string[] = wrapperAliasesOn(location.excerpt, wrapper.name).filter(
      (alias) => alias !== wrapper.name
    );
    if (named.length > 0) evidence.push(location);
    for (const alias of named) aliases.add(alias);
  }
  return { aliases: [...aliases].sort(), diagnostics: found.diagnostics, evidence };
};

/**
 * Runs the single second discovery pass: finds calls to classifier-named logging wrappers whose
 * first argument is a string literal, and pairs each call with the wrapper's source as evidence.
 */
export const discoverWrapperCallCandidates = async ({
  knownIds,
  reader,
  repository,
  wrappers,
}: {
  /** Candidate IDs from the first pass, which are never classified again. */
  readonly knownIds: ReadonlySet<string>;
  readonly reader: SourceReader;
  readonly repository: ResolvedRepository;
  readonly wrappers: readonly LoggingWrapper[];
}): Promise<WrapperCallDiscoveryResult> => {
  /** One entry per wrapper file and name, in repository order. */
  const unique: Map<string, LoggingWrapper> = new Map();
  for (const wrapper of [...wrappers].sort(
    (left, right) => left.path.localeCompare(right.path) || left.name.localeCompare(right.name)
  )) {
    const key: string = `${wrapper.path}\u0000${wrapper.name}`;
    if (!unique.has(key)) unique.set(key, wrapper);
  }
  const selected: readonly LoggingWrapper[] = [...unique.values()].slice(0, MAX_LOGGING_WRAPPERS);
  const diagnostics: LoggingDiscoveryDiagnostic[] = [];
  /** Call sites by candidate ID, assigned to the first wrapper that finds them. */
  const calls: Map<
    string,
    { readonly location: SourceLocation; readonly searched: SearchedWrapper }
  > = new Map();
  for (const wrapper of selected) {
    const alias = await aliasesOf({ reader, repository, wrapper });
    diagnostics.push(...alias.diagnostics);
    const searched: SearchedWrapper = {
      aliasEvidence: alias.evidence,
      bareNames: wrapper.forms.bare ? [wrapper.name] : [],
      memberNames: [...(wrapper.forms.member ? [wrapper.name] : []), ...alias.aliases],
      wrapper,
    };
    const pattern: string | undefined = wrapperCallPattern(searched);
    if (pattern === undefined) continue;
    const found = await discoverPatternLocations({
      caseSensitive: true,
      pattern,
      reader,
      repository,
    });
    diagnostics.push(...found.diagnostics);
    for (const [id, location] of found.locations) {
      if (!knownIds.has(id) && !calls.has(id)) calls.set(id, { location, searched });
    }
  }
  const sortedCalls = [...calls.values()].sort((left, right) =>
    compareLocations(left.location, right.location)
  );
  const kept = sortedCalls.slice(0, MAX_WRAPPER_CALL_CANDIDATES);
  const windows = await readCandidateWindows({
    locations: kept.map(({ location }) => location),
    reader,
    repository,
  });
  diagnostics.push(...windows.diagnostics);
  const searchedById = new Map(
    kept.map(({ location, searched }) => [candidateIdFor(location.path, location.line), searched])
  );
  const candidates: LoggingCandidate[] = windows.candidates.flatMap(({ candidate }) => {
    const searched: SearchedWrapper | undefined = searchedById.get(candidate.id);
    if (searched === undefined) return [];
    return [
      {
        ...candidate,
        evidence: [
          ...candidate.evidence,
          ...searched.wrapper.evidence,
          ...searched.aliasEvidence,
        ].slice(0, MAX_CLASSIFICATION_EVIDENCE),
        wrapper: {
          callNames: [...searched.bareNames, ...searched.memberNames],
          name: searched.wrapper.name,
        },
      },
    ];
  });
  return {
    candidates,
    diagnostics,
    skippedCalls: sortedCalls.length - kept.length,
    skippedWrappers: unique.size - selected.length,
  };
};
