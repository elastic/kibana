/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// EMH Phase 2: file does not exist yet. Implementer creates it.
import type { RelationshipObservationDoc } from './relationship_observation';
import { getMetadataComponentTemplate } from '../../../server/domain/asset_manager/metadata_component_templates';

describe('EMH Phase 2 — RelationshipObservationDoc type', () => {
  const minimalRequired = {
    '@timestamp': '2026-05-15T10:30:00.000Z',
    'event.kind': 'event',
    'event.action': 'relationship_observed',
    'entity.id': 'user:alice@local',
    'entity.source': 'elastic_defend',
    Maintainer: {
      kind: 'accesses_frequently_and_infrequently',
      scan_id: 'a3f2e1',
      lookback_window: '24h',
    },
  } satisfies RelationshipObservationDoc;

  it('accepts a minimal document with only the required fields', () => {
    expect(minimalRequired['@timestamp']).toBe('2026-05-15T10:30:00.000Z');
    expect(minimalRequired['event.kind']).toBe('event');
    expect(minimalRequired['event.action']).toBe('relationship_observed');
    expect(minimalRequired['entity.id']).toBe('user:alice@local');
    expect(minimalRequired['entity.source']).toBe('elastic_defend');
    expect(minimalRequired.Maintainer.kind).toBe('accesses_frequently_and_infrequently');
    expect(minimalRequired.Maintainer.scan_id).toBe('a3f2e1');
    expect(minimalRequired.Maintainer.lookback_window).toBe('24h');
  });

  it('accepts a document with all optional fields populated', () => {
    const fullDoc: RelationshipObservationDoc = {
      '@timestamp': '2026-05-15T10:30:00.000Z',
      'event.kind': 'event',
      'event.action': 'relationship_observed',
      'event.ingested': '2026-05-15T10:30:05.000Z',
      'entity.id': 'user:alice@local',
      'entity.source': 'elastic_defend',
      'entity.relationships.accesses_frequently.target': 'host:laptopA',
      'related.user': ['alice'],
      'related.hosts': ['laptopA'],
      Maintainer: {
        kind: 'accesses_frequently_and_infrequently',
        scan_id: 'a3f2e1',
        lookback_window: '24h',
      },
    };
    expect(fullDoc['event.ingested']).toBe('2026-05-15T10:30:05.000Z');
    expect(fullDoc['entity.relationships.accesses_frequently.target']).toBe('host:laptopA');
    expect(fullDoc['related.user']).toEqual(['alice']);
    expect(fullDoc['related.hosts']).toEqual(['laptopA']);
  });

  it('allows entity.relationships.<name>.target for any registered relationship kind', () => {
    const kinds = [
      'accesses_frequently',
      'communicates_with',
      'administers',
      'depends_on',
      'owns',
      'supervises',
    ] as const;
    for (const kind of kinds) {
      const doc: RelationshipObservationDoc = {
        '@timestamp': '2026-05-15T10:30:00.000Z',
        'event.kind': 'event',
        'event.action': 'relationship_observed',
        'entity.id': 'user:alice@local',
        'entity.source': 'elastic_defend',
        [`entity.relationships.${kind}.target`]: 'host:laptopA',
        Maintainer: {
          kind,
          scan_id: 'a3f2e1',
          lookback_window: '24h',
        },
      };
      expect(doc[`entity.relationships.${kind}.target`]).toBe('host:laptopA');
    }
  });

  it('pins event.kind to the literal "event"', () => {
    const eventKind: RelationshipObservationDoc['event.kind'] = 'event';
    expect(eventKind).toBe('event');
    // @ts-expect-error event.kind must be the literal 'event'
    const badKind: RelationshipObservationDoc['event.kind'] = 'state';
    expect(badKind).toBe('state');
  });

  it('pins event.action to the literal "relationship_observed"', () => {
    const eventAction: RelationshipObservationDoc['event.action'] = 'relationship_observed';
    expect(eventAction).toBe('relationship_observed');
    // @ts-expect-error event.action must be the literal 'relationship_observed'
    const badAction: RelationshipObservationDoc['event.action'] = 'anomaly_observed';
    expect(badAction).toBe('anomaly_observed');
  });

  it('uses Capitalized "Maintainer" — lowercase "maintainer" is not assignable', () => {
    const docWithLowercase = {
      '@timestamp': '2026-05-15T10:30:00.000Z',
      'event.kind': 'event' as const,
      'event.action': 'relationship_observed' as const,
      'entity.id': 'user:alice@local',
      'entity.source': 'elastic_defend',
      maintainer: {
        kind: 'accesses_frequently_and_infrequently',
        scan_id: 'a3f2e1',
        lookback_window: '24h',
      },
    };
    // @ts-expect-error Maintainer must be Capitalized; lowercase `maintainer` is not assignable
    const _bad: RelationshipObservationDoc = docWithLowercase;
    expect(_bad).toBeDefined();
  });

  it('rejects a document missing a required field at compile time', () => {
    const missingTimestamp = {
      'event.kind': 'event' as const,
      'event.action': 'relationship_observed' as const,
      'entity.id': 'user:alice@local',
      'entity.source': 'elastic_defend',
      Maintainer: {
        kind: 'accesses_frequently_and_infrequently',
        scan_id: 'a3f2e1',
        lookback_window: '24h',
      },
    };
    // @ts-expect-error @timestamp is required
    const _bad: RelationshipObservationDoc = missingTimestamp;
    expect(_bad).toBeDefined();
  });

  it('rejects a document missing Maintainer at compile time', () => {
    const missingMaintainer = {
      '@timestamp': '2026-05-15T10:30:00.000Z',
      'event.kind': 'event' as const,
      'event.action': 'relationship_observed' as const,
      'entity.id': 'user:alice@local',
      'entity.source': 'elastic_defend',
    };
    // @ts-expect-error Maintainer is required
    const _bad: RelationshipObservationDoc = missingMaintainer;
    expect(_bad).toBeDefined();
  });

  it('rejects a Maintainer missing a required sub-field at compile time', () => {
    const partialMaintainer = {
      '@timestamp': '2026-05-15T10:30:00.000Z',
      'event.kind': 'event' as const,
      'event.action': 'relationship_observed' as const,
      'entity.id': 'user:alice@local',
      'entity.source': 'elastic_defend',
      Maintainer: {
        kind: 'accesses_frequently_and_infrequently',
        // scan_id missing
        lookback_window: '24h',
      },
    };
    // @ts-expect-error Maintainer.scan_id is required
    const _bad: RelationshipObservationDoc = partialMaintainer;
    expect(_bad).toBeDefined();
  });
});

