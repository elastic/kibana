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
    expect(text).toContain('Elastic Security · Forensics Watch → Endpoint Analysis');
    expect(text).toContain('Searched 08:00–10:00 UTC3 correlated alerts');
    expect(text).toContain('Decide 3 proposals Respond');
    expect(text).not.toContain('Analyzed');
    expect(text).toContain('win-fin-07');
    expect(text).toContain('Confirmed incident');
    expect(text).toContain('What happened');
    expect(text).toContain('1 awaiting');
    expect(text).toContain('Kill chain 4 of 14 MITRE ATT&CK tactics');
    expect(text).toContain('Close the attack and its 3 alerts');
    expect(text).toContain('Awaiting approval');
    expect(text).toContain('closes 3 alerts');
    expect(text).toContain('Timeline 2 events over 3 minutes on win-fin-07');
    expect(text).toContain('Entities from the indicators');
    expect(text).toContain('Indicators 8 extracted');
    expect(text).toContain('An approved close reaches all 3 alerts and the attack.');
  });

  it('labels every time it shows as UTC', () => {
    const text = textOf(renderForensicsSummaryHtml(fixtureViewModel).html);
    expect(text).toContain('Searched 08:00–10:00 UTC');
    expect(text).toContain('expires 2026-11-03 10:15 UTC');
    // The axis ticks, the event list and the events' tooltips.
    expect(text).toContain('08:12:03 UTC');
    expect(text).toContain('08:14:40 UTC');
    // No time anywhere without its zone.
    expect(text).not.toMatch(/\d{2}:\d{2}(:\d{2})?(?! UTC|–)\b(?!:)/);
  });

  it('shows both dates for a search window that spans days', () => {
    const viewModel = buildForensicsSummaryViewModel({
      ...fixtureInputs,
      timeline: {
        events: fixtureInputs.timeline?.events ?? [],
        window: { start: '2026-11-01T22:00:00Z', end: '2026-11-02T10:00:00Z' },
      },
    });
    expect(textOf(renderForensicsSummaryHtml(viewModel).html)).toContain(
      'Searched 2026-11-01 22:00 – 2026-11-02 10:00 UTC'
    );
  });

  it('renders a card for an analysis that left no evidence', () => {
    const { html } = renderForensicsSummaryHtml(emptyViewModel);
    const text = textOf(html);
    expect(text).toContain('Endpoint analysis');
    expect(text).toContain('Unclear');
    expect(text).toContain('No endpoint evidence');
    expect(text).toContain('Endpoint Analysis proposed nothing for this host.');
    expect(text).not.toContain('Kill chain');
    expect(text).not.toContain('Timeline');
    expect(text).not.toContain('Alerts in this attack');
  });

  it('opens the alerts under the decisions only while a close awaits one', () => {
    const { html } = renderForensicsSummaryHtml(fixtureViewModel);
    expect(html).toContain('<details class="alerts" open>');
    expect(html.indexOf('Alerts in this attack')).toBeLessThan(html.indexOf('<h2>Timeline'));
    const decided = buildForensicsSummaryViewModel({
      ...fixtureInputs,
      proposals: fixtureInputs.proposals.map((proposal) => ({
        ...proposal,
        status: 'succeeded' as const,
      })),
    });
    const decidedHtml = renderForensicsSummaryHtml(decided).html;
    expect(decidedHtml).toContain('<details class="alerts">');
    expect(decidedHtml.indexOf('Alerts in this attack')).toBeGreaterThan(
      decidedHtml.indexOf('<h2>Timeline')
    );
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

  it('colors only with theme tokens and their mixes, except the documented light-dark pairs', () => {
    const { html } = renderForensicsSummaryHtml(fixtureViewModel);
    const css = html.slice(html.indexOf('<style>'), html.indexOf('</style>'));
    const hexColors = css.match(/#[0-9a-f]{3,8}\b/gi) ?? [];
    const lightDarkColors = (css.match(/light-dark\([^)]*\)/g) ?? [])
      .join(' ')
      .match(/#[0-9a-f]{3,8}\b/gi);
    expect(hexColors.length).toBeGreaterThan(0);
    expect(hexColors).toEqual(lightDarkColors);
    expect(html.slice(html.indexOf('</style>'))).not.toMatch(/[^&]#[0-9a-f]{6}\b/i);
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
