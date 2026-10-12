/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { BriefSnapshot } from '../../../../../common/entity_analytics/executive_brief/types';
import realJob from '../__fixtures__/real_job.json';
import {
  buildStorylineGraphLayout,
  DIAGRAM_LABEL_GAP,
  DIAGRAM_MIN_HEIGHT,
  DIAGRAM_ROW_HEIGHT,
} from './build_storyline_graph_layout';

describe('buildStorylineGraphLayout (real S1)', () => {
  const snapshot = realJob.snapshot as unknown as BriefSnapshot;
  const story = snapshot.storylines.storylines[0];

  it('puts the user left and the three hosts right, deterministically', () => {
    const first = buildStorylineGraphLayout(story, snapshot);
    expect(buildStorylineGraphLayout(story, snapshot)).toEqual(first);
    const left = first.nodes.filter(({ column }) => column === 'left');
    const right = first.nodes.filter(({ column }) => column === 'right');
    expect(left.map(({ euid }) => euid)).toEqual([story.entityEuids[0]]);
    expect(right.map(({ euid }) => euid)).toEqual(story.entityEuids.slice(1));
    expect(first.height).toBeGreaterThanOrEqual(DIAGRAM_MIN_HEIGHT);
    // rows are evenly pitched and the lone user is centred
    expect(right[1].cy - right[0].cy).toBe(DIAGRAM_ROW_HEIGHT);
    expect(left[0].cy).toBe(first.height / 2);
  });

  it('emits one pair per entity pair with the strongest verb and all verbs', () => {
    const { pairs } = buildStorylineGraphLayout(story, snapshot);
    expect(pairs).toHaveLength(3);
    pairs.forEach((pair) => {
      expect(pair.label).toBe('part of the same discovered attack');
      expect(pair.verbs[0]).toBe(pair.label);
      expect(new Set(pair.verbs).size).toBe(pair.verbs.length);
      expect(pair.weak).toBe(false);
      expect(pair.sameColumn).toBe(false);
    });
    expect(pairs.find(({ to }) => to === story.entityEuids[1])?.verbs).toEqual(
      expect.arrayContaining(['logged on to (rarely)', 'regularly logs on to'])
    );
  });
});

describe('edge label placement', () => {
  it('keeps inline labels apart for a fully connected 2x2 pair set', () => {
    const snapshot = realJob.snapshot as unknown as BriefSnapshot;
    const base = snapshot.storylines.storylines[0];
    const [user, hostA, hostB] = base.entityEuids;
    const user2 = 'user:second';
    const entities = {
      ...snapshot.entities,
      [user2]: { ...snapshot.entities[user], euid: user2, name: 'second' },
    };
    const story = {
      ...base,
      entityEuids: [user, user2, hostA, hostB],
      edges: [
        { ...base.edges[0], from: user, to: hostA, type: 'same_ad' as const },
        { ...base.edges[0], from: user, to: hostB, type: 'same_ad' as const },
        { ...base.edges[0], from: user2, to: hostA, type: 'same_ad' as const },
        { ...base.edges[0], from: user2, to: hostB, type: 'same_ad' as const },
      ],
    };
    const { pairs } = buildStorylineGraphLayout(story, { ...snapshot, entities });
    const ys = pairs.map(({ labelY }) => labelY).sort((a, b) => a - b);
    expect(pairs).toHaveLength(4);
    ys.slice(1).forEach((y, i) => expect(y - ys[i]).toBeGreaterThanOrEqual(DIAGRAM_LABEL_GAP));
  });
});
