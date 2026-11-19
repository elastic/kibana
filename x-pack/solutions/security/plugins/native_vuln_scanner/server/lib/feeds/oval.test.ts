/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Atom, CriteriaLeafInput, OvalSection, XmlNode } from './oval';
import {
  expandCriteria,
  groupByLeaf,
  ovalPublicToIso,
  ovalTimestampToIso,
  parseCvss,
  parseSlashCvss,
  readOval,
  UnsupportedCriteriaError,
} from './oval';

const node = (
  name: string,
  attrs: Record<string, string> = {},
  children: XmlNode[] = []
): XmlNode => ({ name, attrs, children, text: '' });

const criterion = (comment: string): XmlNode => node('criterion', { comment });
const and = (...children: XmlNode[]): XmlNode => node('criteria', { operator: 'AND' }, children);
const or = (...children: XmlNode[]): XmlNode => node('criteria', { operator: 'OR' }, children);

// Comments: "T" true, "F" false, "C:x" condition x, anything else a leaf.
const classify = ({ comment }: CriteriaLeafInput): Atom<string, string> => {
  if (comment === 'T') return { kind: 'true' };
  if (comment === 'F') return { kind: 'false', reason: 'f' };
  if (comment.startsWith('C:')) return { kind: 'condition', condition: comment.slice(2) };
  return { kind: 'leaf', leaf: comment };
};

const render = (conjunctions: ReturnType<typeof expandCriteria<string, string>>): string[] =>
  conjunctions.map((c) =>
    c.map((atom) => (atom.kind === 'leaf' ? atom.leaf : `C:${atom.condition}`)).join('&')
  );

describe('expandCriteria', () => {
  it('distributes AND over OR and drops true atoms', () => {
    const tree = and(
      criterion('T'),
      or(criterion('a'), criterion('b')),
      or(criterion('C:x'), criterion('C:y'))
    );
    expect(render(expandCriteria(tree, classify))).toEqual(['a&C:x', 'a&C:y', 'b&C:x', 'b&C:y']);
  });

  it('prunes conjunctions holding a false atom and reports why', () => {
    const reasons: string[] = [];
    const tree = or(criterion('F'), and(criterion('a'), or(criterion('F'), criterion('C:x'))));
    expect(render(expandCriteria(tree, classify, (r) => reasons.push(r)))).toEqual(['a&C:x']);
    expect(reasons).toEqual(['f', 'f']);
  });

  it('treats criteria without an operator as AND', () => {
    const tree = node('criteria', {}, [criterion('a'), criterion('C:x')]);
    expect(render(expandCriteria(tree, classify))).toEqual(['a&C:x']);
  });

  it('refuses negated criteria instead of misreading them', () => {
    const tree = and(node('criterion', { comment: 'a', negate: 'true' }));
    expect(() => expandCriteria(tree, classify)).toThrow(
      expect.objectContaining({ reason: 'negated' }) as UnsupportedCriteriaError
    );
  });

  it('refuses ONE/XOR operators and xs:boolean negation', () => {
    const one = node('criteria', { operator: 'ONE' }, [criterion('a'), criterion('b')]);
    expect(() => expandCriteria(one, classify)).toThrow(
      expect.objectContaining({ reason: 'operator' }) as UnsupportedCriteriaError
    );
    const negated = and(node('criterion', { comment: 'a', negate: '1' }));
    expect(() => expandCriteria(negated, classify)).toThrow(
      expect.objectContaining({ reason: 'negated' }) as UnsupportedCriteriaError
    );
  });

  it('refuses trees whose expansion explodes', () => {
    const wide = or(...Array.from({ length: 200 }, (_, i) => criterion(`C:${i}`)));
    expect(() => expandCriteria(and(wide, wide), classify)).toThrow(UnsupportedCriteriaError);
  });
});

describe('groupByLeaf', () => {
  const skips: string[] = [];
  const group = (tree: XmlNode) =>
    groupByLeaf(
      expandCriteria(tree, classify),
      (leaf) => leaf,
      (r) => skips.push(r)
    );

  beforeEach(() => {
    skips.length = 0;
  });

  it('collects the alternative conditions of each leaf', () => {
    const tree = or(
      and(criterion('a'), criterion('C:x')),
      and(criterion('a'), criterion('C:y')),
      criterion('b')
    );
    expect(group(tree)).toEqual([
      { leaf: 'a', conditions: [['x'], ['y']] },
      { leaf: 'b', conditions: [] },
    ]);
  });

  it('makes a leaf unconditional when any branch reaches it without conditions', () => {
    const tree = or(and(criterion('a'), criterion('C:x')), criterion('a'));
    expect(group(tree)).toEqual([{ leaf: 'a', conditions: [] }]);
  });

  it('dedupes repeated conditions and repeated branches', () => {
    const tree = or(
      and(criterion('a'), criterion('C:x'), criterion('C:x')),
      and(criterion('C:x'), criterion('a'))
    );
    expect(group(tree)).toEqual([{ leaf: 'a', conditions: [['x']] }]);
  });

  it('skips conjunctions with zero or several leaves', () => {
    const tree = or(criterion('C:x'), and(criterion('a'), criterion('b')));
    expect(group(tree)).toEqual([]);
    expect(skips).toEqual(['no_leaf', 'multiple_leaves']);
  });
});

