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
  /** Lowercase words of the technique's own name and of all its sub-techniques' names. */
  words: Set<string>;
}

const WORD = /[a-z0-9][a-z0-9/+-]*/g;
const toWords = (text: string): string[] => text.toLowerCase().match(WORD) ?? [];

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
      const entry = built.get(key) ?? { names: new Set<string>(), words: new Set<string>() };
      entry.words = new Set([...entry.words, ...toWords(name)]);
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
 * the part before the colon is a known name for that id and every word after it belongs to that
 * technique's name or one of its sub-techniques' names ("T1562.008 impair defenses: disable
 * cloud logs"). Advice that merely follows a name ("T1078 Valid Accounts: revoke the key") uses words
 * outside the technique's names and is not matched.
 */
export const isKnownTechniqueName = (id: string, name: string, subName: string): boolean => {
  const entry = getTechniqueNames().get(id);
  if (!entry || !entry.names.has(name.trim().toLowerCase())) return false;
  const words = toWords(subName);
  return words.length > 0 && words.every((word) => entry.words.has(word));
};
