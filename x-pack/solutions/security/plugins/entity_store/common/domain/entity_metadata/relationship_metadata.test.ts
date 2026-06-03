/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RelationshipMetadataDoc,
  RelationshipMetadataMaintainer,
} from './relationship_metadata';
import { RELATIONSHIP_KINDS } from './relationship_metadata';
import { getMetadataComponentTemplate } from '../../../server/domain/asset_manager/metadata_component_templates';

describe('EMH Phase 2 — RelationshipMetadataDoc type', () => {
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
  } satisfies RelationshipMetadataDoc;

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
    const fullDoc: RelationshipMetadataDoc = {
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
      const doc: RelationshipMetadataDoc = {
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
    const eventKind: RelationshipMetadataDoc['event.kind'] = 'event';
    expect(eventKind).toBe('event');
    // @ts-expect-error event.kind must be the literal 'event'
    const badKind: RelationshipMetadataDoc['event.kind'] = 'state';
    expect(badKind).toBe('state');
  });

  it('pins event.action to the literal "relationship_observed"', () => {
    const eventAction: RelationshipMetadataDoc['event.action'] = 'relationship_observed';
    expect(eventAction).toBe('relationship_observed');
    // @ts-expect-error event.action must be the literal 'relationship_observed'
    const badAction: RelationshipMetadataDoc['event.action'] = 'anomaly_observed';
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
    const _bad: RelationshipMetadataDoc = docWithLowercase;
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
    const _bad: RelationshipMetadataDoc = missingTimestamp;
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
    const _bad: RelationshipMetadataDoc = missingMaintainer;
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
    const _bad: RelationshipMetadataDoc = partialMaintainer;
    expect(_bad).toBeDefined();
  });
});

// Every flat keyword/date path the Phase 1 template declares for the
// relationship observation doc.
const FLAT_TEMPLATE_PATHS = [
  '@timestamp',
  'event.kind',
  'event.action',
  'event.ingested',
  'entity.id',
  'entity.source',
  'related.user',
  'related.hosts',
] as const;

const MAINTAINER_SUB_KEYS = ['kind', 'scan_id', 'lookback_window'] as const satisfies ReadonlyArray<
  keyof RelationshipMetadataMaintainer
>;

// Every top-level key on `RelationshipMetadataDoc`. The `satisfies`
// clause asserts the array is a subset of `keyof`; the type-level equality
// assertion below pins it to the full set, so adding a new field to the
// type without listing it here fails compilation.
const RELATIONSHIP_OBSERVATION_FIELD_PATHS = [
  '@timestamp',
  'event.kind',
  'event.action',
  'event.ingested',
  'entity.id',
  'entity.source',
  'related.user',
  'related.hosts',
  'Maintainer',
  'entity.relationships.accesses_frequently.target',
  'entity.relationships.accesses_infrequently.target',
  'entity.relationships.communicates_with.target',
  'entity.relationships.administers.target',
  'entity.relationships.depends_on.target',
  'entity.relationships.owns.target',
  'entity.relationships.supervises.target',
] as const satisfies ReadonlyArray<keyof RelationshipMetadataDoc>;

// True iff A and B are mutually assignable. Used to enforce exhaustiveness
// at the type level: any field added to `RelationshipMetadataDoc`
// without a matching entry in `RELATIONSHIP_OBSERVATION_FIELD_PATHS` makes
// this resolve to `false`, so the assertion at the bottom of this describe
// fails compilation.
type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
  ? true
  : false;

type EnumeratedKeys = (typeof RELATIONSHIP_OBSERVATION_FIELD_PATHS)[number];

describe('EMH Phase 2 — drift guard against Phase 1 component template', () => {
  const template = getMetadataComponentTemplate('default');
  const mappings = template.template?.mappings;
  const properties = (mappings?.properties ?? {}) as Record<string, { type?: string }>;
  const dynamicTemplates = (mappings?.dynamic_templates ?? []) as Array<
    Record<string, { path_match?: string; mapping?: { type?: string } }>
  >;

  it('RELATIONSHIP_OBSERVATION_FIELD_PATHS exhaustively covers keyof RelationshipMetadataDoc', () => {
    const exhaustive: Equals<EnumeratedKeys, keyof RelationshipMetadataDoc> = true;
    expect(exhaustive).toBe(true);
  });

  it.each(FLAT_TEMPLATE_PATHS)('declares %s on the Phase 1 component template', (path) => {
    expect(properties[path]).toBeDefined();
    const declaredType = properties[path]?.type;
    expect(['keyword', 'date']).toContain(declaredType);
  });

  it.each(MAINTAINER_SUB_KEYS)(
    'declares Maintainer.%s on the Phase 1 component template',
    (sub) => {
      const key = `Maintainer.${sub}` as const;
      expect(properties[key]).toBeDefined();
      expect(properties[key]?.type).toBe('keyword');
    }
  );

  it('declares entity.relationships.*.target dynamic_template as keyword', () => {
    const targetTemplate = dynamicTemplates.find((dt) =>
      Object.values(dt).some(
        (def) =>
          typeof def.path_match === 'string' &&
          def.path_match.startsWith('entity.relationships.') &&
          def.path_match.endsWith('.target') &&
          def.mapping?.type === 'keyword'
      )
    );
    expect(targetTemplate).toBeDefined();
  });

  it.each(RELATIONSHIP_OBSERVATION_FIELD_PATHS)(
    'maps every keyof RelationshipMetadataDoc — %s — to the Phase 1 template',
    (path) => {
      if (path === 'Maintainer') {
        for (const sub of MAINTAINER_SUB_KEYS) {
          expect(properties[`Maintainer.${sub}`]).toBeDefined();
        }
        return;
      }
      const relationshipTargetMatch = path.match(/^entity\.relationships\.(.+)\.target$/);
      if (relationshipTargetMatch) {
        const kind = relationshipTargetMatch[1];
        expect(RELATIONSHIP_KINDS).toContain(kind);
        const matched = dynamicTemplates.some((dt) =>
          Object.values(dt).some(
            (def) =>
              def.path_match === 'entity.relationships.*.target' && def.mapping?.type === 'keyword'
          )
        );
        expect(matched).toBe(true);
        return;
      }
      expect(properties[path]).toBeDefined();
    }
  );
});
