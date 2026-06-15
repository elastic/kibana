/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type PhaseBand = 'planning' | 'delivery' | 'feedback';

export type PhaseGate = 'pass' | 'warn' | 'fail' | 'ns';

export interface PhaseDefinition {
  readonly key: string;
  readonly label: string;
  readonly title: string;
  readonly subtitle: string;
  readonly band: PhaseBand;
  readonly icon: string;
}

export const PHASE_DEFINITIONS: readonly PhaseDefinition[] = [
  {
    key: 'p1_prd',
    label: 'P1',
    title: 'PRD ready',
    subtitle: 'Approved + linked',
    band: 'planning',
    icon: 'document',
  },
  {
    key: 'p2_arch',
    label: 'P2',
    title: 'Arch approved',
    subtitle: 'Proposal linked',
    band: 'planning',
    icon: 'cluster',
  },
  {
    key: 'p3_ai_coverage',
    label: 'P3',
    title: 'AI coverage',
    subtitle: 'Scope → epic fit',
    band: 'planning',
    icon: 'machineLearningApp',
  },
  {
    key: 'p4_tickets',
    label: 'P4',
    title: 'Tickets',
    subtitle: 'AI-gen · eng-val',
    band: 'delivery',
    icon: 'list',
  },
  {
    key: 'p5_prs',
    label: 'P5',
    title: 'PRs merged',
    subtitle: '1–2 per ticket',
    band: 'delivery',
    icon: 'merge',
  },
  {
    key: 'p6_defects',
    label: 'P6',
    title: 'Bugs & SDHs',
    subtitle: 'With PR links',
    band: 'feedback',
    icon: 'bug',
  },
  {
    key: 'p7_production',
    label: 'P7',
    title: 'In production',
    subtitle: '% scope shipped',
    band: 'feedback',
    icon: 'launch',
  },
  {
    key: 'p8_telemetry',
    label: 'P8',
    title: 'Telemetry',
    subtitle: 'Customer usage',
    band: 'feedback',
    icon: 'timeline',
  },
];

export const BAND_COLORS: Record<
  PhaseBand,
  { border: string; background: string; headerBackground: string }
> = {
  planning: {
    border: '#AFA9EC',
    background: '#FAFAFF',
    headerBackground: '#F8F7FF',
  },
  delivery: {
    border: '#5DCAA5',
    background: '#F9FEFA',
    headerBackground: '#F3FAF7',
  },
  feedback: {
    border: '#EF9F27',
    background: '#FFFCF6',
    headerBackground: '#FFFAF4',
  },
};