describe('EMH Phase 2 — drift guard against Phase 1 component template', () => {
  // A populated value covering every keyword/date path declared in the
  // Phase 1 metadata component template. If the TS type drops or renames
  // a field, this assignment fails to compile. If Phase 1 mappings drift
  // away from these field paths, the property lookup below fails at runtime.
  const populated: RelationshipObservationDoc = {
    '@timestamp': '2026-05-15T10:30:00.000Z',
    'event.kind': 'event',
    'event.action': 'relationship_observed',
    'event.ingested': '2026-05-15T10:30:05.000Z',
    'entity.id': 'user:alice@local',
    'entity.source': 'elastic_defend',
    'entity.relationships.accesses_frequently.target': 'host:laptopA',
    'related.user': ['alice'],
    'related.hosts': ['laptopA'],
    Maintainer: {
      kind: 'accesses_frequently_and_infrequently',
      scan_id: 'a3f2e1',
      lookback_window: '24h',
    },
  };

  const template = getMetadataComponentTemplate('default');
  const mappings = template.template?.mappings;
  const properties = (mappings?.properties ?? {}) as Record<string, { type?: string }>;

  // Every flat keyword/date path the Phase 1 template declares (excluding
  // the dotted-template-driven `entity.relationships.*.target`, which is
  // covered by its own dynamic_templates assertion below).
  const flatKeywordOrDatePaths = [
    '@timestamp',
    'event.ingested',
    'event.kind',
    'event.action',
    'entity.id',
    'entity.source',
    'related.user',
    'related.hosts',
    'Maintainer.kind',
    'Maintainer.scan_id',
    'Maintainer.lookback_window',
  ] as const;

  it.each(flatKeywordOrDatePaths)('declares %s on the Phase 1 component template', (path) => {
    expect(properties[path]).toBeDefined();
    const declaredType = properties[path]?.type;
    expect(['keyword', 'date']).toContain(declaredType);
  });

  it('declares entity.relationships.*.target dynamic_template as keyword', () => {
    const dynamicTemplates = mappings?.dynamic_templates ?? [];
    const targetTemplate = dynamicTemplates.find((dt) => {
      const entry = dt as Record<string, { path_match?: string; mapping?: { type?: string } }>;
      return Object.values(entry).some(
        (def) =>
          typeof def.path_match === 'string' &&
          def.path_match.startsWith('entity.relationships.') &&
          def.path_match.endsWith('.target') &&
          def.mapping?.type === 'keyword'
      );
    });
    expect(targetTemplate).toBeDefined();
  });

  it('every flat path on the type matches a property on the Phase 1 template', () => {
    // Each `keyof` of the populated doc that is a flat (dotted or
    // top-level) path must exist on the Phase 1 template.
    const flatTypeKeys = Object.keys(populated).filter(
      (k) => k !== 'Maintainer' && !k.startsWith('entity.relationships.')
    );
    for (const key of flatTypeKeys) {
      expect(properties[key]).toBeDefined();
    }
  });

  it('every Maintainer.* key on the type matches a Maintainer property on the template', () => {
    const maintainerKeys = Object.keys(populated.Maintainer);
    for (const sub of maintainerKeys) {
      expect(properties[`Maintainer.${sub}`]).toBeDefined();
    }
  });
});
