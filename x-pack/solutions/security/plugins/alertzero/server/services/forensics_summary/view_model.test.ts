/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fixtureInputs } from './__fixtures__/forensics_summary_inputs';
import { MAX_IOCS_PER_KIND, MAX_TIMELINE_EVENTS } from './constants';
import {
  buildForensicsSummaryViewModel,
  countOpenDecisions,
  forensicsSummaryViewModelSchema,
  toPlainAttackTitle,
} from './view_model';

describe('buildForensicsSummaryViewModel', () => {
  it('builds a view model the renderer contract accepts', () => {
    const viewModel = buildForensicsSummaryViewModel(fixtureInputs);
    expect(forensicsSummaryViewModelSchema.parse(viewModel)).toEqual(viewModel);
  });

  it('titles the card with the host and keeps the attack under it', () => {
    const viewModel = buildForensicsSummaryViewModel(fixtureInputs);
    expect(viewModel.title).toBe('win-fin-07');
    expect(viewModel.attackTitle).toBe('Ransomware on {{ host.name win-fin-07 }}');
  });

  it('falls back to the attack title, then a generic title, when no host is known', () => {
    const noHost = { ...fixtureInputs, timeline: undefined, iocs: undefined };
    expect(buildForensicsSummaryViewModel(noHost).title).toBe(fixtureInputs.attack?.title);
    expect(buildForensicsSummaryViewModel({ ...noHost, attack: undefined }).title).toBe(
      'Endpoint analysis'
    );
  });

  it('counts proposals by decision state and lists open ones first', () => {
    const viewModel = buildForensicsSummaryViewModel({
      ...fixtureInputs,
      proposals: [
        { title: 'done', status: 'succeeded' },
        { title: 'open', status: 'pending', expiresAt: '2026-11-03T00:00:00Z' },
        { title: 'running', status: 'executing' },
        { title: 'replaced', status: 'superseded' },
      ],
    });
    expect(viewModel.decisions).toEqual({ awaiting: 1, running: 1, done: 1, failed: 0, closed: 1 });
    expect(viewModel.proposals.map(({ title }) => title)).toEqual([
      'open',
      'running',
      'done',
      'replaced',
    ]);
    expect(viewModel.proposals[0].expiresAt).toBe('2026-11-03T00:00:00Z');
    expect(countOpenDecisions(viewModel)).toBe(2);
  });

  it('groups proposals by category, urgent containment first, keeping open ones first in each', () => {
    const viewModel = buildForensicsSummaryViewModel({
      ...fixtureInputs,
      proposals: [
        { title: 'configure', status: 'pending', category: 'configure' },
        { title: 'investigate', status: 'pending', category: 'investigate' },
        { title: 'respond done', status: 'succeeded', category: 'respond' },
        { title: 'respond open', status: 'pending', category: 'respond' },
        { title: 'no category', status: 'pending' },
      ],
    });
    expect(viewModel.proposals.map(({ title, category }) => [title, category])).toEqual([
      ['respond open', 'respond'],
      ['respond done', 'respond'],
      ['investigate', 'investigate'],
      ['configure', 'configure'],
      ['no category', 'other'],
    ]);
  });

  it('shows the comment while a proposal is open, and who decided once it is settled', () => {
    const viewModel = buildForensicsSummaryViewModel({
      ...fixtureInputs,
      proposals: [
        {
          title: 'open',
          status: 'pending',
          comment: '## Why\n**Isolate** the host: <b>it</b> runs `ransom.exe`.',
          decidedBy: { username: 'nobody' },
          actionInput: { endpoint_ids: ['agent-1', 'agent-2', 'agent-3'] },
        },
        {
          title: 'dismissed',
          status: 'no_action',
          decision: 'dismissed',
          comment: 'hidden once settled',
          decidedBy: { username: 'analyst1' },
          actionInput: { endpoint_ids: [] },
        },
      ],
    });
    const [open, dismissed] = viewModel.proposals;
    expect(open).toMatchObject({
      comment: 'Why Isolate the host: it runs ransom.exe.',
      decidedBy: undefined,
      dismissed: false,
      agent: { id: 'agent-1', more: 2 },
    });
    expect(dismissed).toMatchObject({
      comment: undefined,
      decidedBy: 'analyst1',
      dismissed: true,
      agent: undefined,
    });
  });

  it('cuts a long comment to one line', () => {
    const { proposals } = buildForensicsSummaryViewModel({
      ...fixtureInputs,
      proposals: [{ title: 'long', status: 'pending', comment: 'word '.repeat(100) }],
    });
    expect(proposals[0].comment).toHaveLength(200);
    expect(proposals[0].comment?.endsWith('…')).toBe(true);
  });

  it('only shows an expiry while a proposal awaits a decision', () => {
    const viewModel = buildForensicsSummaryViewModel({
      ...fixtureInputs,
      proposals: [{ title: 'old', status: 'expired', expiresAt: '2026-11-01T00:00:00Z' }],
    });
    expect(viewModel.proposals[0].expiresAt).toBeUndefined();
  });

  it('takes the peak risk from the highest-scoring alert and ranks the bars by it', () => {
    const viewModel = buildForensicsSummaryViewModel(fixtureInputs);
    expect(viewModel.peakRisk).toEqual({ score: 99, severity: 'critical' });
    expect(viewModel.alerts.shown.map(({ riskScore }) => riskScore)).toEqual([99, 95, 73]);
    expect(viewModel.alerts.total).toBe(3);
    expect(viewModel.host).toBe('win-fin-07');
  });

  it('opens the alerts while a close of the attack awaits a decision', () => {
    expect(buildForensicsSummaryViewModel(fixtureInputs).alerts.closePending).toBe(true);
    const decided = fixtureInputs.proposals.map((proposal) => ({
      ...proposal,
      status: 'succeeded' as const,
    }));
    expect(
      buildForensicsSummaryViewModel({ ...fixtureInputs, proposals: decided }).alerts.closePending
    ).toBe(false);
  });

  it('lights the attack tactics in kill-chain order, and shows no chain without tactics', () => {
    const { killChain } = buildForensicsSummaryViewModel(fixtureInputs);
    expect(killChain).toHaveLength(14);
    expect(killChain.filter(({ detected }) => detected).map(({ name }) => name)).toEqual([
      'Initial Access',
      'Execution',
      'Credential Access',
      'Impact',
    ]);
    const noTactics = { ...fixtureInputs, attack: { title: 'x', tactics: [], alertIds: [] } };
    expect(buildForensicsSummaryViewModel(noTactics).killChain).toEqual([]);
  });

  it('caps the timeline and each indicator kind while keeping their totals', () => {
    const events = Array.from({ length: MAX_TIMELINE_EVENTS + 3 }, (_, index) => ({
      timestamp: `t${index}`,
      host: 'h',
      description: `event ${index}`,
    }));
    const viewModel = buildForensicsSummaryViewModel({ ...fixtureInputs, timeline: { events } });
    expect(viewModel.timeline.events).toHaveLength(MAX_TIMELINE_EVENTS);
    expect(viewModel.timeline.total).toBe(MAX_TIMELINE_EVENTS + 3);
    const hashes = viewModel.indicators.find(({ label }) => label === 'File hashes');
    expect(hashes?.count).toBe(4);
    expect(hashes?.values).toHaveLength(MAX_IOCS_PER_KIND);
  });

  it('reads an unknown verdict or severity as unclear and low', () => {
    const viewModel = buildForensicsSummaryViewModel({
      ...fixtureInputs,
      verdict: 'maybe',
      alerts: [{ ruleName: 'r', severity: 'informational', riskScore: 10 }],
    });
    expect(viewModel.verdict).toBe('unclear');
    expect(viewModel.peakRisk).toEqual({ score: 10, severity: 'low' });
  });
});

describe('toPlainAttackTitle', () => {
  it('shows field tokens as their value and restores anonymized values', () => {
    const uuid = '0b2e4c64-1f8b-4c43-9a8e-6f7d2a1b9c0d';
    expect(
      toPlainAttackTitle(`Ransomware on {{ host.name ${uuid} }}`, { [uuid]: 'win-fin-07' })
    ).toBe('Ransomware on win-fin-07');
  });

  it('keeps a malformed token as text', () => {
    expect(toPlainAttackTitle('Odd {{ title')).toBe('Odd {{ title');
  });
});
