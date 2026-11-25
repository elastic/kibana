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
  /** Lowercase phrases a reader gives a name: whole, by either branch of an "A or B", or both spelled out. */
  subNames: Set<string>;
}

const WORD = /[a-z0-9][a-z0-9/+-]*/g;
const toWords = (text: string): string[] => text.toLowerCase().match(WORD) ?? [];

/** The word lists a name reads as: each "a or b" branch alone, and both branches joined by "or". */
const nameReadings = (words: string[]): string[][] => {
  const at = words.indexOf('or', 1);
  if (at === -1 || at === words.length - 1) return [words];
  const before = words.slice(0, at - 1);
  const after = words.slice(at + 2);
  const left = nameReadings([...before, words[at - 1], ...after]);
  const right = nameReadings([...before, words[at + 1], ...after]);
  return [...left, ...right, ...left.map((reading, i) => [...reading, 'or', ...right[i]])];
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
 * Whether "<name>: <subName>" after a technique id is a MITRE name, not advice. Only a whole name
 * or "A or B" reading matches: any looser phrase ("disable logs") would mask a real instruction.
 */
export const isKnownTechniqueName = (id: string, name: string, subName: string): boolean => {
  const entry = getTechniqueNames().get(id);
  if (!entry || !entry.names.has(name.trim().toLowerCase())) return false;
  const phrase = toWords(subName).join(' ');
  return phrase.length > 0 && entry.subNames.has(phrase);
};
