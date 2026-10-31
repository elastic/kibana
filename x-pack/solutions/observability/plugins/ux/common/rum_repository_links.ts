/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RumErrorGroup, RumPageRow } from './rum_app';
import type { RumAppSettings } from './rum_app_settings';
import type { RumSessionSummary } from './session_replay';

const ISSUE_TITLE_MAX = 256;
const ISSUE_BODY_MAX = 6000;
const STACK_LINES_MAX = 25;
const LABELS_MAX = 10;

export interface GithubRepo {
  origin: string;
  owner: string;
  repo: string;
}

export interface SourceFrame {
  file: string;
  line: number | null;
  column: number | null;
}

export interface GithubIssueDraft {
  title: string;
  body: string;
}

export interface RumGithubLinks {
  issueHref?: string;
  fileHref?: string;
  fileLabel?: string;
}

const SOURCE_EXT = /\.(tsx?|jsx?|mjs|cjs|vue|svelte|kt|java|swift)$/i;
const KEEP_WEBPACK_ROOT = /^(src|app|lib|packages|x-pack|server|public|common|internal|pkg|apps)\b/;
const FRAME_LINE = /(?:\(|@|\s)((?:webpack:\/+)?[^()\s]+?):(\d+)(?::(\d+))?\)?\s*$/;

const isGithubHost = (host: string): boolean => {
  const name = host.toLowerCase();
  return name === 'github.com' || name.endsWith('.github.com') || name.startsWith('github.');
};

/** Owner/repo from an http(s) GitHub remote. */
export const parseGithubRepo = (repositoryUrl: string): GithubRepo | undefined => {
  try {
    const url = new URL(repositoryUrl.trim());
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return undefined;
    }
    if (!isGithubHost(url.hostname)) {
      return undefined;
    }
    const parts = url.pathname
      .replace(/\.git$/i, '')
      .split('/')
      .filter(Boolean);
    if (parts.length < 2) {
      return undefined;
    }
    const owner = parts[0];
    const repo = parts[1].replace(/\.git$/i, '');
    if (!owner || !repo) {
      return undefined;
    }
    return { origin: url.origin, owner, repo };
  } catch {
    return undefined;
  }
};

export const parseIssueLabels = (raw: string): string[] =>
  raw
    .split(',')
    .map((label) => label.trim())
    .filter((label) => label.length > 0)
    .slice(0, LABELS_MAX);

const stripWebpackPrefix = (file: string): string => {
  let path = file.trim().replace(/\\/g, '/');
  const fromWebpack = path.startsWith('webpack:');
  path = path.replace(/^webpack:\/+/, '');
  if (path.startsWith('./')) {
    path = path.slice(2);
  }
  const slash = path.indexOf('/');
  if (fromWebpack && slash > 0 && !KEEP_WEBPACK_ROOT.test(path)) {
    path = path.slice(slash + 1);
  }
  return path.replace(/^\/+/, '');
};

const isRepoSourceFile = (file: string): boolean => {
  if (!file || file === '<anonymous>' || file.includes('node_modules')) {
    return false;
  }
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(file) && !file.startsWith('webpack:')) {
    return false;
  }
  const stripped = stripWebpackPrefix(file);
  if (!stripped || stripped.includes('webpack/runtime')) {
    return false;
  }
  return SOURCE_EXT.test(stripped) || stripped.includes('/');
};

/** Join sourceRoot with a mapped path; do not double-prefix. */
export const repoFilePath = (file: string, sourceRoot: string): string => {
  const path = stripWebpackPrefix(file);
  const root = sourceRoot.replace(/^\/+|\/+$/g, '');
  if (!root || path === root || path.startsWith(`${root}/`)) {
    return path;
  }
  return `${root}/${path}`;
};

/** First in-repo frame from a JS stack string. */
export const firstSourceFrame = (stack: string | null | undefined): SourceFrame | undefined => {
  if (!stack) {
    return undefined;
  }
  for (const rawLine of stack.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('Error') || !line.includes(':')) {
      continue;
    }
    const match = line.match(FRAME_LINE);
    if (!match) {
      continue;
    }
    const file = match[1];
    if (!isRepoSourceFile(file)) {
      continue;
    }
    const lineNo = Number(match[2]);
    const columnNo = match[3] == null ? NaN : Number(match[3]);
    return {
      file: stripWebpackPrefix(file),
      line: Number.isFinite(lineNo) ? lineNo : null,
      column: Number.isFinite(columnNo) ? columnNo : null,
    };
  }
  return undefined;
};

const encodePath = (path: string): string =>
  path
    .split('/')
    .filter((segment) => segment.length > 0)
    .map(encodeURIComponent)
    .join('/');

export const githubBlobHref = (
  settings: Pick<RumAppSettings, 'repositoryUrl' | 'defaultBranch' | 'sourceRoot'>,
  stack: string | null | undefined,
  commitSha?: string
): { href: string; label: string } | undefined => {
  const repo = parseGithubRepo(settings.repositoryUrl);
  const frame = firstSourceFrame(stack);
  if (!repo || !frame) {
    return undefined;
  }
  const path = repoFilePath(frame.file, settings.sourceRoot);
  if (!path) {
    return undefined;
  }
  const ref = (commitSha?.trim() || settings.defaultBranch || 'main').replace(/^\/+|\/+$/g, '');
  const line = frame.line != null ? `#L${frame.line}` : '';
  const href = `${repo.origin}/${encodeURIComponent(repo.owner)}/${encodeURIComponent(
    repo.repo
  )}/blob/${encodeURIComponent(ref)}/${encodePath(path)}${line}`;
  const label = frame.line != null ? `${path}:${frame.line}` : path;
  return { href, label };
};

