/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Markdown rendering for single-PR and team reports.
 * Section order is fixed by references/report-template.md.
 */
import { LEGEND, VERDICTS } from './matcher.mjs';

const code = (s) => `\`${s}\``;
const br = '<br>';
const escapePipes = (s) => String(s).replace(/\|/g, '\\|');

const VERDICT_ORDER = [VERDICTS.NONE, VERDICTS.NOT_UPDATED, VERDICTS.UPDATED];

const MAX_DIRECT_SHOWN = 4;

// Paths are shortened for display only; the JSON output always carries full paths.
const MIN_ROOT_SEGMENTS = 2;

const dirname = (p) => (p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '');
const basename = (p) => p.slice(p.lastIndexOf('/') + 1);

/**
 * Longest common directory (with trailing `/`) of all production and linked test paths,
 * or '' when it is too short to be worth stripping.
 */
export const commonRoot = (rows) => {
  const paths = rows.flatMap((r) => [r.file, ...r.links.map((l) => l.path)]);
  if (paths.length === 0) return '';
  let segments = dirname(paths[0]).split('/');
  for (const p of paths.slice(1)) {
    const other = dirname(p).split('/');
    let i = 0;
    while (i < segments.length && i < other.length && segments[i] === other[i]) i += 1;
    segments = segments.slice(0, i);
    if (segments.length < MIN_ROOT_SEGMENTS) return '';
  }
  return `${segments.join('/')}/`;
};

const relTo = (root, p) => (root && p.startsWith(root) ? p.slice(root.length) : p);

const pathNote = (root) =>
  root
    ? `- Paths below are relative to ${code(root)}; paths outside it are shown in full. ` +
      'Tests colocated with a production file are shown by file name only.'
    : null;

// Collapsible block usable inside a table cell (single line, items separated by <br>).
const inlineDetails = (summary, items) =>
  `<details><summary>${summary}</summary>${items.join(br)}</details>`;

// Collapsible block between paragraphs; the blank lines let markdown render inside it.
// The region comments are invisible when rendered but let the raw file fold in the editor.
const blockDetails = (summary, lines) =>
  lines.length === 0
    ? []
    : [
        '',
        `<!-- #region ${summary} -->`,
        '<details>',
        `<summary>${summary}</summary>`,
        '',
        ...lines,
        '',
        '</details>',
        '<!-- #endregion -->',
      ];

const prFlag = (l) => (l.inPr ? ` _(in this PR: ${l.prStatus})_` : '');

// PR-touched links first, then same-name colocated, then imports, then same-directory-only,
// then by path.
const isSameDirOnly = (l) => l.types.length === 1 && l.via.includes('same directory');
const rank = (l) => {
  if (l.via.includes('same name')) return 0;
  if (isSameDirOnly(l)) return 2;
  return 1;
};
const byPriority = (a, b) =>
  Number(b.inPr) - Number(a.inPr) || rank(a) - rank(b) || a.path.localeCompare(b.path);

const formatLinks = (row, root, { featureSpecs = true } = {}) => {
  if (row.links.length === 0) return '—';
  const fileDir = dirname(row.file);
  const showDirect = (p) => (dirname(p) === fileDir ? basename(p) : relTo(root, p));
  const lines = [];
  const featureLinks = row.links.filter((l) => l.types.includes('feature-path'));
  const directLinks = row.links.filter((l) => !l.types.includes('feature-path')).sort(byPriority);

  // The first few direct links are visible; the rest are kept but collapsed.
  const directLine = (l) => {
    const via = l.via.length ? ` (${l.via.join(', ')})` : '';
    return `${l.types.join('+')}${via}: ${code(showDirect(l.path))}${prFlag(l)}`;
  };
  const visible = directLinks.slice(0, MAX_DIRECT_SHOWN);
  const collapsed = directLinks.slice(MAX_DIRECT_SHOWN);
  lines.push(...visible.map(directLine));
  if (collapsed.length > 0) {
    const touched = collapsed.filter((l) => l.inPr).length;
    const note = touched ? `, ${touched} touched by this PR` : '';
    lines.push(
      inlineDetails(`+${collapsed.length} more import/colocated tests${note}`, [
        ...collapsed.map(directLine),
      ])
    );
  }

  // Each feature-path group is collapsed; the summary carries the counts and PR-touched flag.
  for (const g of row.featureSummary) {
    const anchor = `${g.anchorDir}/`;
    const specs = featureLinks.filter((l) => l.path.startsWith(anchor));
    const touched = specs.filter((l) => l.inPr).length;
    const count = g.total > g.shown ? `${g.total} specs, showing ${g.shown}` : `${g.total} spec(s)`;
    const note = touched ? `; ${touched} touched by this PR` : '';
    const summary = `feature-path (${code(g.tokens.join('+'))} → ${code(
      relTo(root, g.anchorDir)
    )}, ${count}${note})`;
    // Spec lists are omitted for low-attention rows in compact mode; the JSON has them all.
    lines.push(
      featureSpecs
        ? inlineDetails(
            summary,
            specs.map((l) => `&nbsp;&nbsp;${code(l.path.slice(anchor.length))}${prFlag(l)}`)
          )
        : summary
    );
  }
  return lines.map(escapePipes).join(br);
};

