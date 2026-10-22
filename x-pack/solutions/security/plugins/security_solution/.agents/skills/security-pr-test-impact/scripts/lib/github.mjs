/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Read-only GitHub access through the `gh` CLI.
 * Nothing in this module comments on, labels, or edits a PR.
 */
import { execFileSync } from 'node:child_process';

const GH_ENV = { ...process.env, GH_PAGER: 'cat', GH_PROMPT_DISABLED: '1', NO_COLOR: '1' };

export class GithubError extends Error {}

const gh = (args, { maxBuffer = 1024 * 1024 * 512 } = {}) => {
  try {
    return execFileSync('gh', args, { env: GH_ENV, maxBuffer, stdio: ['ignore', 'pipe', 'pipe'] })
      .toString('utf8')
      .trim();
  } catch (err) {
    const stderr = err.stderr ? err.stderr.toString('utf8').trim() : '';
    throw new GithubError(`gh ${args.slice(0, 3).join(' ')} failed: ${stderr || err.message}`);
  }
};

/** Accepts a PR number, `#123`, or a github.com PR URL for `repo`. */
export const parsePrRef = (input, repo) => {
  const text = String(input).trim();
  const urlMatch = text.match(/github\.com\/([^/]+\/[^/]+)\/pull\/(\d+)/);
  if (urlMatch) {
    if (urlMatch[1].toLowerCase() !== repo.toLowerCase()) {
      throw new GithubError(`PR URL is for ${urlMatch[1]}, expected ${repo}`);
    }
    return Number(urlMatch[2]);
  }
  const numMatch = text.match(/^#?(\d+)$/);
  if (numMatch) return Number(numMatch[1]);
  throw new GithubError(`Cannot parse PR reference: ${input}`);
};

export const fetchPrMeta = (repo, number) => {
  const json = gh([
    'pr',
    'view',
    String(number),
    '--repo',
    repo,
    '--json',
    'number,title,url,state,mergedAt,headRefOid,baseRefName,changedFiles',
  ]);
  return JSON.parse(json);
};

/** All changed files incl. unified diff `patch` (absent for very large files). */
export const fetchPrFiles = (repo, number) => {
  const json = gh([
    'api',
    '--paginate',
    '--slurp',
    '-H',
    'Accept: application/vnd.github+json',
    `repos/${repo}/pulls/${number}/files?per_page=100`,
  ]);
  const pages = JSON.parse(json);
  return pages.flat();
};

/** Raw file content at a commit; null when it does not exist there. */
export const fetchFileAtRef = (repo, filePath, ref) => {
  try {
    const encoded = filePath.split('/').map(encodeURIComponent).join('/');
    return gh([
      'api',
      '-H',
      'Accept: application/vnd.github.raw+json',
      `repos/${repo}/contents/${encoded}?ref=${ref}`,
    ]);
  } catch {
    return null;
  }
};

/**
 * Merged PRs into `base` since `sinceIso` (YYYY-MM-DD), newest first, with their file paths.
 * Returns { prs, hitListLimit }.
 */
export const listMergedPrs = (repo, sinceIso, { base = 'main', limit = 1000 } = {}) => {
  const json = gh([
    'pr',
    'list',
    '--repo',
    repo,
    '--state',
    'merged',
    '--base',
    base,
    '--search',
    `merged:>=${sinceIso}`,
    '--json',
    'number,title,url,mergedAt,files',
    '--limit',
    String(limit),
  ]);
  const prs = JSON.parse(json).map((pr) => ({
    ...pr,
    files: (pr.files ?? []).map((f) => f.path),
  }));
  prs.sort((a, b) => (a.mergedAt < b.mergedAt ? 1 : -1));
  return { prs, hitListLimit: prs.length >= limit };
};
