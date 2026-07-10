/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_VALUE, SLOWithSummaryResponse } from '@kbn/slo-schema';
import { buildSlo } from '../../../data/slo/slo';
import {
  buildNameLookup,
  mapSlosToOptions,
  rememberSlos,
  resolveSelectedSlos,
  toSloOptionValue,
} from './slo_selector';

describe('resolveSelectedSlos', () => {
  const sloA = buildSlo({ id: 'slo-a', name: 'Alpha SLO', instanceId: ALL_VALUE });
  const sloB = buildSlo({ id: 'slo-b', name: 'Beta SLO', instanceId: ALL_VALUE });
  const sloC = buildSlo({ id: 'slo-c', name: 'Gamma SLO', instanceId: ALL_VALUE });

  it('keeps previously selected SLOs that are missing from the current search results', () => {
    const knownSlos = new Map<string, SLOWithSummaryResponse>();
    // First search page: A and B
    rememberSlos(knownSlos, [sloA, sloB]);
    // User selects A and B
    let selected = resolveSelectedSlos(
      [
        { label: sloA.name, value: toSloOptionValue(sloA.id, sloA.instanceId) },
        { label: sloB.name, value: toSloOptionValue(sloB.id, sloB.instanceId) },
      ],
      knownSlos
    );
    expect(selected.map((s) => s.id)).toEqual(['slo-a', 'slo-b']);

    // Later search page only returns C — A/B are gone from results but still selected in the UI
    rememberSlos(knownSlos, [sloC]);
    selected = resolveSelectedSlos(
      [
        { label: sloA.name, value: toSloOptionValue(sloA.id, sloA.instanceId) },
        { label: sloB.name, value: toSloOptionValue(sloB.id, sloB.instanceId) },
        { label: sloC.name, value: toSloOptionValue(sloC.id, sloC.instanceId) },
      ],
      knownSlos
    );

    expect(selected.map((s) => s.id)).toEqual(['slo-a', 'slo-b', 'slo-c']);
  });

  it('preserves initial selections seeded into the known-SLOs cache', () => {
    const knownSlos = new Map<string, SLOWithSummaryResponse>();
    rememberSlos(knownSlos, [sloA, sloB]);
    rememberSlos(knownSlos, [sloC]);

    const selected = resolveSelectedSlos(
      [
        { label: sloA.name, value: toSloOptionValue(sloA.id, sloA.instanceId) },
        { label: sloB.name, value: toSloOptionValue(sloB.id, sloB.instanceId) },
        { label: sloC.name, value: toSloOptionValue(sloC.id, sloC.instanceId) },
      ],
      knownSlos
    );

    expect(selected.map((s) => s.id)).toEqual(['slo-a', 'slo-b', 'slo-c']);
  });

  it('returns an empty list when nothing is selected', () => {
    const knownSlos = new Map<string, SLOWithSummaryResponse>([
      [toSloOptionValue(sloA.id, sloA.instanceId), sloA],
    ]);
    expect(resolveSelectedSlos([], knownSlos)).toEqual([]);
  });
});

describe('buildNameLookup / mapSlosToOptions', () => {
  it('refreshes selected option labels from live API names', () => {
    const stored = {
      id: 'slo-a',
      instanceId: ALL_VALUE,
      name: 'Old name',
      groupBy: ALL_VALUE,
    };
    const live = buildSlo({ id: 'slo-a', name: 'Renamed SLO', instanceId: ALL_VALUE });

    const staleOptions = mapSlosToOptions([stored]);
    expect(staleOptions[0].label).toBe('Old name');

    const nameLookup = buildNameLookup([live]);
    const refreshedOptions = mapSlosToOptions([stored], nameLookup);
    expect(refreshedOptions[0]).toEqual({
      label: 'Renamed SLO',
      value: toSloOptionValue('slo-a', ALL_VALUE),
    });
  });

  it('applies the live name to a specific instance selection', () => {
    const stored = {
      id: 'slo-a',
      instanceId: 'host-1',
      name: 'Old name',
      groupBy: 'host.name',
    };
    const live = buildSlo({ id: 'slo-a', name: 'Renamed SLO', instanceId: 'host-1' });

    const nameLookup = buildNameLookup([live]);
    const options = mapSlosToOptions([stored], nameLookup);

    expect(options[0].label).toBe('Renamed SLO (host-1)');
  });

  it('uses the definition name for an all-instances selection when only a child instance is returned', () => {
    const stored = {
      id: 'slo-a',
      instanceId: ALL_VALUE,
      name: 'Old name',
      groupBy: 'host.name',
    };
    const liveInstance = buildSlo({ id: 'slo-a', name: 'Renamed SLO', instanceId: 'host-1' });

    const nameLookup = buildNameLookup([liveInstance]);
    const options = mapSlosToOptions([stored], nameLookup);

    expect(options[0].label).toBe('Renamed SLO');
  });
});