const formatUpdated = (row) => {
  if (row.links.length === 0) return '—';
  if (row.linkedTestsUpdatedInPr.length === 0) return 'No';
  return `Yes (${row.linkedTestsUpdatedInPr.length} of ${row.links.length})`;
};

const formatChangeType = (row) => {
  const extra = row.changeType.tags.filter((t) => t !== row.changeType.primary);
  const tags = extra.length ? ` _(also: ${extra.join(', ')})_` : '';
  return `**${row.changeType.primary}**${tags}${br}${escapePipes(row.changeType.reason)}`;
};

const summaryTable = (summary) => [
  '| Verdict | Files |',
  '|---|---:|',
  ...VERDICT_ORDER.map((v) => `| ${v} | ${summary[v] ?? 0} |`),
];

// Marker used by the CI comment workflow to find and update its own sticky comment.
export const COMMENT_MARKER = '<!-- security-pr-test-impact -->';

const rowsTable = (rows, { withPr = false, root = '', featureSpecs = true } = {}) => {
  const head = withPr
    ? '| PR | Production file | Change type | Verdict | Linked tests (link type) | Linked tests updated by this PR |'
    : '| Production file | Change type | Verdict | Linked tests (link type) | Linked tests updated by this PR |';
  const sep = withPr ? '|---|---|---|---|---|---|' : '|---|---|---|---|---|';
  const lines = [head, sep];
  for (const r of rows) {
    const file = `${code(relTo(root, r.file))}${r.status !== 'modified' ? ` _(${r.status})_` : ''}`;
    const cells = [
      file,
      formatChangeType(r),
      `**${r.verdict}**`,
      formatLinks(r, root, { featureSpecs }),
      formatUpdated(r),
    ];
    if (withPr) cells.unshift(`[#${r.pr.number}](${r.pr.url})`);
    lines.push(`| ${cells.join(' | ')} |`);
  }
  return lines;
};

const checksSection = (uncoveredRows, { withPr = false, root = '' } = {}) => {
  if (uncoveredRows.length === 0) return [];
  const lines = ['## Checks', ''];
  lines.push(
    '_At most five checks for the whole report, derived from the changed behavior in the diff of the NO EXISTING TEST rows (new route, new control, new privilege). Not a manual test plan._',
    ''
  );
  lines.push(
    '<!-- agent: replace this list with ≤5 checks taken from the diff; delete rows you do not use -->'
  );
  for (const r of uncoveredRows.slice(0, 5)) {
    const prefix = withPr ? `[#${r.pr.number}](${r.pr.url}) ` : '';
    lines.push(
      `- ${prefix}${code(relTo(root, r.file))} — ${r.changeType.primary} (${
        r.changeType.reason
      }): _check pending_`
    );
  }
  lines.push('');
  return lines;
};

const testFilesList = (testFiles) =>
  testFiles.length === 0
    ? ['_No test files in the diff._']
    : testFiles.map((t) => `- ${code(t.file)} (${t.framework}, ${t.status})`);

