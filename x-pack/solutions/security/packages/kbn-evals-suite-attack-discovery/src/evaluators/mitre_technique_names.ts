/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { loadMitreArtifact } from '@kbn/security-mitre-attack-server';

interface TechniqueNames {
  /** Lowercase names of the technique and, for a sub-technique, its parent. */
  names: Set<string>;
  /**
   * Lowercase phrases a reader gives the technique's own name and its sub-techniques' names: each
   * name whole, and each branch of an "A or B" name ("disable or modify cloud logs" reads as
   * "disable cloud logs" too).
   */
  subNames: Set<string>;
}

const WORD = /[a-z0-9][a-z0-9/+-]*/g;
const toWords = (text: string): string[] => text.toLowerCase().match(WORD) ?? [];

/** The word lists a name reads as: itself, and one list per branch of each "a or b" it holds. */
const nameReadings = (words: string[]): string[][] => {
  const at = words.indexOf('or', 1);
  if (at === -1 || at === words.length - 1) return [words];
  const before = words.slice(0, at - 1);
  const after = words.slice(at + 2);
  return [
    ...nameReadings([...before, words[at - 1], ...after]),
    ...nameReadings([...before, words[at + 1], ...after]),
  ];
};

const phrasesOf = (name: string): string[] => {
  const words = toWords(name);
  return [words, ...nameReadings(words)].map((reading) => reading.join(' '));
};

let byId: Map<string, TechniqueNames> | undefined;

const getTechniqueNames = (): Map<string, TechniqueNames> => {
  if (byId) return byId;
  const entities = loadMitreArtifact().filter(
    ({ framework, type }) => framework === 'enterprise' && type !== 'tactic'
  );
  const names = new Map(entities.map(({ id, name }) => [id, name]));
  const built = new Map<string, TechniqueNames>();
  entities.forEach(({ id, name }) => {
    const [techniqueId] = id.split('.');
    [id, techniqueId].forEach((key) => {
      const entry = built.get(key) ?? { names: new Set<string>(), subNames: new Set<string>() };
      entry.subNames = new Set([...entry.subNames, ...phrasesOf(name)]);
      built.set(key, entry);
    });
    const entry = built.get(id) as TechniqueNames;
    entry.names.add(name.toLowerCase());
    const parentName = names.get(techniqueId);
    if (parentName) entry.names.add(parentName.toLowerCase());
  });
  byId = built;
  return built;
};

/**
 * Whether "<name>: <subName>" after a MITRE technique id reads as a technique name, in any casing:
 * the part before the colon is a known name for that id and the part after it is the name of that
 * technique or one of its sub-techniques, whole or by one branch of an "A or B" name ("T1562.008
 * impair defenses: disable cloud logs"). A phrase that only reuses words of those names ("disable
 * logs") is not matched, and neither is advice that follows a name ("T1078 Valid Accounts: revoke
 * the key"): masking the colon would hide that instruction from the gate.
 */
export const isKnownTechniqueName = (id: string, name: string, subName: string): boolean => {
  const entry = getTechniqueNames().get(id);
  if (!entry || !entry.names.has(name.trim().toLowerCase())) return false;
  const phrase = toWords(subName).join(' ');
  return phrase.length > 0 && entry.subNames.has(phrase);
};
