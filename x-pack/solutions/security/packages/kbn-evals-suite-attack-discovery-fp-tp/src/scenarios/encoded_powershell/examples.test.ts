/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FP_TP_RAW_EVENT_PAGE_SIZE, type FpTpWorld } from '../../world';
import { buildFpTpExampleWorld } from '..';
import { ENCODED_POWERSHELL_EXAMPLES } from './examples';

const entitySubType = (world: FpTpWorld): unknown =>
  world.entities.map((entity) => (entity.source.entity as { sub_type?: string }).sub_type)[0];

const processParents = (world: FpTpWorld): string[] =>
  world.events.flatMap((event) => {
    const parent = (event.source.process as { parent?: { name?: string } } | undefined)?.parent;
    return parent?.name ? [parent.name] : [];
  });

const situationOf = (id: string): string | undefined =>
  ENCODED_POWERSHELL_EXAMPLES.find((example) => example.id === id)?.situation;

describe('encoded-powershell examples', () => {
  it('returns nine examples', () => {
    expect(ENCODED_POWERSHELL_EXAMPLES).toHaveLength(9);
  });

  it('returns U1 for the lookalike fp', () => {
    expect(situationOf('encoded-powershell.fp')).toBe('U1');
  });

  it('returns U6 for the true attack', () => {
    expect(situationOf('encoded-powershell.tp')).toBe('U6');
  });

  it('returns an mdm_management entity for the lookalike fp', () => {
    expect(entitySubType(buildFpTpExampleWorld('encoded-powershell.fp', 'run1'))).toBe(
      'mdm_management'
    );
  });

  it('returns no entities when entities are missing', () => {
    expect(
      buildFpTpExampleWorld('encoded-powershell.tp-entities-missing', 'run1').entities
    ).toEqual([]);
  });

  it('returns no entities for the lookalike fp with entities missing', () => {
    expect(
      buildFpTpExampleWorld('encoded-powershell.fp-entities-missing', 'run1').entities
    ).toEqual([]);
  });

  it('returns fp raw events for the lookalike fp with entities missing', () => {
    expect(
      processParents(buildFpTpExampleWorld('encoded-powershell.fp-entities-missing', 'run1'))
    ).toContain('ccmexec.exe');
  });

  it('returns no raw events when events are missing', () => {
    expect(buildFpTpExampleWorld('encoded-powershell.tp-events-missing', 'run1').events).toEqual(
      []
    );
  });

  it('returns fp entities in the mixed world', () => {
    expect(entitySubType(buildFpTpExampleWorld('encoded-powershell.mixed-world', 'run1'))).toBe(
      'mdm_management'
    );
  });

  it('returns tp raw events in the mixed world', () => {
    expect(
      processParents(buildFpTpExampleWorld('encoded-powershell.mixed-world', 'run1'))
    ).toContain('WINWORD.EXE');
  });

  describe('fp with truncated events', () => {
    const fp = buildFpTpExampleWorld('encoded-powershell.fp', 'run1');
    const truncated = buildFpTpExampleWorld('encoded-powershell.fp-events-truncated', 'run1');
    const timestamps = (world: FpTpWorld): number[] =>
      world.events.map((event) => Date.parse(String(event.source['@timestamp'])));
    const added = truncated.events.slice(fp.events.length);

    it('returns more raw events than the analysis reads in one page', () => {
      expect(added.length).toBeGreaterThan(FP_TP_RAW_EVENT_PAGE_SIZE);
    });

    it('returns the fp world unchanged around the added events', () => {
      expect({ ...truncated, events: truncated.events.slice(0, fp.events.length) }).toEqual(fp);
    });

    it('returns the added events after every fp raw event', () => {
      expect(Math.min(...timestamps({ ...truncated, events: added }))).toBeGreaterThan(
        Math.max(...timestamps(fp))
      );
    });

    it('returns the added events on the cited host', () => {
      const hostIds = new Set(fp.alerts.map((alert) => (alert.source.host as { id: string }).id));
      expect(
        added.filter((event) => !hostIds.has((event.source.host as { id: string }).id))
      ).toEqual([]);
    });

    it('returns benign service starts', () => {
      expect(new Set(processParents({ ...truncated, events: added }))).toEqual(
        new Set(['services.exe'])
      );
    });
  });

  it('returns no attack document when the attack discovery is missing', () => {
    expect(
      buildFpTpExampleWorld('encoded-powershell.failed-missing-ad', 'run1').attack
    ).toBeUndefined();
  });

  it('returns an attack that cites an alert the world does not seed', () => {
    const world = buildFpTpExampleWorld('encoded-powershell.failed-missing-cited-alert', 'run1');
    const seeded = new Set(world.alerts.map((alert) => alert.id));
    const cited = world.attack?.['kibana.alert.attack_discovery.alert_ids'] as string[];
    expect(cited.some((id) => !seeded.has(id))).toBe(true);
  });
});