const sortRows = (rows) =>
  [...rows].sort((a, b) => {
    const d = VERDICT_ORDER.indexOf(a.verdict) - VERDICT_ORDER.indexOf(b.verdict);
    return d !== 0 ? d : a.file.localeCompare(b.file);
  });

/**
 * Production-files section. In compact mode the rows that need a human (NO EXISTING TEST,
 * NOT UPDATED) stay visible and the UPDATED rows collapse into one block, so the whole report
 * fits a GitHub comment.
 */
const productionSection = (rows, { withPr = false, root = '', compact = false, title } = {}) => {
  const sorted = sortRows(rows);
  if (!compact) return [`## ${title}`, '', ...rowsTable(sorted, { withPr, root }), ''];

  const attention = sorted.filter((r) => r.verdict !== VERDICTS.UPDATED);
  const updated = sorted.filter((r) => r.verdict === VERDICTS.UPDATED);
  const out = [`## ${title}`, ''];
  if (attention.length > 0) {
    out.push(...rowsTable(attention, { withPr, root }), '');
  } else {
    out.push(
      '_No rows need attention: every production file has a linked test touched by this PR._',
      ''
    );
  }
  if (updated.length > 0) {
    out.push(
      ...blockDetails(
        `${updated.length} file(s) — ${VERDICTS.UPDATED}`,
        rowsTable(updated, { withPr, root, featureSpecs: false })
      ),
      ''
    );
  }
  return out;
};

const compactChecksNote = (uncoveredRows) =>
  uncoveredRows.length === 0
    ? []
    : [
        '## Checks',
        '',
        `_${
          uncoveredRows.length
        } file(s) have no existing test. The ≤5 checks derived from their diff are produced by the ${code(
          'security-pr-test-impact'
        )} agent skill; run it locally to get them._`,
        '',
      ];

/**
 * @param {{ pr: { number, title, url, state, mergedAt }, analysis: ReturnType<analyzePr>, compact?: boolean }} input
 *   compact: fit a GitHub comment — boundary prefixes omitted, UPDATED rows collapsed, Checks
 *   replaced by a pointer to the agent skill, sticky-comment marker added.
 */
export const renderPrReport = ({ pr, analysis, compact = false }) => {
  const { counts, owners, searchBoundary, summary, rows, testFiles, legend, existingTestsSource } =
    analysis;
  const out = [];
  if (compact) out.push(COMMENT_MARKER);
  out.push(`# PR test impact — [#${pr.number}](${pr.url}) ${escapePipes(pr.title)}`, '');

  out.push('## Scope', '');
  out.push(
    `- PR: [#${pr.number}](${pr.url}) (${pr.state}${pr.mergedAt ? `, merged ${pr.mergedAt}` : ''})`
  );
  out.push(
    `- Owning team(s): ${
      owners.length ? owners.map(code).join(', ') : '_none resolved from CODEOWNERS_'
    }`
  );
  out.push(
    `- Files in diff: ${counts.productionFiles} production, ${counts.testFiles} test, ${counts.ignoredFiles} ignored (docs/images/lockfiles/CI)`
  );
  const withTests = searchBoundary.filter((b) => b.candidateTests > 0);
  const withoutTests = searchBoundary.length - withTests.length;
  out.push(`- Existing tests read from: ${code(existingTestsSource)}`);
  out.push(
    `- Search boundary: CODEOWNERS prefixes of the owning team(s) + conventional Security test roots (${
      counts.candidateTestFilesScanned
    } candidate test files scanned${
      withoutTests ? `; ${withoutTests} owned prefixes without test files omitted` : ''
    })${compact ? '.' : '. Prefixes are listed below.'}`
  );
  const root = commonRoot(rows);
  const note = pathNote(root);
  if (note) out.push(note);
  if (!compact) {
    out.push(
      ...blockDetails(
        `Search boundary prefixes (${withTests.length} with candidate tests)`,
        withTests.map((b) => `- ${code(b.prefix)} (${b.candidateTests})`)
      )
    );
  }
  if (counts.productionFiles === 0) {
    out.push('', '**No production files in this diff.** Test files changed:', '');
    out.push(...testFilesList(testFiles));
  }
  out.push('');

  out.push('## Legend', '', legend, '');

  out.push('## Summary', '', ...summaryTable(summary), '');

  if (rows.length > 0) {
    out.push(...productionSection(rows, { root, compact, title: 'Production files' }));
    const uncovered = rows.filter((r) => r.verdict === VERDICTS.NONE);
    out.push(...(compact ? compactChecksNote(uncovered) : checksSection(uncovered, { root })));
  }

  return `${out.join('\n').trimEnd()}\n`;
};

