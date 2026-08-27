/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fc } from '@fast-check/jest';
import playwright, { type Browser, type CDPSession, type Page } from 'playwright';
import { stripHtml } from './text';

const DEFAULT_FUZZ_RUNS = 100;
const MAX_FUZZ_RUNS = 10_000;
const FRAGMENTS_PER_BATCH = 10;
const FUZZ_SEED = 0x5eedc0de;
const MARKERS = [
  'TI_MARKER_ATTRIBUTE',
  'TI_MARKER_COMMENT',
  'TI_MARKER_DECOY',
  'TI_MARKER_HIDDEN',
  'TI_MARKER_NESTED',
  'TI_MARKER_VISIBLE',
] as const;

const configuredFuzzRuns = (): number => {
  const configured = Number.parseInt(process.env.TI_CONTENT_FUZZ_RUNS ?? '', 10);
  if (!Number.isSafeInteger(configured) || configured <= 0) return DEFAULT_FUZZ_RUNS;
  return Math.min(configured, MAX_FUZZ_RUNS);
};

const markersIn = (text: string): string[] => MARKERS.filter((marker) => text.includes(marker));

const tag = fc.constantFrom('article', 'div', 'main', 'p', 'section', 'span');
const hiddenStyle = fc.constantFrom(
  'display:none',
  'd\\69splay:n\\6f ne',
  'display:none !\\69mportant;display:block',
  'visibility:hidden',
  'display:block;display:none',
  'all:initial;display:none'
);
const visibleStyle = fc.constantFrom(
  'display:block',
  'display:none;display:block',
  'display:none;all:initial',
  'display:none \\!important;display:block',
  'display:none !urgent;display:block',
  'display:block;broken{;display:none',
  'display:var(;visibility:hidden',
  '\u00a0display:none',
  'visibility:hidden;visibility:visible'
);
const styleDeclaration = fc.constantFrom(
  'display:none',
  'display:block',
  'display:inline',
  'display:none!important',
  'display:block!important',
  'display:potato',
  'display:var(--missing)',
  'd\\69splay:n\\6fne',
  'visibility:hidden',
  'visibility:collapse',
  'visibility:visible',
  'visibility:initial',
  'visibility:inherit',
  'visibility:unset',
  'visibility:revert',
  'visibility:revert-layer',
  'visibility:potato',
  'visibility:var(--missing)',
  'all:initial',
  'all:inherit',
  'all:unset',
  'all:revert',
  'all:revert-layer',
  'all:initial!important',
  'all:potato',
  'all:var(--missing)',
  'display:none !urgent',
  'content:"display:none;visibility:hidden"',
  '--display:none',
  'broken{',
  'display:var('
);
const arbitraryStyle = fc
  .array(styleDeclaration, { minLength: 1, maxLength: 6 })
  .map((declarations) => declarations.join(';'));

const styledFragment = fc
  .record({ tag, hiddenStyle, visibleStyle })
  .map(
    ({ tag: element, hiddenStyle: hidden, visibleStyle: visible }) =>
      `<${element} style="${hidden}">TI_MARKER_HIDDEN</${element}>` +
      `<${element} style="${visible}">TI_MARKER_VISIBLE</${element}>`
  );

const inheritedVisibilityFragment = fc
  .record({
    parent: tag,
    child: tag,
    inheritedValue: fc.constantFrom('inherit', 'unset', 'revert', 'revert-layer'),
  })
  .map(
    ({ parent, child, inheritedValue }) =>
      `<${parent} style="visibility:hidden">TI_MARKER_HIDDEN` +
      `<${child} style="visibility:${inheritedValue}">TI_MARKER_NESTED</${child}>` +
      `<${child} style="visibility:visible">TI_MARKER_VISIBLE</${child}></${parent}>`
  );

const subtreeHiddenFragment = fc
  .record({ parent: tag, child: tag })
  .map(
    ({ parent, child }) =>
      `<${parent} style="display:none">TI_MARKER_HIDDEN` +
      `<${child} style="display:block">TI_MARKER_NESTED</${child}></${parent}>` +
      '<div>TI_MARKER_VISIBLE</div>'
  );

const cascadingStyleFragment = fc
  .record({ parent: tag, child: tag, parentStyle: arbitraryStyle, childStyle: arbitraryStyle })
  .map(
    ({ parent, child, parentStyle, childStyle }) =>
      `<${parent} style='${parentStyle}'>TI_MARKER_HIDDEN` +
      `<${child} style='${childStyle}'>TI_MARKER_NESTED</${child}></${parent}>` +
      '<div>TI_MARKER_VISIBLE</div>'
  );

