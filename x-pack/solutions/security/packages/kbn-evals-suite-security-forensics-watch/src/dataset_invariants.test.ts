/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { forensicDataset } from './dataset';
import { EVENTS, FORENSIC_HOSTS } from './data_generators/forensic_data';

/**
 * Dataset ↔ fixture invariants for the Forensics Watch suite.
 *
 * The bug this file exists for: the supply-chain example expected
 * `203.0.113.77` to validate as `not_found` while the seeder inserted a
 * DEV-WKS-07 network event whose destination is exactly that IP. A correct IoC
 * validator returned `confirmed` and `createIocValidationAccuracyEvaluator`
 * scored it as WRONG — the label punished the correct behaviour.
 *
 * The general rule pinned below: an IoC the fixture actually contains must not
 * carry a `not_found` expectation. (The converse — an IoC the fixture does NOT
 * contain must not be expected `confirmed` — would fail on the apt29 example,
 * whose registry key expectation is `unable_to_validate` for the same
 * prefix-match reason, so only the decidable direction is asserted here.)
 */

const fixtureTextForHosts = (hosts: string[]): string =>
  JSON.stringify(EVENTS.filter((event) => hosts.includes(event.host)));

describe('Forensics Watch dataset invariants', () => {
  it('covers the fixture it claims to score', () => {
    expect(forensicDataset.length).toBeGreaterThan(0);
    expect(EVENTS.length).toBeGreaterThan(0);
  });

  it('never expects not_found for an IoC the fixture contains', () => {
    const violations: string[] = [];

    for (const example of forensicDataset) {
      const fixtureText = fixtureTextForHosts(example.input.hosts);
      for (const ioc of example.output.expectedIocs) {
        if (ioc.status === 'not_found' && fixtureText.includes(ioc.value)) {
          violations.push(`${example.id}: ${ioc.type}=${ioc.value} seeded but expected not_found`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('expects confirmed only for IoCs the seeded telemetry can resolve', () => {
    // Guards the opposite direction for the dedicated supply-chain case: a
    // `confirmed` label must be backed by a seeded document for that host.
    const supplyChain = forensicDataset.find(
      (example) => example.input.hosts[0] === FORENSIC_HOSTS.supplyChainHost
    );
    expect(supplyChain).toBeDefined();

    const fixtureText = fixtureTextForHosts(supplyChain!.input.hosts);
    for (const ioc of supplyChain!.output.expectedIocs) {
      if (ioc.status === 'confirmed') {
        expect(fixtureText).toContain(ioc.value);
      }
    }
  });

  it('declares a decidable IoC expectation for every example', () => {
    for (const example of forensicDataset) {
      expect(example.output.expectedIocs.length).toBeGreaterThan(0);
      for (const ioc of example.output.expectedIocs) {
        expect(['confirmed', 'not_found', 'unable_to_validate']).toContain(ioc.status);
      }
    }
  });
});