/**
 * @param {{ team: string, days: number, since: string, prs: Array<{pr, analysis}>, totalMatching: number, cap: number, hitListLimit: boolean }} input
 */
export const renderTeamReport = ({
  team,
  days,
  since,
  prs,
  totalMatching,
  cap,
  hitListLimit,
  prefixes,
  unreadable = [],
  compact = false,
}) => {
  const out = [];
  if (compact) out.push(COMMENT_MARKER);
  out.push(`# PR test impact — ${team} — merged PRs, last ${days} days (since ${since})`, '');

  const allRows = prs.flatMap(({ pr, analysis }) => analysis.rows.map((r) => ({ ...r, pr })));
  const summary = {};
  for (const v of VERDICT_ORDER) summary[v] = allRows.filter((r) => r.verdict === v).length;
  const owners = new Set(prs.flatMap(({ analysis }) => analysis.owners));
  const boundary = new Set(
    prs.flatMap(({ analysis }) => analysis.searchBoundary.map((b) => b.prefix))
  );
  const prodCount = prs.reduce((n, { analysis }) => n + analysis.counts.productionFiles, 0);
  const testCount = prs.reduce((n, { analysis }) => n + analysis.counts.testFiles, 0);

  out.push('## Scope', '');
  out.push(`- Team: ${code(team)}; CODEOWNERS prefixes used to select PRs: ${prefixes.length}`);
  out.push(
    `- Merged PRs touching those prefixes since ${since}: ${totalMatching}; analyzed: ${prs.length}`
  );
  if (totalMatching > cap) {
    out.push(
      `- **Cap hit:** only the ${cap} most recently merged PRs were analyzed (${
        totalMatching - cap
      } skipped).`
    );
  }
  if (hitListLimit) {
    out.push(
      '- **Warning:** the merged-PR listing hit its page limit; the window may be incomplete.'
    );
  }
  if (unreadable.length > 0) {
    out.push(
      `- **Could not be read (no file list guessed):** ${unreadable
        .map((u) => `[#${u.number}](${u.url})`)
        .join(', ')}`
    );
  }
  out.push(
    `- Owning team(s) across analyzed PRs: ${[...owners].sort().map(code).join(', ') || '_none_'}`
  );
  if (prs.length > 0)
    out.push(`- Existing tests read from: ${code(prs[0].analysis.existingTestsSource)}`);
  out.push(`- Files in diffs: ${prodCount} production, ${testCount} test`);
  out.push(
    `- Search boundary: ${boundary.size} CODEOWNERS prefixes + conventional Security test roots`
  );
  const root = commonRoot(allRows);
  const note = pathNote(root);
  if (note) out.push(note);
  out.push('', 'PRs analyzed:', '');
  for (const { pr, analysis } of prs) {
    const c = analysis.counts;
    out.push(
      `- [#${pr.number}](${pr.url}) ${escapePipes(pr.title)} — ${c.productionFiles} production / ${
        c.testFiles
      } test files${c.productionFiles === 0 ? ' _(test-only)_' : ''}`
    );
  }
  out.push('');

  out.push('## Legend', '', LEGEND, '');
  out.push('## Summary', '', ...summaryTable(summary), '');

  if (allRows.length > 0) {
    out.push(
      ...productionSection(allRows, {
        withPr: true,
        root,
        compact,
        title: 'Production files (uncovered first)',
      })
    );
    const uncovered = allRows.filter((r) => r.verdict === VERDICTS.NONE);
    out.push(
      ...(compact ? compactChecksNote(uncovered) : checksSection(uncovered, { withPr: true, root }))
    );
  }

  return `${out.join('\n').trimEnd()}\n`;
};
