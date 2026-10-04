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
 * DEV-WKS-07 network event whose destination is exactly that IP — and the
 * rundll32 example expected the seeded registry run key to be
 * `unable_to_validate`. A correct IoC validator returned `confirmed` for both
 * and `createIocValidationAccuracyEvaluator` scored the correct answer as a
 * miss. The labels punished correct behaviour.
 *
 * The rule pinned below is decided per IoC, from the fixture itself:
 *
 *  - IoC types the platform can query (`CONFIRMABLE_IOC_TYPES`):
 *      value present as a COMPLETE value in the seeded telemetry ⇒ `confirmed`;
 *      value absent from the telemetry entirely ⇒ `not_found`;
 *      value present only inside a longer value (e.g. a parent registry path of
 *      a seeded key) ⇒ unconstrained, because whether that resolves depends on
 *      the validator's matching semantics, which live outside this repo.
 *  - Other types (`process_name`): `unable_to_validate` — the platform has no
 *    query for them, so no fixture state can decide them.
 */

const CONFIRMABLE_IOC_TYPES = ['network_destination', 'file_hash', 'registry_key'];

const fixtureForHosts = (hosts: string[]) =>
  JSON.stringify(EVENTS.filter((event) => hosts.includes(event.host)));

/** The value as it appears inside the fixture JSON (escaped the same way). */
const escaped = (value: string): string => JSON.stringify(value).slice(1, -1);

/** Present as a complete JSON value, not merely as a substring of one. */
const isExactlySeeded = (fixtureJson: string, value: string): boolean =>
  fixtureJson.includes(JSON.stringify(value));

/** Present at all — including inside a longer value (e.g. a parent key path). */
const isSeededAtAll = (fixtureJson: string, value: string): boolean =>
  fixtureJson.includes(escaped(value));

describe('Forensics Watch dataset invariants', () => {
  it('covers the fixture it claims to score', () => {
    expect(forensicDataset.length).toBeGreaterThan(0);
    expect(EVENTS.length).toBeGreaterThan(0);
  });

  it('labels every IoC consistently with the seeded telemetry', () => {
    const violations: string[] = [];

    for (const example of forensicDataset) {
      const fixtureJson = fixtureForHosts(example.input.hosts);

      for (const ioc of example.output.expectedIocs) {
        const seededExactly = isExactlySeeded(fixtureJson, ioc.value);
        const seededAtAll = isSeededAtAll(fixtureJson, ioc.value);

        if (!CONFIRMABLE_IOC_TYPES.includes(ioc.type)) {
          if (ioc.status !== 'unable_to_validate') {
            violations.push(
              `${example.id}: ${ioc.type}=${ioc.value} is not queryable, so it must be ` +
                `unable_to_validate, not ${ioc.status}`
            );
          }
        } else {
          if (seededExactly && ioc.status !== 'confirmed') {
            violations.push(
              `${example.id}: ${ioc.type}=${ioc.value} is seeded verbatim but expected ${ioc.status}`
            );
          }
          if (!seededAtAll && ioc.status !== 'not_found') {
            violations.push(
              `${example.id}: ${ioc.type}=${ioc.value} is absent from the fixture but expected ${ioc.status}`
            );
          }
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('seeds a document for every host a scenario claims', () => {
    for (const example of forensicDataset) {
      for (const host of example.input.hosts) {
        expect(EVENTS.some((event) => event.host === host)).toBe(true);
      }
    }
  });

  it('keeps the supply-chain host distinct from the other scenarios', () => {
    const supplyChain = forensicDataset.find(
      (example) => example.input.hosts[0] === FORENSIC_HOSTS.supplyChainHost
    );

    expect(supplyChain).toBeDefined();
    for (const example of forensicDataset) {
      if (example !== supplyChain) {
        expect(example.input.hosts).not.toContain(FORENSIC_HOSTS.supplyChainHost);
      }
    }
  });
});
