/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements under the Elastic License 2.0; you may
 * not use this file except in compliance with the Elastic License 2.0.
 */

import { esc, mdToHtml, renderReportHtml } from './html';
import type { ReportDocument } from '../types';

const doc = (overrides: Partial<ReportDocument> = {}): ReportDocument => ({
  title: 'Security weekly report',
  provenance: ['branch main', 'build 01a1035a'],
  notes: ['Scores are judge-based; 1.0 means the skill was invoked.'],
  summaryTable: {
    columns: [
      { id: 's1', label: 'Suite 1' },
      { id: 's2', label: 'Suite 2', group: 'Grouped' },
      { id: 's3', label: 'Suite 3', group: 'Grouped' },
    ],
    rows: [
      {
        label: 'sonnet-4.6',
        subtitle: 'claude-sonnet-4-6',
        cells: [
          { text: '1.00', tone: 'ok' },
          { text: '—', tone: 'warn', title: 'no run' },
          { text: '0.33', tone: 'err' },
        ],
      },
    ],
  },
  sections: [
    {
      id: 'suite-1',
      title: 'Suite 1',
      subtitle: 'claude-sonnet-4-6',
      completion: '3/3',
      examples: [
        {
          id: 'ex-1',
          status: 'completed',
          score: '1.00',
          meta: ['rep 1'],
          question: 'Which alerts are related?',
          toolTrail: ['alerts'],
          answerMarkdown:
            '# Finding\n\n**Related**: `alert-1` and [alert-2](https://example.invalid/a)',
          steps: [
            { kind: 'skill', skills: ['alert-analysis'] },
            { kind: 'tool', toolId: 'alerts', toolParams: '{"query":"*"}' },
            { kind: 'think', text: 'correlate by entity' },
          ],
        },
        { id: 'ex-2', status: 'missing' },
      ],
    },
  ],
  ...overrides,
});

describe('esc', () => {
  it('escapes HTML special characters', () => {
    expect(esc(`<a href="x">&'`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#x27;');
  });
});

describe('mdToHtml', () => {
  it('renders headings, bold, code and safe links', () => {
    const html = mdToHtml(
      '# Title\n\nSome **bold** and `code` and [link](https://example.invalid/x)'
    );
    expect(html).toContain('<h4>Title</h4>');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<code>code</code>');
    expect(html).toContain('<a href="https://example.invalid/x">link</a>');
  });

  it('escapes HTML in untrusted model output', () => {
    const html = mdToHtml('<script>alert(1)</script>');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('rejects javascript: link URLs', () => {
    const html = mdToHtml('[x](javascript:alert(1))');
    // eslint-disable-next-line no-script-url -- intentionally untrusted input under test
    expect(html).not.toContain('javascript:');
    expect(html).toBe('<p>x)</p>');
  });

  it('renders pipe tables as table.md', () => {
    const html = mdToHtml('| a | b |\n|---|---|\n| 1 | 2 |');
    expect(html).toContain('<table class="md">');
    expect(html).toContain('<th>a</th>');
    expect(html).toContain('<td>1</td>');
  });

  it('keeps fenced code verbatim, including pipes', () => {
    const html = mdToHtml('```\nES|QL query | with pipes\n```');
    expect(html).toContain('<pre><code>ES|QL query | with pipes</code></pre>');
    expect(html).not.toContain('table');
  });

  it('renders nested and ordered lists', () => {
    const html = mdToHtml('- a\n  - b\n1. c');
    expect(html).toContain('<ul>');
    expect(html).toContain('<li>a<ul>');
    expect(html).toContain('<li>c</li>');
  });

  it('opens and closes a standalone unordered list', () => {
    expect(mdToHtml('- a\n- b')).toBe('<ul>\n<li>a</li>\n<li>b</li>\n</ul>');
  });

  it('opens and closes a standalone ordered list', () => {
    expect(mdToHtml('1. a\n2. b')).toBe('<ol>\n<li>a</li>\n<li>b</li>\n</ol>');
  });

  it('balances list tags when a nested list is followed by an ordered list', () => {
    expect(mdToHtml('- a\n  - b\n1. c')).toBe(
      '<ul>\n<li>a<ul>\n<li>b</li>\n</ul></li>\n</ul>\n<ol>\n<li>c</li>\n</ol>'
    );
  });

  it('opens a top-level list when the first bullet is indented', () => {
    expect(mdToHtml('intro\n  - a')).toBe('<p>intro</p>\n<ul>\n<li>a</li>\n</ul>');
  });

  it('renders blockquotes and horizontal rules', () => {
    const html = mdToHtml('> quoted\n\n---');
    expect(html).toContain('<blockquote>');
    expect(html).toContain('<hr>');
  });
});

describe('renderReportHtml', () => {
  it('renders a self-contained document with title, provenance and notes', () => {
    const html = renderReportHtml(doc());
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<title>Security weekly report</title>');
    expect(html).toContain('branch main');
    expect(html).toContain('Methodology');
    expect(html).not.toContain('</script>'); // style only, no scripts
  });

  it('renders grouped summary table headers with colspan', () => {
    const html = renderReportHtml(doc());
    expect(html).toContain('<th colspan="2">Grouped</th>');
    expect(html).toContain('<td class="cell err">0.33</td>');
    expect(html).toContain('title="no run"');
  });

  it('renders per-example cards with question, answer, tool trail and steps', () => {
    const html = renderReportHtml(doc());
    expect(html).toContain('class="prompt-id">ex-1<');
    expect(html).toContain('class="question"');
    expect(html).toContain('alert-analysis');
    expect(html).toContain('Tools called:');
    expect(html).toContain('Step trace — 3 steps');
    expect(html).toContain('class="status ok">completed<');
  });

  it('marks missing examples without a trace', () => {
    const html = renderReportHtml(doc());
    expect(html).toContain('class="status warn">missing<');
    expect(html).toContain('Trace unavailable.');
  });

  it('escapes untrusted example content', () => {
    const html = renderReportHtml(
      doc({
        sections: [
          {
            id: 's',
            title: 'S',
            examples: [
              {
                id: '"><img src=x>',
                status: 'completed',
                answerMarkdown: '<script>alert(1)</script>',
              },
            ],
          },
        ],
      })
    );
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img src=x>');
  });
});