describe('readOval', () => {
  const doc = `<?xml version="1.0" encoding="UTF-8"?>
<oval_definitions xmlns="http://oval.mitre.org/XMLSchema/oval-definitions-5" xmlns:oval="http://oval.mitre.org/XMLSchema/oval-common-5" xmlns:x="urn:x">
  <generator><oval:timestamp>2026-01-02T03:04:05</oval:timestamp></generator>
  <definitions>
    <definition id="d1"><metadata><title>Zażółć <![CDATA[gęślą]]></title><description>long prose</description></metadata></definition>
  </definitions>
  <tests><x:t id="t1"><x:object object_ref="o1"/></x:t></tests>
</oval_definitions>`;

  const collect = async (chunks: Iterable<Uint8Array | string>) => {
    const items: Array<[OvalSection, XmlNode]> = [];
    let timestamp: string | undefined;
    await readOval(chunks, {
      onItem: (section, item) => items.push([section, item]),
      onTimestamp: (ts) => {
        timestamp = ts;
      },
    });
    return { items, timestamp };
  };

  it('emits one tree per section item, strips prefixes and skips descriptions', async () => {
    const bytes = Buffer.from(doc, 'utf8');
    // 7-byte chunks split tags, attributes and multi-byte characters.
    const chunks: Uint8Array[] = [];
    for (let i = 0; i < bytes.length; i += 7) chunks.push(bytes.subarray(i, i + 7));
    const { items, timestamp } = await collect(chunks);

    expect(timestamp).toBe('2026-01-02T03:04:05');
    expect(items.map(([section, item]) => [section, item.name, item.attrs.id])).toEqual([
      ['definitions', 'definition', 'd1'],
      ['tests', 't', 't1'],
    ]);
    const metadata = items[0][1].children[0];
    expect(metadata.children.map((c) => [c.name, c.text])).toEqual([
      ['title', 'Zażółć gęślą'],
      ['description', ''],
    ]);
    expect(items[1][1].children[0]).toMatchObject({ name: 'object', attrs: { object_ref: 'o1' } });
  });

  it('rejects malformed XML', async () => {
    await expect(collect(['<oval_definitions><definitions></oval_definitions>'])).rejects.toThrow();
  });
});

describe('date and score helpers', () => {
  it('converts OVAL dates to ISO 8601 UTC', () => {
    expect(ovalPublicToIso('20230124')).toBe('2023-01-24T00:00:00Z');
    expect(ovalPublicToIso('20230124:1830')).toBe('2023-01-24T18:30:00Z');
    expect(ovalPublicToIso('2023-01-24')).toBeUndefined();
    expect(ovalTimestampToIso('2026-11-12T19:21:30')).toBe('2026-11-12T19:21:30Z');
    expect(ovalTimestampToIso('2026-11-12T19:21:30+02:00')).toBe('2026-11-12T19:21:30+02:00');
    expect(ovalTimestampToIso('yesterday')).toBeUndefined();
  });

  it('parses Red Hat score/vector pairs', () => {
    expect(parseSlashCvss('7.0/CVSS:3.1/AV:L/AC:H/PR:N/UI:R/S:U/C:H/I:H/A:H', '3.1')).toEqual({
      version: '3.1',
      score: 7,
      vector: 'CVSS:3.1/AV:L/AC:H/PR:N/UI:R/S:U/C:H/I:H/A:H',
    });
    expect(parseSlashCvss('4.3/AV:N/AC:M/Au:N/C:N/I:P/A:N', '2.0')?.version).toBe('2.0');
    expect(parseSlashCvss('n/a', '3.1')).toBeUndefined();
    expect(parseSlashCvss('/CVSS:3.1/AV:L/AC:H/PR:N/UI:R/S:U/C:H/I:H/A:H', '3.1')).toBeUndefined();
  });

  it('rejects a blank Ubuntu score instead of recording 0.0', () => {
    const vector = 'CVSS:3.1/AV:L/AC:L/PR:N/UI:R/S:U/C:H/I:H/A:H';
    expect(parseCvss('', vector, '3.1')).toBeUndefined();
    expect(parseCvss(' ', vector, '3.1')).toBeUndefined();
    expect(parseCvss('0.0', vector, '3.1')?.score).toBe(0);
  });
});
