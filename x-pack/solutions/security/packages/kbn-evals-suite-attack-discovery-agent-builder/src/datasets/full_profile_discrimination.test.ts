/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAd2RunMarker } from '../scenario_registry';
import { buildFullProfileDiscriminationDataset } from './full_profile_discrimination';

const runMarker = createAd2RunMarker('full-profile-dataset-test');
const example = buildFullProfileDiscriminationDataset(runMarker).examples[0];

describe('full profile discrimination dataset', () => {
  // The evals client resolves upstream datasets BY NAME
  // (`getDatasetByName` -> `resolveDataset` in the kbn-evals executor). With a
  // constant name, a cached dataset from a previous run — bound to the
  // PREVIOUS run marker in its question, retrievalScope and forbidden IDs — is
  // consumed before this run's examples are visible, and the eval scores this
  // run's seed against last run's marker (observed live for rep 0). The name
  // must therefore be run-specific so a stale entry can never match.
  it('binds the dataset identity to this run marker', () => {
    const name = buildFullProfileDiscriminationDataset(runMarker).name;
    expect(name).toContain(runMarker);

    const otherMarker = createAd2RunMarker(`other-${runMarker}`);
    expect(buildFullProfileDiscriminationDataset(otherMarker).name).not.toBe(name);
  });

  // `.alerts-security.alerts-default` is a shared index and
  // `AD2_SCENARIO_SEED_LABEL` is generation-wide — every concurrent
  // scenario-registry run carries it. The run marker is the only bound that
  // separates this run's population from every other one, so the question must
  // ask for it AND the example must declare it as `retrievalScope`; otherwise
  // `evaluate_dataset` credits an unscoped (contaminated) row count as this
  // fixture's retrieval. The dense live-retrieval example scopes the same way.
  it('scopes the retrieval to this run marker, in the question and as retrievalScope', () => {
    expect(example.input?.retrievalScope).toBe(runMarker);
    expect(example.input?.question ?? '').toContain(runMarker);
  });

  it('does not scope the question by the generation-wide seed label', () => {
    expect(example.input?.question ?? '').not.toMatch(/label\s+\S*ad-scenario-registry/);
  });

  // The live-retrieval query is not filtered to signal alerts: it retrieves the
  // FULL seeded population (28 signal + 150 noise). Expecting only the signal
  // count would fail a correct 178-row retrieval and reward one that somehow
  // excluded every distractor. The noise IDs are the forbidden set for
  // generated discoveries, not alerts that should vanish from retrieval.
  it('expects the full seeded population as the retrieved count', () => {
    expect(example.output?.expectedRetrievedAlertCount).toBeGreaterThan(0);
    expect(example.output?.expectedRetrievedAlertCount).toBe(example.metadata?.alertCount);
  });

  // `WorkflowEvidence` reads `null` as "assert the run reports null" — an
  // unwinnable assertion on any run that passes alerts. The passed count must
  // be left UNSCORED, which the contract expresses only as an absent key.
  it('leaves the passed alert count unscored (absent, not null)', () => {
    expect(Object.prototype.hasOwnProperty.call(example.output, 'expectedPassedAlertCount')).toBe(
      false
    );
  });
});
