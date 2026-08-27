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