export const githubIssueHref = (
  settings: Pick<RumAppSettings, 'repositoryUrl' | 'issueLabels'>,
  draft: GithubIssueDraft
): string | undefined => {
  const repo = parseGithubRepo(settings.repositoryUrl);
  if (!repo) {
    return undefined;
  }
  const params = new URLSearchParams();
  params.set('title', draft.title.slice(0, ISSUE_TITLE_MAX));
  params.set('body', draft.body.slice(0, ISSUE_BODY_MAX));
  const labels = parseIssueLabels(settings.issueLabels);
  if (labels.length > 0) {
    params.set('labels', labels.join(','));
  }
  return `${repo.origin}/${encodeURIComponent(repo.owner)}/${encodeURIComponent(
    repo.repo
  )}/issues/new?${params.toString()}`;
};

const clipStack = (stack: string | null | undefined): string => {
  if (!stack) {
    return '';
  }
  return stack.split('\n').slice(0, STACK_LINES_MAX).join('\n').slice(0, 4000);
};

const firstLine = (message: string): string => message.split('\n')[0].trim();

export const githubIssueDraftFromError = (
  group: Pick<
    RumErrorGroup,
    'type' | 'message' | 'sampleStack' | 'samplePage' | 'count' | 'sessionCount'
  >,
  context: { serviceName: string; rangeFrom?: string; rangeTo?: string }
): GithubIssueDraft => {
  const message = firstLine(group.message);
  const title = `${group.type}: ${message}`.slice(0, ISSUE_TITLE_MAX);
  const range =
    context.rangeFrom && context.rangeTo ? `${context.rangeFrom} → ${context.rangeTo}` : undefined;
  const stack = clipStack(group.sampleStack);
  const body = [
    `## ${group.type}`,
    '',
    message,
    '',
    `- App: \`${context.serviceName}\``,
    range ? `- Range: ${range}` : undefined,
    `- Events: ${group.count} in ${group.sessionCount} sessions`,
    group.samplePage ? `- Page: \`${group.samplePage}\`` : undefined,
    stack ? `\n### Stack\n\n\`\`\`\n${stack}\n\`\`\`` : undefined,
  ]
    .filter((line): line is string => line != null)
    .join('\n');
  return { title, body };
};

export const githubIssueDraftFromEvidence = ({
  serviceName,
  rangeFrom,
  rangeTo,
  score,
  pages,
  errors,
  sessions,
}: {
  serviceName: string;
  rangeFrom: string;
  rangeTo: string;
  score?: number | null;
  pages: RumPageRow[];
  errors: RumErrorGroup[];
  sessions: Array<Pick<RumSessionSummary, 'sessionId'>>;
}): GithubIssueDraft => {
  const top = errors[0];
  const base = top
    ? githubIssueDraftFromError(top, { serviceName, rangeFrom, rangeTo })
    : {
        title: score == null ? serviceName : `${serviceName}: score ${score}`,
        body: [`- App: \`${serviceName}\``, `- Range: ${rangeFrom} → ${rangeTo}`].join('\n'),
      };
  const extra = [
    '',
    '### Evidence',
    score == null ? undefined : `- Score: ${score}`,
    ...pages.slice(0, 3).map((page) => `- Page \`${page.path}\` p75 LCP ${page.p75Lcp ?? '—'}ms`),
    ...errors.slice(0, 3).map((group) => `- ${group.type}: ${firstLine(group.message)}`),
    ...sessions.slice(0, 5).map((session) => `- Session \`${session.sessionId}\``),
  ].filter((line): line is string => line != null);
  return {
    title: base.title,
    body: `${base.body}\n${extra.join('\n')}`.slice(0, ISSUE_BODY_MAX),
  };
};

export const rumGithubLinksForError = (
  settings: RumAppSettings,
  group: Pick<
    RumErrorGroup,
    'type' | 'message' | 'sampleStack' | 'samplePage' | 'count' | 'sessionCount'
  >,
  context: { rangeFrom?: string; rangeTo?: string }
): RumGithubLinks => {
  const file = githubBlobHref(settings, group.sampleStack);
  const issueHref = githubIssueHref(
    settings,
    githubIssueDraftFromError(group, { serviceName: settings.serviceName, ...context })
  );
  return {
    issueHref,
    fileHref: file?.href,
    fileLabel: file?.label,
  };
};

export const rumGithubLinksForEvidence = (
  settings: RumAppSettings,
  pack: {
    rangeFrom: string;
    rangeTo: string;
    score?: number | null;
    pages: RumPageRow[];
    errors: RumErrorGroup[];
    sessions: Array<Pick<RumSessionSummary, 'sessionId'>>;
  },
  draft?: GithubIssueDraft
): RumGithubLinks => {
  const file = githubBlobHref(settings, pack.errors[0]?.sampleStack);
  return {
    issueHref: draft ? githubIssueHref(settings, draft) : undefined,
    fileHref: file?.href,
    fileLabel: file?.label,
  };
};