const rawTextFragment = fc
  .record({
    rawTag: fc.constantFrom('script', 'style'),
    close: fc.constantFrom('>', ' >', '\t>', '\n junk>', ' foo="a>b">', '/>'),
    wrapper: tag,
  })
  .map(
    ({ rawTag, close, wrapper }) =>
      `<${rawTag}>TI_MARKER_HIDDEN</${rawTag}${close}` +
      `<${wrapper}>TI_MARKER_VISIBLE</${wrapper}>`
  );

const rawTextDecoyFragment = fc
  .record({ rawTag: fc.constantFrom('script', 'style'), wrapper: tag })
  .map(
    ({ rawTag, wrapper }) =>
      `<${rawTag}>TI_MARKER_HIDDEN</${rawTag}\u00a0>TI_MARKER_DECOY` +
      `</${rawTag}><${wrapper}>TI_MARKER_VISIBLE</${wrapper}>`
  );

const unterminatedRawTextFragment = fc
  .record({ rawTag: fc.constantFrom('script', 'style'), wrapper: tag })
  .map(
    ({ rawTag, wrapper }) => `<${wrapper}>TI_MARKER_VISIBLE</${wrapper}><${rawTag}>TI_MARKER_HIDDEN`
  );

const nonMarkupFragment = fc
  .record({ wrapper: tag })
  .map(
    ({ wrapper }) =>
      `<!-- <script>TI_MARKER_COMMENT</script> -->` +
      `<${wrapper} title="<style>TI_MARKER_ATTRIBUTE</style>">TI_MARKER_VISIBLE</${wrapper}>`
  );

const malformedCommentFragment = fc
  .record({ wrapper: tag })
  .map(
    ({ wrapper }) => `<${wrapper}>TI_MARKER_VISIBLE</${wrapper}><!-- TI_MARKER_COMMENT <script>`
  );

const fragment = fc.oneof(
  styledFragment,
  inheritedVisibilityFragment,
  subtreeHiddenFragment,
  cascadingStyleFragment,
  rawTextFragment,
  rawTextDecoyFragment,
  unterminatedRawTextFragment,
  nonMarkupFragment,
  malformedCommentFragment
);

const renderedTexts = async (
  pages: Page[],
  sessions: CDPSession[],
  fragments: string[]
): Promise<string[]> => {
  const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">`;
  return Promise.all(
    fragments.map(async (html, index) => {
      const page = pages[index];
      await page.goto(`data:text/html,${encodeURIComponent(csp + html)}`, {
        waitUntil: 'domcontentloaded',
        timeout: 5_000,
      });
      const evaluation = await sessions[index].send('Runtime.evaluate', {
        expression: 'document.documentElement.innerText',
        returnByValue: true,
      });
      return typeof evaluation.result.value === 'string' ? evaluation.result.value : '';
    })
  );
};

describe('content extraction agrees with Chromium marker visibility', () => {
  jest.setTimeout(120_000);

  let browser: Browser | undefined;
  let pages: Page[] = [];
  let sessions: CDPSession[] = [];

  beforeAll(async () => {
    const launchedBrowser = await playwright.chromium.launch({ headless: true });
    browser = launchedBrowser;
    pages = await Promise.all(
      Array.from({ length: FRAGMENTS_PER_BATCH }, () => launchedBrowser.newPage())
    );
    sessions = await Promise.all(pages.map((page) => page.context().newCDPSession(page)));
  });

  afterAll(async () => {
    await browser?.close();
  });

  it('matches a deterministic generated corpus', async () => {
    if (pages.length !== FRAGMENTS_PER_BATCH || sessions.length !== FRAGMENTS_PER_BATCH) {
      throw new Error('Browser oracle pages were not initialized');
    }

    const fuzzRuns = configuredFuzzRuns();
    const batches = Math.ceil(fuzzRuns / FRAGMENTS_PER_BATCH);
    const batch = fc.array(fragment, {
      minLength: FRAGMENTS_PER_BATCH,
      maxLength: FRAGMENTS_PER_BATCH,
    });

    await fc.assert(
      fc.asyncProperty(batch, async (fragments) => {
        const browserTexts = await renderedTexts(pages, sessions, fragments);
        for (let index = 0; index < fragments.length; index++) {
          const browserMarkers = markersIn(browserTexts[index]);
          const extractedMarkers = markersIn(stripHtml(fragments[index]));
          if (browserMarkers.join('\n') !== extractedMarkers.join('\n')) {
            throw new Error(
              JSON.stringify({
                fragment: fragments[index],
                browserMarkers,
                extractedMarkers,
              })
            );
          }
        }
      }),
      { numRuns: batches, seed: FUZZ_SEED, verbose: true }
    );
  });

  it('preserves content after an intentionally supported XHTML self-closing raw-text tag', () => {
    expect(stripHtml('<script src="x.js"/><p>TI_MARKER_VISIBLE</p>')).toBe('TI_MARKER_VISIBLE');
  });
});
