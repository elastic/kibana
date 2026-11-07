/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { EvidenceHuntArtifact, HuntArtifact } from './hunt_artifacts';
import { HuntResultCanvas } from './hunt_result_canvas';

const evidenceArtifact = (rows: Array<Record<string, unknown>>): EvidenceHuntArtifact => ({
  id: 'evidence-1',
  type: 'evidence',
  toolId: 'platform.core.execute_esql',
  query: 'FROM logs-*',
  rowCount: rows.length,
  columns: [...new Set(rows.flatMap((row) => Object.keys(row)))],
  rows,
});

const structuredArtifacts: HuntArtifact[] = [
  evidenceArtifact([
    {
      '@timestamp': '2026-07-17T21:00:00.000Z',
      'source.ip': '10.0.1.45',
      'process.name': 'psexec.exe',
      'destination.ip': '10.0.0.1',
      event_count: 12,
      'kibana.alert.severity': 'high',
    },
    {
      '@timestamp': '2026-07-17T21:05:00.000Z',
      'source.ip': '10.0.1.46',
      'process.name': 'net.exe',
      'destination.ip': '10.0.0.2',
      event_count: 7,
      'kibana.alert.severity': 'medium',
    },
  ]),
];

const renderCanvas = (props: Partial<React.ComponentProps<typeof HuntResultCanvas>> = {}) =>
  render(
    <HuntResultCanvas
      prompt="Hunt for lateral movement"
      content={props.content ?? ''}
      artifacts={props.artifacts ?? structuredArtifacts}
      activities={props.activities ?? []}
      status={props.status ?? 'completed'}
      startedAt={props.startedAt ?? Date.now()}
      onInvestigateEntity={props.onInvestigateEntity ?? jest.fn()}
      onOpenInAgentBuilder={props.onOpenInAgentBuilder ?? jest.fn()}
      followUps={props.followUps}
      onFollowUp={props.onFollowUp}
    />
  );

describe('HuntResultCanvas layout', () => {
  it('groups explore + next steps + follow-ups into a single "What\'s next" area', () => {
    const onFollowUp = jest.fn();
    renderCanvas({ followUps: ['Which hosts are affected?'], onFollowUp });

    const whatsNext = screen.getByTestId('entityIntelligenceHuntWhatsNext');
    expect(within(whatsNext).getByText('Explore the evidence')).toBeInTheDocument();
    expect(within(whatsNext).getByText('Recommended next steps')).toBeInTheDocument();
    expect(within(whatsNext).getByText('Ask a follow-up')).toBeInTheDocument();
  });

  it('renders follow-up pills inside the "What\'s next" area and invokes onFollowUp', () => {
    const onFollowUp = jest.fn();
    renderCanvas({ followUps: ['Which hosts are affected?'], onFollowUp });

    const whatsNext = screen.getByTestId('entityIntelligenceHuntWhatsNext');
    const pill = within(whatsNext).getByTestId('entityIntelligenceHuntFollowUp');
    fireEvent.click(pill);
    expect(onFollowUp).toHaveBeenCalledWith('Which hosts are affected?');
  });

  it('does not render the follow-up subsection when there are no suggestions', () => {
    renderCanvas({ followUps: [], onFollowUp: jest.fn() });
    expect(screen.queryByText('Ask a follow-up')).not.toBeInTheDocument();
    expect(screen.queryByTestId('entityIntelligenceHuntFollowUp')).not.toBeInTheDocument();
  });

  it('keeps the next-steps actions available', () => {
    const onOpenInAgentBuilder = jest.fn();
    renderCanvas({ onOpenInAgentBuilder });
    const whatsNext = screen.getByTestId('entityIntelligenceHuntWhatsNext');
    fireEvent.click(within(whatsNext).getByText('Open full hunt'));
    expect(onOpenInAgentBuilder).toHaveBeenCalled();
  });

  it('does not render the "What\'s next" area while the hunt is still running', () => {
    renderCanvas({ status: 'running' });
    expect(screen.queryByTestId('entityIntelligenceHuntWhatsNext')).not.toBeInTheDocument();
  });

  it('embeds the evidence views inline (expand in place) instead of launcher cards', () => {
    renderCanvas();
    // Activity path + timeline are supported by the fixture; they render as
    // inline accordions within "Explore the evidence".
    expect(screen.getByTestId('entityIntelligenceHuntEvidenceViews')).toBeInTheDocument();
    expect(
      screen.getByTestId('entityIntelligenceHuntEvidenceView-activity_path')
    ).toBeInTheDocument();
    expect(screen.getByTestId('entityIntelligenceHuntEvidenceView-timeline')).toBeInTheDocument();
  });

  it('renders grounded AI-directed artifacts inline from a fenced narrative block (reopen path)', () => {
    // The narrative carries a directive; grounding resolves it against the real
    // evidence rows. This is exactly the reopen path: content + artifacts only,
    // no LLM call.
    const content = [
      'psexec.exe was used for lateral movement.',
      '```hunt-artifacts',
      '[{"type":"sankey","title":"Source to destination"},{"type":"mitre_strip"}]',
      '```',
    ].join('\n');
    renderCanvas({ content });

    const attachments = screen.getByTestId('entityIntelligenceHuntArtifacts');
    expect(attachments).toBeInTheDocument();
    // sankey grounds from the real source.ip -> destination.ip rows in the fixture.
    expect(
      within(attachments).getByTestId('entityIntelligenceHuntArtifact-sankey')
    ).toBeInTheDocument();
    // The fenced directive block is stripped from the visible narrative.
    expect(screen.queryByText(/hunt-artifacts/)).not.toBeInTheDocument();
  });

  it('drops ungroundable directives (no fabrication)', () => {
    const content = [
      'Answer.',
      '```hunt-artifacts',
      '[{"type":"entity_card","entity":"does-not-exist"}]',
      '```',
    ].join('\n');
    renderCanvas({ content });
    expect(screen.queryByTestId('entityIntelligenceHuntArtifacts')).not.toBeInTheDocument();
  });
});
