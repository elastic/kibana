/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type RoadmapMaturity = 'developing' | 'designing' | 'researching' | 'prototyping';

export interface CapabilityDefinition {
  readonly key: string;
  readonly label: string;
}

export interface SocFunctionDefinition {
  readonly key: string;
  readonly label: string;
  readonly subtitle: string;
  readonly items: readonly string[];
}

export interface RoadmapMaturityDefinition {
  readonly key: RoadmapMaturity;
  readonly label: string;
  readonly timing: string;
  readonly description: string;
}

/** FY27 product hierarchy — 1 product, 4 capabilities (Board Update Security deck). */
export const SECURITY_CAPABILITIES: readonly CapabilityDefinition[] = [
  { key: 'siem', label: 'SIEM & Security Analytics' },
  { key: 'xdr', label: 'Endpoint / XDR' },
  { key: 'posture', label: 'Posture, Risk & Compliance' },
  { key: 'agentic', label: 'Agentic SecOps' },
];

/** SOC functions grouped by analyst workflow (Board Update Security deck). */
export const SOC_FUNCTIONS: readonly SocFunctionDefinition[] = [
  {
    key: 'prevent',
    label: 'Prevent',
    subtitle: 'Block before it lands',
    items: ['Security posture & compliance', 'Endpoint & cloud prevention'],
  },
  {
    key: 'detect',
    label: 'Detect',
    subtitle: 'See threats sooner',
    items: ['Data integration', 'Asset inventory', 'Detection engineering'],
  },
  {
    key: 'respond',
    label: 'Respond',
    subtitle: 'Act on what is found',
    items: [
      'Alert triage',
      'Investigation',
      'Forensics',
      'Case management',
      'Response & automation',
    ],
  },
  {
    key: 'hunt',
    label: 'Hunt',
    subtitle: 'Anticipate the unknown',
    items: ['Threat hunting', 'Insider threat'],
  },
];

/** Roadmap maturity labels on GitHub epics (Board Update Security deck). */
export const ROADMAP_MATURITY_LABELS: readonly RoadmapMaturityDefinition[] = [
  {
    key: 'developing',
    label: 'Developing',
    timing: 'Now',
    description: 'Committed delivery — actively built against a specific release.',
  },
  {
    key: 'designing',
    label: 'Designing',
    timing: 'Next',
    description: 'Committed direction — scope and shape being finalized.',
  },
  {
    key: 'researching',
    label: 'Researching',
    timing: 'Later',
    description: 'Exploring whether the work is worth doing.',
  },
  {
    key: 'prototyping',
    label: 'Prototyping',
    timing: 'TBD',
    description: 'Working demo — disposition may be product, MCP app, OSS skill, or learning.',
  },
];

export const MATURITY_COLORS: Record<RoadmapMaturity, string> = {
  developing: '#0F766E',
  designing: '#534AB7',
  researching: '#854F0B',
  prototyping: '#993C1D',
};

export const SOC_FUNCTION_COLORS: Record<string, string> = {
  prevent: '#534AB7',
  detect: '#0F766E',
  respond: '#C65308',
  hunt: '#993C1D',
};
