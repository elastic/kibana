/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { emptyRumAppSettings, normalizeRumAppSettings } from './rum_app_settings';
import {
  firstSourceFrame,
  githubBlobHref,
  githubIssueDraftFromError,
  githubIssueHref,
  parseGithubRepo,
  parseIssueLabels,
  repoFilePath,
  rumGithubLinksForEvidence,
} from './rum_repository_links';

describe('parseGithubRepo', () => {
  it('reads owner and repo from an https remote', () => {
    expect(parseGithubRepo('https://github.com/elastic/kibana.git')).toEqual({
      origin: 'https://github.com',
      owner: 'elastic',
      repo: 'kibana',
    });
  });

  it('accepts GitHub Enterprise hosts', () => {
    expect(parseGithubRepo('https://github.elastic.co/obs/shop')).toEqual({
      origin: 'https://github.elastic.co',
      owner: 'obs',
      repo: 'shop',
    });
  });

  it('rejects non-GitHub remotes', () => {
    expect(parseGithubRepo('https://gitlab.com/elastic/kibana')).toBeUndefined();
    expect(parseGithubRepo('')).toBeUndefined();
  });
});

describe('firstSourceFrame', () => {
  it('reads a webpack mapped frame and skips the bundled URL', () => {
    const stack = `TypeError: Cannot read properties of undefined
    at checkout (https://cdn.example.com/app.js:1:234)
    at checkout (webpack://kibana/src/cart.ts:12:3)`;
    expect(firstSourceFrame(stack)).toEqual({ file: 'src/cart.ts', line: 12, column: 3 });
  });

  it('reads a relative Chrome frame', () => {
    expect(firstSourceFrame('    at Object.buy (src/checkout.tsx:88:13)')).toEqual({
      file: 'src/checkout.tsx',
      line: 88,
      column: 13,
    });
  });

  it('skips node_modules and anonymous frames', () => {
    const stack = `Error: boom
    at fn (node_modules/react/index.js:1:1)
    at Array.forEach (<anonymous>)`;
    expect(firstSourceFrame(stack)).toBeUndefined();
  });
});

describe('repoFilePath', () => {
  it('prefixes sourceRoot unless the path already has it', () => {
    expect(repoFilePath('src/cart.ts', 'packages/shop')).toBe('packages/shop/src/cart.ts');
    expect(repoFilePath('packages/shop/src/cart.ts', 'packages/shop')).toBe(
      'packages/shop/src/cart.ts'
    );
  });
});

describe('githubBlobHref', () => {
  const settings = normalizeRumAppSettings('shop', {
    repositoryUrl: 'https://github.com/acme/shop',
    defaultBranch: 'main',
    sourceRoot: 'packages/shop',
  });

  it('builds a blob URL on the default branch', () => {
    const link = githubBlobHref(settings, '    at buy (src/cart.ts:12:3)');
    expect(link?.href).toBe('https://github.com/acme/shop/blob/main/packages/shop/src/cart.ts#L12');
    expect(link?.label).toBe('packages/shop/src/cart.ts:12');
  });

  it('prefers a commit SHA when present', () => {
    const link = githubBlobHref(settings, '    at buy (src/cart.ts:12:3)', 'abc123');
    expect(link?.href).toContain('/blob/abc123/');
  });
});

describe('githubIssueHref', () => {
  it('puts title, body, and labels on issues/new', () => {
    const href = githubIssueHref(
      normalizeRumAppSettings('shop', {
        repositoryUrl: 'https://github.com/acme/shop',
        issueLabels: 'bug, rum',
      }),
      { title: 'TypeError: boom', body: 'hello' }
    );
    expect(href).toContain('https://github.com/acme/shop/issues/new?');
    const query = new URL(href ?? '').searchParams;
    expect(query.get('title')).toBe('TypeError: boom');
    expect(query.get('body')).toBe('hello');
    expect(query.get('labels')).toBe('bug,rum');
  });
});

describe('parseIssueLabels', () => {
  it('splits and trims', () => {
    expect(parseIssueLabels(' bug, rum , ')).toEqual(['bug', 'rum']);
  });
});

describe('githubIssueDraftFromError', () => {
  it('includes the app, page, and stack', () => {
    const draft = githubIssueDraftFromError(
      {
        type: 'TypeError',
        message: 'Cannot read properties of undefined',
        sampleStack: '    at buy (src/cart.ts:12:3)',
        samplePage: '/checkout',
        count: 4,
        sessionCount: 2,
      },
      { serviceName: 'shop', rangeFrom: 'now-24h', rangeTo: 'now' }
    );
    expect(draft.title).toBe('TypeError: Cannot read properties of undefined');
    expect(draft.body).toContain('shop');
    expect(draft.body).toContain('/checkout');
    expect(draft.body).toContain('src/cart.ts:12:3');
  });
});

describe('rumGithubLinksForEvidence', () => {
  it('omits the issue link until an analyst draft is provided', () => {
    const settings = normalizeRumAppSettings('shop', {
      repositoryUrl: 'https://github.com/acme/shop',
      issueLabels: 'rum',
    });
    const pack = {
      rangeFrom: 'now-24h',
      rangeTo: 'now',
      score: 76,
      pages: [{ path: '/checkout', p75Lcp: 4000 } as never],
      errors: [
        {
          type: 'TypeError',
          message: 'boom',
          sampleStack: '    at buy (src/cart.ts:12:3)',
          samplePage: '/checkout',
          count: 1,
          sessionCount: 1,
        } as never,
      ],
      sessions: [{ sessionId: 's-1' }],
    };
    expect(rumGithubLinksForEvidence(settings, pack).issueHref).toBeUndefined();
    const links = rumGithubLinksForEvidence(settings, pack, {
      title: 'TypeError on checkout',
      body: 'Checkout is throwing.',
    });
    expect(links.issueHref).toContain('/issues/new?');
    expect(links.fileHref).toContain('/blob/main/src/cart.ts#L12');
    expect(emptyRumAppSettings('shop').repositoryUrl).toBe('');
  });
});
