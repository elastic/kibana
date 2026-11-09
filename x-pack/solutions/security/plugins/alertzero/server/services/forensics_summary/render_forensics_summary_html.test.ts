/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * @jest-environment jsdom
 */
// The sanitiser the card runs the summary through, DOMPurify, needs a DOM.

import {
  CUSTOM_CONTENT_MAX_HEIGHT,
  CUSTOM_CONTENT_MAX_TEMPLATE_BYTES,
  CUSTOM_CONTENT_MIN_HEIGHT,
} from '@kbn/custom-content-common';
import { sanitizeHtml } from '@kbn/custom-content-renderer';
import { fixtureInputs } from './__fixtures__/forensics_summary_inputs';
import { renderForensicsSummaryHtml } from './render_forensics_summary_html';
import { buildForensicsSummaryViewModel } from './view_model';

const fixtureViewModel = buildForensicsSummaryViewModel(fixtureInputs);
const emptyViewModel = buildForensicsSummaryViewModel({ proposals: [], alerts: [] });

const textOf = (html: string): string =>
  (new DOMParser().parseFromString(html, 'text/html').body.textContent ?? '').replace(/\s+/g, ' ');

describe('renderForensicsSummaryHtml', () => {
  it('renders every section of the card', () => {
    const text = textOf(renderForensicsSummaryHtml(fixtureViewModel).html);
    expect(text).toContain('Forensics summary');
    expect(text).toContain('win-fin-07');
    expect(text).toContain('Confirmed incident');
    expect(text).toContain('What happened');
    expect(text).toContain('1 awaiting');
    expect(text).toContain('Kill chain 4 of 14 tactics');
    expect(text).toContain('Close the attack and its 3 alerts');
    expect(text).toContain('Timeline 2 events');
    expect(text).toContain('Indicators 8 extracted');
    expect(text).toContain('+1 more');
    expect(text).toContain('An approved close reaches all 3 alerts and the attack.');
  });

  it('renders a card for an analysis that left no evidence', () => {
    const { html } = renderForensicsSummaryHtml(emptyViewModel);
    const text = textOf(html);
    expect(text).toContain('Endpoint analysis');
    expect(text).toContain('Unclear');
    expect(text).toContain('none raised');
    expect(text).not.toContain('Kill chain');
    expect(text).not.toContain('Timeline');
    expect(text).not.toContain('Alerts in this attack');
  });

  it('opens the alerts only while a close awaits a decision', () => {
    expect(renderForensicsSummaryHtml(fixtureViewModel).html).toContain('<details open>');
    const decided = buildForensicsSummaryViewModel({
      ...fixtureInputs,
      proposals: fixtureInputs.proposals.map((proposal) => ({
        ...proposal,
        status: 'succeeded' as const,
      })),
    });
    expect(renderForensicsSummaryHtml(decided).html).toContain('<details>');
  });

  it('escapes data, including braces, so neither markup nor a template survives', () => {
    const { html } = renderForensicsSummaryHtml(
      buildForensicsSummaryViewModel({
        ...fixtureInputs,
        summary: '<img src=x onerror=alert(1)> {{ steps.secret }}',
      })
    );
    expect(html).not.toContain('<img');
    expect(html).not.toContain('{{ steps.secret');
    expect(html).toContain('&lt;img');
    expect(html).toContain('&#123;&#123; steps.secret }}');
  });

  it('declares a height within the renderer bounds that grows with the content', () => {
    const full = renderForensicsSummaryHtml(fixtureViewModel).height;
    const empty = renderForensicsSummaryHtml(emptyViewModel).height;
    expect(empty).toBeGreaterThanOrEqual(CUSTOM_CONTENT_MIN_HEIGHT);
    expect(full).toBeGreaterThan(empty);
    expect(full).toBeLessThanOrEqual(CUSTOM_CONTENT_MAX_HEIGHT);
  });

  it('stays well under the template size limit', () => {
    const { html } = renderForensicsSummaryHtml(fixtureViewModel);
    expect(Buffer.byteLength(html, 'utf8')).toBeLessThan(CUSTOM_CONTENT_MAX_TEMPLATE_BYTES / 10);
  });

  it('passes through the sanitiser unchanged, so the card shows everything', () => {
    const { html } = renderForensicsSummaryHtml(fixtureViewModel);
    const bodyOf = (document: string) =>
      new DOMParser().parseFromString(document, 'text/html').body.innerHTML;

    expect(bodyOf(sanitizeHtml(html))).toBe(bodyOf(html));
  });
});
