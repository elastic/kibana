/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FpTpWorld } from '../../world';
import { buildFpTpExampleWorld } from '..';
import { MIMICRAT_STAGE2_DOMAIN } from './chain';
import { MIMICRAT_EXAMPLES } from './examples';

interface EventSource {
  readonly event?: { readonly category?: readonly string[] };
  readonly process?: { readonly parent?: { readonly name?: string } };
  readonly destination?: { readonly domain?: string };
}

const CHAIN_PROCESSES = new Set(['powershell.exe', 'zbuild.exe']);
const USER_PARENTS = new Set(['explorer.exe']);
const MANAGEMENT_PARENTS = new Set(['ccmexec.exe', 'agentexecutor.exe']);
const VENDOR_DESTINATIONS = new Set(['manage.microsoft.com', 'sccm-dp-02.corp.local']);

const eventSources = (world: FpTpWorld): EventSource[] =>
  world.events.map(({ source }) => source as EventSource);

/** Reads each world check from the seeded evidence, independently of the declared labels. */
const observedChecks = (world: FpTpWorld): Record<string, string> => {
  const host = world.entities.find(
    ({ source }) => (source.entity as { type?: string }).type === 'host'
  );
  const subType = (host?.source.entity as { sub_type?: string } | undefined)?.sub_type;
  const entityRole = !host
    ? 'skipped'
    : subType === undefined
    ? 'neutral'
    : subType === 'employee_workstation'
    ? 'supports'
    : 'contradicts';

  const sources = eventSources(world);
  const parents = sources
    .map(({ process }) => process?.parent?.name?.toLowerCase())
    .filter((name): name is string => name !== undefined && !CHAIN_PROCESSES.has(name));
  const byUser = parents.some((name) => USER_PARENTS.has(name));
  const byManagement = parents.some((name) => MANAGEMENT_PARENTS.has(name));
  const processParent =
    sources.length === 0
      ? 'skipped'
      : byUser && byManagement
      ? 'conflicting'
      : byManagement
      ? 'contradicts'
      : byUser
      ? 'supports'
      : 'neutral';

  const domains = sources
    .filter(({ event }) => event?.category?.includes('network'))
    .map(({ destination }) => destination?.domain?.toLowerCase() ?? '');
  const vendor = domains.filter((domain) => VENDOR_DESTINATIONS.has(domain)).length;
  const networkDestination =
    sources.length === 0
      ? 'skipped'
      : domains.length === 0
      ? 'neutral'
      : vendor === domains.length
      ? 'contradicts'
      : vendor === 0
      ? 'supports'
      : 'conflicting';

  return { entityRole, processParent, networkDestination };
};

const rawEventText = (id: string): string =>
  JSON.stringify(buildFpTpExampleWorld(id, 'run1').events.map(({ source }) => source));

describe('mimicrat-clickfix examples', () => {
  it.each(MIMICRAT_EXAMPLES.map(({ id, checks }) => [id, checks]))(
    'returns the declared checks for %s from its seeded world',
    (id, checks) => {
      expect(observedChecks(buildFpTpExampleWorld(id as string, 'run1'))).toEqual(checks);
    }
  );

  it.each(['mimicrat-clickfix.drop-one-redundant', 'mimicrat-clickfix.drop-one-sole-evidence'])(
    'returns %s with one raw event fewer than tp',
    (id) => {
      expect(buildFpTpExampleWorld(id, 'run1').events).toHaveLength(
        buildFpTpExampleWorld('mimicrat-clickfix.tp', 'run1').events.length - 1
      );
    }
  );

  it.each([
    ['mimicrat-clickfix.fp-benign-mimic', MIMICRAT_STAGE2_DOMAIN],
    ['mimicrat-clickfix.fp-benign-mimic', 'amsiInitFailed'],
    ['mimicrat-clickfix.fp-benign-mimic', 'ProgramData'],
    ['mimicrat-clickfix.fp-entities-missing', MIMICRAT_STAGE2_DOMAIN],
    ['mimicrat-clickfix.fp-network-only', MIMICRAT_STAGE2_DOMAIN],
    ['mimicrat-clickfix.fp-network-only', 'amsiInitFailed'],
    ['mimicrat-clickfix.fp-network-only', 'ProgramData'],
    ['mimicrat-clickfix.domain-swap', MIMICRAT_STAGE2_DOMAIN],
  ])('returns %s raw events without %s', (id, needle) => {
    expect(rawEventText(id).toLowerCase()).not.toContain(needle.toLowerCase());
  });
});
