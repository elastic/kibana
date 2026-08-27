/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { classifyHeader, normalizeHeader } from './section_headers';

describe('normalizeHeader', () => {
  it('lowercases', () => {
    expect(normalizeHeader('Indicators Of Compromise')).toBe('indicators of compromise');
  });

  // Real headings carry the abbreviation in parentheses constantly.
  it('strips a trailing parenthetical', () => {
    expect(normalizeHeader('Indicators of Compromise (IOCs)')).toBe('indicators of compromise');
  });

  it('strips trailing punctuation', () => {
    expect(normalizeHeader('Sources:')).toBe('sources');
  });

  it('collapses internal whitespace, including what the parenthetical strip leaves', () => {
    expect(normalizeHeader('Indicators   of  Compromise  (IOCs)')).toBe('indicators of compromise');
  });

  it('handles an already-normal heading unchanged', () => {
    expect(normalizeHeader('iocs')).toBe('iocs');
  });
});

describe('classifyHeader', () => {
  // These drive whether anchor hrefs in a section are lifted as candidate IOCs or
  // dropped, so a misclassification silently loses href-only indicators.
  it.each([
    'Indicators of Compromise',
    'IOCs',
    'IOC',
    'Indicators',
    'Observables',
    'indicators of compromise (IOCs)',
  ])('classifies %s as an IOC section', (heading) => {
    expect(classifyHeader(heading)).toBe('ioc');
  });

  it.each(['References', 'Sources:', 'Bibliography', 'Further Reading', 'Acknowledgements'])(
    'classifies %s as a references section',
    (heading) => {
      expect(classifyHeader(heading)).toBe('references');
    }
  );

  // Prefix matching, so the many variations on "Related ..." do not each need a term.
  it.each([
    'Related Articles',
    'Related Posts',
    'Similar Reports',
    'Share this post',
    'About the Author',
    'Discover more from us',
  ])('classifies %s as references via its prefix', (heading) => {
    expect(classifyHeader(heading)).toBe('references');
  });

  it.each(['Executive Summary', 'Attribution', 'Timeline', 'Recommendations', ''])(
    'classifies %s as prose',
    (heading) => {
      expect(classifyHeader(heading)).toBe('prose');
    }
  );

  // A term that merely contains an IOC word must not match, or a prose heading like
  // "Threat Indicators Explained" would turn its whole section into IOC candidates.
  it('requires the whole normalized heading to match, not a substring', () => {
    expect(classifyHeader('Threat Indicators Explained')).toBe('prose');
  });
});

/**
 * The vocabulary was written in whichever number each heading usually appears in, so the
 * other spelling silently classified as prose and dropped href-only indicators beneath it.
 * `matchesTerm` covers the class; the internal-plural phrase is listed explicitly.
 */
describe('singular and plural heading spellings', () => {
  it.each([
    ['Indicator of Compromise', 'ioc'],
    ['Indicators of Compromise', 'ioc'],
    ['Indicator', 'ioc'],
    ['Indicators', 'ioc'],
    ['IOC', 'ioc'],
    ['IOCs', 'ioc'],
    ['Observable', 'ioc'],
    ['Observables', 'ioc'],
    ['Observation', 'ioc'],
    ['Observations', 'ioc'],
    ['Reference', 'references'],
    ['References', 'references'],
    ['Source', 'references'],
    ['Sources', 'references'],
    ['Comment', 'references'],
    ['Comments', 'references'],
    ['Acknowledgement', 'references'],
    ['Acknowledgements', 'references'],
    ['Author', 'references'],
    ['Authors', 'references'],
  ])('classifies %s as %s', (heading, expected) => {
    expect(classifyHeader(heading)).toBe(expected);
  });

  // The tolerance must not start swallowing ordinary prose headings.
  it.each([['Indication'], ['Analysis'], ['Overview'], ['Summary'], ['Timeline']])(
    'leaves %s as prose',
    (heading) => {
      expect(classifyHeader(heading)).toBe('prose');
    }
  );

  it('still applies the trailing parenthetical strip to the singular form', () => {
    expect(classifyHeader('Indicator of Compromise (IOC)')).toBe('ioc');
  });
});

