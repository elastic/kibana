/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface ParsedVersion {
  text: string;
  parts: number[];
  prerelease: string[];
}

export const parseVersion = (text: string): ParsedVersion | undefined => {
  const match = text.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
  if (!match) return undefined;
  return { text, parts: match.slice(1, 4).map(Number), prerelease: match[4]?.split('.') ?? [] };
};

const compareIdentifiers = (a: string, b: string): number => {
  if (/^\d+$/.test(a) && /^\d+$/.test(b)) return Number(a) - Number(b);
  if (a === b) return 0;
  return a < b ? -1 : 1;
};

// Semver order: 9.6.1-beta.1 < 9.6.1 < 9.6.2-beta.0.
export const compareVersions = (a: ParsedVersion, b: ParsedVersion): number => {
  for (let i = 0; i < 3; i++) if (a.parts[i] !== b.parts[i]) return a.parts[i] - b.parts[i];
  if (!a.prerelease.length || !b.prerelease.length)
    return b.prerelease.length - a.prerelease.length;
  for (let i = 0; i < Math.max(a.prerelease.length, b.prerelease.length); i++) {
    if (a.prerelease[i] === undefined) return -1;
    if (b.prerelease[i] === undefined) return 1;
    const order = compareIdentifiers(a.prerelease[i], b.prerelease[i]);
    if (order) return order;
  }
  return 0;
};

export const findHighest = (versions: string[]): string | undefined =>
  versions
    .map(parseVersion)
    .filter(
      (version): version is ParsedVersion => version !== undefined && !version.prerelease.length
    )
    .sort((a, b) => compareVersions(b, a))[0]?.text;
