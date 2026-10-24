/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  OTEL_EVENT_DEAD_CLICK,
  OTEL_EVENT_ERROR_CLICK,
  OTEL_EVENT_EXCEPTION,
  OTEL_EVENT_RAGE_CLICK,
  OTEL_EVENT_USER_ACTION_CLICK,
  OTEL_EXCEPTION_MESSAGE,
  OTEL_EXCEPTION_TYPE,
} from './otel_rum';

export interface SessionFind {
  path?: string;
  click?: string;
  error?: string;
  user?: string;
  account?: string;
  /** Unprefixed remainder (user / page / session id haystack). */
  text?: string;
}

const PREFIX_RE = /\b(path|click|error|user|account):(?:"([^"]+)"|(\S+))/gi;
const FIND_MAX = 128;
const REGEXP_META = /[.+*?|()[\]{}^$]/;
const EMAIL_LIKE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PAGE_URL_FIELDS = [
  'attributes.page.url.path',
  'attributes.page.url',
  'attributes.url.full',
  'attributes.http.url',
  'url.full',
  'page.url.path',
  'page.url',
  'http.url',
] as const;

export const CLICK_TARGET_FIELDS = [
  'attributes.browser.css_selector',
  'attributes.target_xpath',
  'browser.css_selector',
  'target_xpath',
] as const;

export const FIND_USER_FIELDS = [
  'attributes.user.id',
  'resource.attributes.user.id',
  'attributes.user.email',
  'resource.attributes.user.email',
  'attributes.user.name',
  'resource.attributes.user.name',
] as const;

export const FIND_ACCOUNT_FIELDS = [
  'attributes.user.account',
  'resource.attributes.user.account',
  ...FIND_USER_FIELDS,
] as const;

export const FIND_SESSION_ID_FIELDS = [
  'attributes.session.id',
  'attributes.rum.sessionId',
  'resource.attributes.session.id',
  'resource.attributes.rum.sessionId',
] as const;

export const SESSION_INDEX_USER_FIELDS = ['user.key'] as const;
export const SESSION_INDEX_PAGE_FIELDS = ['pages', 'entry_page', 'exit_page'] as const;
export const SESSION_INDEX_CLICK_FIELDS = ['clicks'] as const;
export const SESSION_INDEX_HAYSTACK_FIELDS = [
  'user.key',
  'session.id',
  'pages',
  'clicks',
  'entry_page',
  'exit_page',
] as const;

export const isEmailLike = (raw: string): boolean => EMAIL_LIKE.test(raw.trim());

const CLICK_EVENT_FILTER = {
  bool: {
    should: [
      { term: { event_name: OTEL_EVENT_USER_ACTION_CLICK } },
      { term: { name: 'click' } },
      { term: { event_name: OTEL_EVENT_RAGE_CLICK } },
      { term: { event_name: OTEL_EVENT_DEAD_CLICK } },
      { term: { event_name: OTEL_EVENT_ERROR_CLICK } },
    ],
    minimum_should_match: 1,
  },
};

const EXCEPTION_EVENT_FILTER = {
  bool: {
    should: [
      { term: { event_name: OTEL_EVENT_EXCEPTION } },
      { term: { name: OTEL_EVENT_EXCEPTION } },
      { term: { 'attributes.event.outcome': 'failure' } },
      { term: { 'attributes.log.level': 'ERROR' } },
    ],
    minimum_should_match: 1,
  },
};

const bound = (raw: string): string => raw.trim().slice(0, FIND_MAX);

const escapeWildcard = (raw: string): string => raw.replace(/[\\*?]/g, '\\$&');

const uniq = (values: Array<string | undefined>): string[] => {
  const out: string[] = [];
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed && !out.includes(trimmed)) {
      out.push(trimmed);
    }
  }
  return out;
};