/**
 * A trailing parenthetical and trailing punctuation can appear in either order, and
 * stripping the parenthetical first meant a trailing colon defeated the anchored match.
 * `Indicators of Compromise (IOCs):` then classified as prose and dropped every indicator
 * beneath it. All of these are ordinary vendor heading formatting.
 */
describe('trailing punctuation around a parenthetical', () => {
  it.each([
    ['Indicators of Compromise (IOCs)', 'ioc'],
    ['Indicators of Compromise (IOCs):', 'ioc'],
    ['Indicators of Compromise (IOCs) :', 'ioc'],
    ['IOCs (updated).', 'ioc'],
    ['References (2024):', 'references'],
    ['Sources:', 'references'],
    ['iocs.', 'ioc'],
  ])('classifies %s as %s', (heading, expected) => {
    expect(classifyHeader(heading)).toBe(expected);
  });

  it('still leaves a heading with trailing prose as prose', () => {
    expect(classifyHeader('IOC (list) extra words')).toBe('prose');
  });

  // Headings come from attacker-controlled markup, so the strip loop is bounded rather
  // than run to a fixed point.
  it('stays cheap on a heading built from many parenthetical groups', () => {
    const started = process.hrtime.bigint();
    normalizeHeader('(a)'.repeat(20000));
    const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;

    expect(elapsedMs).toBeLessThan(200);
  });
});

/**
 * The trailing-parenthetical group is `[^()]*` so a failed attempt cannot scan past another
 * opening parenthesis. With `[^)]*`, a heading shaped `'('.repeat(n) + ')(ok)'` made every
 * opener scan to the same close and fail the end anchor: 27ms at n=8,000, 403ms at 32,000
 * and 6.2s at 128,000, and the strip loop runs it up to four times. Headings come from
 * `<h2>` content in a page capped at 10MB, so n is not small.
 */
describe('heading normalization resists backtracking', () => {
  it('stays cheap on an unbalanced nested-prefix heading', () => {
    const started = process.hrtime.bigint();
    normalizeHeader(`${'('.repeat(128000)})(ok)`);
    const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;

    expect(elapsedMs).toBeLessThan(500);
  });

  it.each([
    ['indicators of compromise (iocs)', 'indicators of compromise'],
    ['iocs (updated)', 'iocs'],
    ['references (2024)', 'references'],
    // The strip repeats by design, so a heading with two trailing parentheticals loses
    // both. That is a deliberate consequence of looping to handle `(IOCs):`, and it is the
    // direction that classifies more headings rather than fewer.
    ['a (b) (c)', 'a'],
  ])('still strips the trailing parenthetical of %s', (heading, expected) => {
    expect(normalizeHeader(heading)).toBe(expected);
  });
});

/**
 * A trailing `s` is not the only way English pluralizes. `bibliography` was listed and
 * `Bibliographies` classified as prose, so the heading did not terminate the intelligence
 * section and citations below it were treated as report prose rather than reference noise.
 * Handled as the `y`/`ies` class rather than by adding the one word.
 */
describe('irregular plural headings', () => {
  it.each([
    ['Bibliography', 'references'],
    ['Bibliographies', 'references'],
    ['bibliographies', 'references'],
  ])('classifies %s as %s', (heading, expected) => {
    expect(classifyHeader(heading)).toBe(expected);
  });

  // The wider tolerance must not start matching prose headings.
  it.each([['Glossary'], ['Glossaries'], ['Analysis'], ['Summary'], ['Overview']])(
    'leaves %s as prose',
    (heading) => {
      expect(classifyHeader(heading)).toBe('prose');
    }
  );
});
