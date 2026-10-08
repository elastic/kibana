/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import { ANCESTORS, LEGACY_ANCESTORS } from '../constants/field_names';
import { getAncestorsIndexById } from './get_ancestors_index_by_id';

const LOCAL_DOCUMENT_INDEX = '.alerts-security.alerts-default';
const REMOTE_DOCUMENT_INDEX = 'project-a:.internal.alerts-security.alerts-default-000001';

interface AncestorEntry {
  id?: string;
  index?: string;
}

const makeHit = ({
  ancestors,
  legacyAncestors,
  ruleType,
}: {
  ancestors?: AncestorEntry[];
  legacyAncestors?: AncestorEntry[];
  ruleType?: string;
}): DataTableRecord =>
  ({
    id: '1',
    raw: {
      _source: {
        ...(ancestors ? { [ANCESTORS]: ancestors } : {}),
        ...(legacyAncestors ? { [LEGACY_ANCESTORS]: legacyAncestors } : {}),
      },
    },
    flattened: ruleType ? { 'kibana.alert.rule.type': [ruleType] } : {},
  } as unknown as DataTableRecord);

describe('getAncestorsIndexById', () => {
  it('maps a single ancestor id to its index', () => {
    const hit = makeHit({ ancestors: [{ id: 'ancestor-1', index: '.ds-logs-source-1' }] });

    expect(getAncestorsIndexById(hit, LOCAL_DOCUMENT_INDEX)).toEqual({
      'ancestor-1': '.ds-logs-source-1',
    });
  });

  it('maps each ancestor id to its own index', () => {
    const hit = makeHit({
      ancestors: [
        { id: 'ancestor-1', index: '.ds-logs-source-1' },
        { id: 'ancestor-2', index: '.internal.alerts-security.alerts-default' },
      ],
    });

    expect(getAncestorsIndexById(hit, LOCAL_DOCUMENT_INDEX)).toEqual({
      'ancestor-1': '.ds-logs-source-1',
      'ancestor-2': '.internal.alerts-security.alerts-default',
    });
  });

  // Regression for kibana #288207: an EQL sequence alert interleaves depth-0 events (real index)
  // with depth-1 `signal` legs (empty index). Reading the paired objects keeps each event mapped to
  // its own index; a positional align of the flattened arrays would pair `evt-outside` with the
  // first index (`logs-inside`) once the empty signal indices are dropped.
  it('pairs each source event with its own index for an EQL sequence alert', () => {
    const hit = makeHit({
      ancestors: [
        { id: 'evt-inside', index: 'logs-inside' },
        { id: 'sig-1', index: '' },
        { id: 'evt-outside', index: 'myidx-outside' },
        { id: 'sig-2', index: '' },
      ],
    });

    expect(getAncestorsIndexById(hit, LOCAL_DOCUMENT_INDEX)).toEqual({
      'evt-inside': 'logs-inside',
      'evt-outside': 'myidx-outside',
    });
  });

  it('maps ancestor ids from the legacy signal.ancestors field', () => {
    const hit = makeHit({ legacyAncestors: [{ id: 'ancestor-1', index: '.ds-logs-source-1' }] });

    expect(getAncestorsIndexById(hit, LOCAL_DOCUMENT_INDEX)).toEqual({
      'ancestor-1': '.ds-logs-source-1',
    });
  });

  it('merges ancestor ids from both the current and legacy fields', () => {
    const hit = makeHit({
      ancestors: [{ id: 'ancestor-1', index: '.ds-logs-source-1' }],
      legacyAncestors: [{ id: 'ancestor-2', index: '.ds-logs-source-2' }],
    });

    expect(getAncestorsIndexById(hit, LOCAL_DOCUMENT_INDEX)).toEqual({
      'ancestor-1': '.ds-logs-source-1',
      'ancestor-2': '.ds-logs-source-2',
    });
  });

  it('returns an empty map for threshold rules to avoid linking the synthetic ancestor', () => {
    const hit = makeHit({
      ruleType: 'threshold',
      ancestors: [{ id: 'fake-ancestor', index: '.ds-logs-source-1' }],
    });

    expect(getAncestorsIndexById(hit, LOCAL_DOCUMENT_INDEX)).toEqual({});
  });

  it('skips ancestors that have no index', () => {
    const hit = makeHit({
      ancestors: [
        { id: 'ancestor-1', index: '.ds-logs-source-1' },
        { id: 'ancestor-2', index: '' },
        { id: 'ancestor-3' },
      ],
    });

    expect(getAncestorsIndexById(hit, LOCAL_DOCUMENT_INDEX)).toEqual({
      'ancestor-1': '.ds-logs-source-1',
    });
  });

  it('returns an empty map when there are no ancestors', () => {
    expect(getAncestorsIndexById(makeHit({}), LOCAL_DOCUMENT_INDEX)).toEqual({});
  });

  it('qualifies ancestor indices with the linked-project prefix when the alert lives in a remote project', () => {
    const hit = makeHit({
      ancestors: [
        { id: 'ancestor-1', index: '.ds-logs-source-1' },
        { id: 'ancestor-2', index: '.internal.alerts-security.alerts-default' },
      ],
    });

    expect(getAncestorsIndexById(hit, REMOTE_DOCUMENT_INDEX)).toEqual({
      'ancestor-1': 'project-a:.ds-logs-source-1',
      'ancestor-2': 'project-a:.internal.alerts-security.alerts-default',
    });
  });

  it('leaves an already-qualified ancestor index unchanged when the alert lives in a remote project', () => {
    const hit = makeHit({
      ancestors: [{ id: 'ancestor-1', index: 'project-a:.ds-logs-source-1' }],
    });

    expect(getAncestorsIndexById(hit, REMOTE_DOCUMENT_INDEX)).toEqual({
      'ancestor-1': 'project-a:.ds-logs-source-1',
    });
  });
});
