/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Minimal CODEOWNERS parser/matcher (GitHub semantics, last matching rule wins).
 *
 * Used for two things only:
 *   1. Resolve the owning team(s) of a changed production file.
 *   2. Turn a team into a list of literal path prefixes (the search boundary).
 *
 * Ownership is never a link by itself — see references/link-rules.md.
 */
import fs from 'node:fs';
import path from 'node:path';

const WILDCARD_RE = /[*?[]/;

const escapeRegex = (s) => s.replace(/[.+^${}()|\\]/g, '\\$&');

/**
 * Convert a CODEOWNERS pattern to a RegExp over repo-relative POSIX paths.
 */
export const patternToRegex = (rawPattern) => {
  let pattern = rawPattern;
  const anchored = pattern.startsWith('/') || pattern.slice(0, -1).includes('/');
  if (pattern.startsWith('/')) pattern = pattern.slice(1);
  const dirOnly = pattern.endsWith('/');
  if (dirOnly) pattern = pattern.slice(0, -1);

  let re = '';
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if (ch === '*') {
      if (pattern[i + 1] === '*') {
        // `**` — any number of segments
        i++;
        if (pattern[i + 1] === '/') {
          i++;
          re += '(?:.*/)?';
        } else {
          re += '.*';
        }
      } else {
        re += '[^/]*';
      }
    } else if (ch === '?') {
      re += '[^/]';
    } else {
      re += escapeRegex(ch);
    }
  }

  const lastSegment = pattern.split('/').pop() ?? '';
  // `docs/*` matches only direct children; `docs/` or `docs/foo` match everything below.
  const descend = dirOnly || !WILDCARD_RE.test(lastSegment);
  const tail = descend ? '(?:/.*)?$' : '$';
  const head = anchored ? '^' : '(?:^|.*/)';
  return new RegExp(`${head}${re}${tail}`);
};

/**
 * Literal prefix of a pattern (everything before the first wildcard, cut at a segment boundary).
 */
export const patternToPrefix = (rawPattern) => {
  let pattern = rawPattern.startsWith('/') ? rawPattern.slice(1) : rawPattern;
  const wildcardIndex = pattern.search(WILDCARD_RE);
  if (wildcardIndex >= 0) {
    pattern = pattern.slice(0, wildcardIndex);
    const lastSlash = pattern.lastIndexOf('/');
    pattern = lastSlash >= 0 ? pattern.slice(0, lastSlash) : '';
  }
  return pattern.replace(/\/+$/, '');
};

/**
 * @returns {Array<{ pattern: string, owners: string[], regex: RegExp, prefix: string, line: number }>}
 */
export const parseCodeowners = (text) => {
  const rules = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((rawLine, index) => {
    const line = rawLine.replace(/\s#.*$/, '').trim();
    if (!line || line.startsWith('#')) return;
    const tokens = line.split(/\s+/);
    const pattern = tokens[0];
    const owners = tokens.slice(1).filter((t) => t.startsWith('@'));
    rules.push({
      pattern,
      owners,
      regex: patternToRegex(pattern),
      prefix: patternToPrefix(pattern),
      line: index + 1,
    });
  });
  return rules;
};

export const loadCodeowners = (repoRoot) => {
  const file = path.join(repoRoot, '.github', 'CODEOWNERS');
  if (!fs.existsSync(file)) {
    throw new Error(`Missing ${file} — not a Kibana checkout?`);
  }
  return parseCodeowners(fs.readFileSync(file, 'utf8'));
};

/**
 * Last matching rule wins (GitHub semantics).
 * @returns {{ owners: string[], pattern: string | null }}
 */
export const resolveOwners = (rules, filePath) => {
  for (let i = rules.length - 1; i >= 0; i--) {
    const rule = rules[i];
    if (rule.regex.test(filePath)) {
      return { owners: rule.owners, pattern: rule.pattern };
    }
  }
  return { owners: [], pattern: null };
};

export const normalizeTeam = (team) => (team.startsWith('@') ? team : `@elastic/${team}`);

/**
 * Literal path prefixes that list the given team as an owner, deduped and sorted.
 * Prefixes that are nested under another returned prefix are dropped.
 */
export const teamPrefixes = (rules, team) => {
  const wanted = normalizeTeam(team);
  const prefixes = new Set();
  for (const rule of rules) {
    if (rule.owners.includes(wanted) && rule.prefix) prefixes.add(rule.prefix);
  }
  const sorted = [...prefixes].sort();
  return sorted.filter(
    (candidate) => !sorted.some((other) => other !== candidate && candidate.startsWith(`${other}/`))
  );
};