/** Parse `path:/checkout click:#buy error:TypeError user:ada` plus bare `/path` or `#sel`. */
export const parseSessionFind = (raw?: string): SessionFind => {
  if (!raw?.trim()) {
    return {};
  }
  const find: SessionFind = {};
  let leftover = '';
  let last = 0;
  PREFIX_RE.lastIndex = 0;
  let match = PREFIX_RE.exec(raw);
  while (match) {
    leftover += raw.slice(last, match.index);
    last = match.index + match[0].length;
    const key = match[1].toLowerCase() as keyof SessionFind;
    const value = bound(match[2] ?? match[3] ?? '');
    if (value) {
      find[key] = value;
    }
    match = PREFIX_RE.exec(raw);
  }
  leftover = `${leftover}${raw.slice(last)}`.trim();
  if (!leftover) {
    return find;
  }
  if (!find.path && leftover.startsWith('/')) {
    find.path = bound(leftover);
    return find;
  }
  if (!find.click && /^[.#[]/.test(leftover)) {
    find.click = bound(leftover);
    return find;
  }
  if (!find.user && isEmailLike(leftover)) {
    find.user = bound(leftover);
    return find;
  }
  find.text = leftover.slice(0, 200);
  return find;
};

export const mergeSessionFind = (
  parsed: SessionFind,
  fromUrl: Pick<SessionFind, 'path' | 'click' | 'user' | 'account'>
): SessionFind => ({
  path: parsed.path ?? fromUrl.path,
  click: parsed.click ?? fromUrl.click,
  error: parsed.error,
  user: parsed.user ?? fromUrl.user,
  account: parsed.account ?? fromUrl.account,
  text: parsed.text,
});

export const hasStructuredFind = (find: SessionFind): boolean =>
  Boolean(find.path || find.click || find.error || find.user || find.account);

const escapeRegexpLiteral = (raw: string): string => raw.replace(/[.+*?|()[\]{}^$\\]/g, '\\$&');

/** Case-insensitive contains match on keyword fields. */
export const wildcardContains = (fields: readonly string[], raw: string): object => {
  const value = `*${escapeWildcard(bound(raw))}*`;
  return {
    bool: {
      should: fields.map((field) => ({
        wildcard: { [field]: { value, case_insensitive: true } },
      })),
      minimum_should_match: 1,
    },
  };
};

export const pagePathFilter = (raw: string): object => {
  const trimmed = bound(raw);
  if (trimmed.startsWith('^')) {
    const rest = escapeRegexpLiteral(trimmed.slice(1));
    return {
      bool: {
        should: PAGE_URL_FIELDS.map((field) => ({
          regexp: { [field]: { value: `${rest}.*`, case_insensitive: true } },
        })),
        minimum_should_match: 1,
      },
    };
  }
  if (REGEXP_META.test(trimmed)) {
    return {
      bool: {
        should: PAGE_URL_FIELDS.map((field) => ({
          regexp: { [field]: { value: trimmed, case_insensitive: true } },
        })),
        minimum_should_match: 1,
      },
    };
  }
  return wildcardContains(PAGE_URL_FIELDS, trimmed);
};

const identityFilter = (raw: string, fields: readonly string[]): object =>
  wildcardContains(fields, raw);

/**
 * Independent ES filter groups. Session ids from each group are intersected
 * (AND). Click+identity and error+path stay on one document when both are set.
 */
export const sessionFindClauses = (find: SessionFind, extraPaths: string[] = []): object[][] => {
  const clauses: object[][] = [];
  const paths = uniq([find.path, ...extraPaths]);
  const parsedPath = find.path;

  if (find.click && (find.user || find.account)) {
    const identity = find.account
      ? identityFilter(find.account, FIND_ACCOUNT_FIELDS)
      : identityFilter(find.user!, FIND_USER_FIELDS);
    clauses.push([CLICK_EVENT_FILTER, wildcardContains(CLICK_TARGET_FIELDS, find.click), identity]);
  } else {
    if (find.click) {
      clauses.push([CLICK_EVENT_FILTER, wildcardContains(CLICK_TARGET_FIELDS, find.click)]);
    }
    if (find.account) {
      clauses.push([identityFilter(find.account, FIND_ACCOUNT_FIELDS)]);
    } else if (find.user) {
      clauses.push([identityFilter(find.user, FIND_USER_FIELDS)]);
    }
  }

  if (find.error && parsedPath) {
    clauses.push([
      EXCEPTION_EVENT_FILTER,
      wildcardContains([OTEL_EXCEPTION_TYPE, OTEL_EXCEPTION_MESSAGE], find.error),
      pagePathFilter(parsedPath),
    ]);
    for (const path of paths) {
      if (path !== parsedPath) {
        clauses.push([pagePathFilter(path)]);
      }
    }
  } else {
    if (find.error) {
      clauses.push([
        EXCEPTION_EVENT_FILTER,
        wildcardContains([OTEL_EXCEPTION_TYPE, OTEL_EXCEPTION_MESSAGE], find.error),
      ]);
    }
    for (const path of paths) {
      clauses.push([pagePathFilter(path)]);
    }
  }

  return clauses;
};

export const sessionIdTermsFilter = (ids: string[]): object => ({
  bool: {
    should: FIND_SESSION_ID_FIELDS.map((field) => ({ terms: { [field]: ids } })),
    minimum_should_match: 1,
  },
});

export const intersectSessionIds = (sets: string[][]): string[] => {
  if (sets.length === 0) {
    return [];
  }
  const [first, ...rest] = sets;
  if (!first) {
    return [];
  }
  if (rest.length === 0) {
    return first;
  }
  const others = rest.map((set) => new Set(set));
  return first.filter((id) => others.every((set) => set.has(id)));
};

export const extraPathsForFind = (find: SessionFind, pageUrl?: string): string[] => {
  if (!pageUrl?.trim()) {
    return [];
  }
  if (find.path && find.path === pageUrl.trim()) {
    return [];
  }
  return [pageUrl.trim()];
};

/** Session-index filters for the same find tokens used on raw events. */
export const sessionIndexFindFilters = (find: SessionFind, extraPaths: string[] = []): object[] => {
  const filters: object[] = [];
  const identity = find.account ?? find.user;
  if (identity) {
    filters.push(wildcardContains(SESSION_INDEX_USER_FIELDS, identity));
  }
  if (find.path) {
    filters.push(wildcardContains(SESSION_INDEX_PAGE_FIELDS, find.path));
  }
  for (const path of extraPaths) {
    filters.push(wildcardContains(SESSION_INDEX_PAGE_FIELDS, path));
  }
  if (find.click) {
    filters.push(wildcardContains(SESSION_INDEX_CLICK_FIELDS, find.click));
  }
  if (find.error) {
    filters.push({ range: { error_count: { gt: 0 } } });
  }
  if (find.text) {
    filters.push(wildcardContains(SESSION_INDEX_HAYSTACK_FIELDS, find.text));
  }
  return filters;
};
