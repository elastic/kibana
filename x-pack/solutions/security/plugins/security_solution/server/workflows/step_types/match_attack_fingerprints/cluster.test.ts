/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackSignals, StoredFingerprint } from './cluster';
import {
  alertOverlap,
  bestStoredFingerprint,
  chainSpan,
  clusterNewAttacks,
  disposition,
  entityMatch,
  fingerprintId,
  investigationIdFromAttackId,
  sameAttack,
  timeClose,
} from './cluster';

const attack = (overrides: Partial<AttackSignals> = {}): AttackSignals => ({
  attackId: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  alertIds: ['a1', 'a2'],
  title: 'Attack',
  summaryMarkdown: 'Summary',
  tactics: ['TA0008'],
  hostEntityIds: ['host-1'],
  userEntityIds: ['user-1'],
  firstAlertAt: '2026-10-21T10:00:00.000Z',
  lastAlertAt: '2026-10-21T10:30:00.000Z',
  ...overrides,
});

const stored = (overrides: Partial<StoredFingerprint> = {}): StoredFingerprint => ({
  id: 'fp-1',
  investigationId: '11111111-1111-8111-8111-111111111111',
  alertIds: ['a1', 'a2'],
  hostEntityIds: ['host-1'],
  userEntityIds: ['user-1'],
  tactics: ['TA0008'],
  firstAlertAt: '2026-10-21T10:00:00.000Z',
  lastAlertAt: '2026-10-21T10:30:00.000Z',
  expiresAt: '2026-10-22T10:30:00.000Z',
  ...overrides,
});

describe('alertOverlap', () => {
  it('returns true when two of four alerts are shared', () => {
    expect(alertOverlap(['a1', 'a2', 'a3', 'a4'], ['a1', 'a2'])).toBe(true);
  });

  it('returns false when a single alert is shared', () => {
    expect(alertOverlap(['a1', 'a2', 'a3', 'a4'], ['a1'])).toBe(false);
  });

  it('returns false when the shared alerts are under half the smaller set', () => {
    expect(alertOverlap(['a1', 'a2', 'a3', 'a4', 'a5'], ['a1', 'a2', 'b3', 'b4', 'b5'])).toBe(
      false
    );
  });
});

describe('timeClose', () => {
  it('returns true when the ranges overlap', () => {
    expect(
      timeClose(
        attack(),
        attack({
          firstAlertAt: '2026-10-21T10:15:00.000Z',
          lastAlertAt: '2026-10-21T11:00:00.000Z',
        })
      )
    ).toBe(true);
  });

  it('returns true when the next phase is several hours later', () => {
    expect(
      timeClose(
        attack({
          firstAlertAt: '2026-10-21T10:00:00.000Z',
          lastAlertAt: '2026-10-21T10:00:00.000Z',
        }),
        attack({
          firstAlertAt: '2026-10-21T18:00:00.000Z',
          lastAlertAt: '2026-10-21T18:00:00.000Z',
        })
      )
    ).toBe(true);
  });

  it('returns false when the gap is over 24 hours', () => {
    expect(
      timeClose(
        attack({
          firstAlertAt: '2026-10-21T10:00:00.000Z',
          lastAlertAt: '2026-10-21T10:00:00.000Z',
        }),
        attack({
          firstAlertAt: '2026-10-22T10:00:01.000Z',
          lastAlertAt: '2026-10-22T10:00:01.000Z',
        })
      )
    ).toBe(false);
  });

  it('returns false when a timestamp is missing', () => {
    expect(timeClose(attack({ firstAlertAt: undefined, lastAlertAt: undefined }), attack())).toBe(
      false
    );
  });
});

describe('entityMatch', () => {
  it('returns true when host, user, time, and tactic are shared', () => {
    expect(entityMatch(attack(), attack({ attackId: 'other' }), false)).toBe(true);
  });

  it('returns false across runs when only the host is shared', () => {
    expect(
      entityMatch(
        attack({ userEntityIds: [] }),
        attack({ userEntityIds: [], attackId: 'other' }),
        false
      )
    ).toBe(false);
  });

  it('returns true inside one run when only the host is shared', () => {
    expect(
      entityMatch(
        attack({ userEntityIds: [] }),
        attack({ userEntityIds: [], attackId: 'other' }),
        true
      )
    ).toBe(true);
  });

  it('returns false when both attacks have users and the users differ', () => {
    expect(
      entityMatch(
        attack({ userEntityIds: ['user-1'] }),
        attack({ userEntityIds: ['user-2'] }),
        true
      )
    ).toBe(false);
  });

  it('returns true when a later phase has different tactics and no shared alerts', () => {
    expect(
      entityMatch(
        attack({ tactics: ['TA0001'], alertIds: ['a1', 'a2'] }),
        attack({
          tactics: ['TA0010'],
          alertIds: ['c1', 'c2'],
          firstAlertAt: '2026-10-21T16:00:00.000Z',
          lastAlertAt: '2026-10-21T16:30:00.000Z',
        }),
        false
      )
    ).toBe(true);
  });

  it('returns true when one attack has no tactics', () => {
    expect(entityMatch(attack({ tactics: [] }), attack({ tactics: ['TA0008'] }), false)).toBe(true);
  });

  it('returns true when the same host and user were seen together', () => {
    expect(
      entityMatch(
        attack({ entityPairs: ['user-1@host-1'] }),
        attack({ entityPairs: ['user-1@host-1'], alertIds: ['c1', 'c2'] }),
        false
      )
    ).toBe(true);
  });

  it('returns false when the shared user is not the user on the shared pair', () => {
    expect(
      entityMatch(
        attack({
          hostEntityIds: ['h1', 'h2'],
          userEntityIds: ['Administrator@h1', 'bob'],
          entityPairs: ['Administrator@h1', 'bob@h2'],
        }),
        attack({
          hostEntityIds: ['h1', 'h3'],
          userEntityIds: ['Administrator', 'bob'],
          entityPairs: ['Administrator@h1', 'bob@h3'],
          alertIds: ['c1', 'c2'],
        }),
        false
      )
    ).toBe(false);
  });

  it('returns true when a shared user was seen on a shared pair', () => {
    expect(
      entityMatch(
        attack({
          hostEntityIds: ['h1', 'h2'],
          userEntityIds: ['Administrator@h1', 'bob'],
          entityPairs: ['Administrator@h1', 'bob@h2'],
        }),
        attack({
          hostEntityIds: ['h1', 'h2'],
          userEntityIds: ['Administrator', 'bob'],
          entityPairs: ['Administrator@h1', 'bob@h2'],
          alertIds: ['c1', 'c2'],
        }),
        false
      )
    ).toBe(true);
  });

  it('returns false when a local user and a directory user share only the raw name', () => {
    expect(
      entityMatch(
        attack({
          hostEntityIds: ['SRVWIN01'],
          userEntityIds: ['Administrator@SRVWIN01'],
          entityPairs: ['Administrator@SRVWIN01'],
        }),
        attack({
          hostEntityIds: ['SRVWIN01'],
          userEntityIds: ['Administrator'],
          entityPairs: ['Administrator@SRVWIN01'],
          alertIds: ['c1', 'c2'],
        }),
        false
      )
    ).toBe(false);
  });

  it('returns false when the shared host and user were not seen together', () => {
    expect(
      entityMatch(
        attack({
          hostEntityIds: ['repro-host-8a', 'repro-host-8b'],
          userEntityIds: ['deploy', 'root'],
          entityPairs: ['root@repro-host-8a', 'deploy@repro-host-8b'],
          alertIds: ['x1', 'x2'],
        }),
        attack({
          hostEntityIds: ['repro-host-8b'],
          userEntityIds: ['root'],
          entityPairs: ['root@repro-host-8b'],
          alertIds: ['y1'],
          tactics: ['TA0003'],
        }),
        false
      )
    ).toBe(false);
  });
});

describe('sameAttack', () => {
  it('returns true on alert overlap when the tactics differ', () => {
    expect(
      sameAttack(
        attack({ tactics: ['TA0001'], hostEntityIds: [], userEntityIds: [] }),
        attack({
          tactics: ['TA0008'],
          hostEntityIds: [],
          userEntityIds: [],
          alertIds: ['a1', 'a2'],
        }),
        false
      )
    ).toBe(true);
  });

  it('returns false when nothing but the title would match', () => {
    expect(
      sameAttack(
        attack({ alertIds: ['a1'], hostEntityIds: [], userEntityIds: [], tactics: [] }),
        attack({ alertIds: ['b1'], hostEntityIds: [], userEntityIds: [], tactics: [] }),
        false
      )
    ).toBe(false);
  });
});

describe('clusterNewAttacks', () => {
  it('returns the earliest attack as the canonical member', () => {
    const later = attack({
      attackId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      firstAlertAt: '2026-10-21T10:20:00.000Z',
      alertIds: ['a2', 'a3'],
    });
    const earlier = attack({
      attackId: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      firstAlertAt: '2026-10-21T10:00:00.000Z',
      alertIds: ['a1', 'a2'],
    });

    expect(clusterNewAttacks([later, earlier])[0][0].attackId).toBe(earlier.attackId);
  });

  it('returns one group when two phases share only a built-in account', () => {
    const first = attack({
      alertIds: ['a1'],
      userEntityIds: ['SYSTEM'],
      entityPairs: ['SYSTEM@host-1'],
      tactics: ['TA0002'],
    });
    const second = attack({
      attackId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      alertIds: ['b1'],
      userEntityIds: ['SYSTEM'],
      entityPairs: ['SYSTEM@host-1'],
      tactics: ['TA0040'],
      firstAlertAt: '2026-10-21T18:00:00.000Z',
    });

    expect(clusterNewAttacks([first, second])).toHaveLength(1);
  });

  it('returns one group for a same-run host with no user', () => {
    const first = attack({
      attackId: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      userEntityIds: [],
      alertIds: ['a1'],
    });
    const second = attack({
      attackId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      userEntityIds: [],
      alertIds: ['b1'],
      firstAlertAt: '2026-10-21T10:10:00.000Z',
    });

    expect(clusterNewAttacks([second, first])).toHaveLength(1);
  });

  it('returns separate groups when only the host is shared and the users differ', () => {
    const first = attack({ alertIds: ['a1'], userEntityIds: ['user-1'] });
    const second = attack({
      attackId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      alertIds: ['b1'],
      userEntityIds: ['user-2'],
    });

    expect(clusterNewAttacks([first, second])).toHaveLength(2);
  });

  it('returns one group for phases with separate alerts and different tactics', () => {
    const initial = attack({
      attackId: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      alertIds: ['a1', 'a2'],
      tactics: ['TA0001'],
      firstAlertAt: '2026-10-21T10:00:00.000Z',
      lastAlertAt: '2026-10-21T10:20:00.000Z',
    });
    const middle = attack({
      attackId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      alertIds: ['b1', 'b2'],
      tactics: ['TA0008'],
      firstAlertAt: '2026-10-22T01:00:00.000Z',
      lastAlertAt: '2026-10-22T01:20:00.000Z',
    });
    const later = attack({
      attackId: 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
      alertIds: ['c1', 'c2'],
      tactics: ['TA0010'],
      firstAlertAt: '2026-10-22T16:00:00.000Z',
      lastAlertAt: '2026-10-22T16:20:00.000Z',
    });

    const groups = clusterNewAttacks([later, initial, middle]);

    expect(groups[0]?.map((member) => member.attackId)).toEqual([
      initial.attackId,
      middle.attackId,
      later.attackId,
    ]);
  });

  it('returns one group when the same host and user repeat the attack with new alerts', () => {
    const first = attack({ alertIds: ['a1', 'a2'], firstAlertAt: '2026-10-21T10:00:00.000Z' });
    const repeat = attack({
      attackId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      alertIds: ['r1', 'r2'],
      firstAlertAt: '2026-10-21T22:00:00.000Z',
      lastAlertAt: '2026-10-21T22:30:00.000Z',
    });

    expect(clusterNewAttacks([repeat, first])).toHaveLength(1);
  });

  it('merges every group a later attack matches', () => {
    const at = '2026-10-21T10:00:00.000Z';
    const left = attack({
      attackId: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      alertIds: ['1', '2'],
      hostEntityIds: [],
      userEntityIds: [],
      firstAlertAt: at,
      lastAlertAt: at,
    });
    const right = attack({
      attackId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      alertIds: ['3', '4'],
      hostEntityIds: [],
      userEntityIds: [],
      firstAlertAt: at,
      lastAlertAt: at,
    });
    const bridge = attack({
      attackId: 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
      alertIds: ['1', '2', '3', '4'],
      hostEntityIds: [],
      userEntityIds: [],
      firstAlertAt: at,
      lastAlertAt: at,
    });

    const groups = clusterNewAttacks([right, bridge, left]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.map((member) => member.attackId)).toEqual([
      left.attackId,
      right.attackId,
      bridge.attackId,
    ]);
  });

  it('returns separate groups when the next repeat is more than 24 hours later', () => {
    const first = attack({
      alertIds: ['a1', 'a2'],
      firstAlertAt: '2026-10-21T10:00:00.000Z',
      lastAlertAt: '2026-10-21T10:00:00.000Z',
    });
    const repeat = attack({
      attackId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      alertIds: ['r1', 'r2'],
      firstAlertAt: '2026-10-22T10:00:01.000Z',
      lastAlertAt: '2026-10-22T10:30:00.000Z',
    });

    expect(clusterNewAttacks([first, repeat])).toHaveLength(2);
  });
});

describe('investigationIdFromAttackId', () => {
  it('returns the UUIDv8 slice the review workflow derives', () => {
    expect(
      investigationIdFromAttackId(
        '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
      )
    ).toBe('01234567-89ab-8cde-8f01-23456789abcd');
  });
});

describe('fingerprintId', () => {
  it('returns the same id for the same entities, tactics, and hour', () => {
    const left = attack({
      attackId: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    });
    const right = attack({
      attackId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      alertIds: ['z1', 'z2'],
    });

    expect(fingerprintId('default', left)).toBe(fingerprintId('default', right));
  });

  it('returns a different id when the canonical key is already taken', () => {
    const attackSignals = attack();

    expect(fingerprintId('default', attackSignals, 'new-investigation')).not.toBe(
      fingerprintId('default', attackSignals)
    );
  });

  it('returns different ids when neither attack has a host or a user', () => {
    const left = attack({ hostEntityIds: [], userEntityIds: [], attackId: 'attack-a' });
    const right = attack({ hostEntityIds: [], userEntityIds: [], attackId: 'attack-b' });

    expect(fingerprintId('default', left)).not.toBe(fingerprintId('default', right));
  });
});

describe('disposition', () => {
  const canonical = attack();

  it('returns review when nothing is stored', () => {
    expect(disposition(canonical, undefined, undefined).kind).toBe('review');
  });

  it('returns attach for a closed false positive that still shares alerts', () => {
    expect(
      disposition(canonical, stored(), { status: 'closed', closeReason: 'false_positive' }).kind
    ).toBe('attach');
  });

  it('returns review_linked for a closed false positive with no shared alerts', () => {
    const decision = disposition(
      attack({ alertIds: ['c1', 'c2'] }),
      stored({ alertIds: ['a1', 'a2'] }),
      { status: 'closed', closeReason: 'false_positive' }
    );

    expect(decision.kind).toBe('review_linked');
  });

  it('names a closed false positive as the link reason', () => {
    const decision = disposition(
      attack({ alertIds: ['c1', 'c2'] }),
      stored({ alertIds: ['a1', 'a2'] }),
      { status: 'closed', closeReason: 'false_positive' }
    );

    expect(decision.relatedLinkReason).toBe('false_positive');
  });

  it('returns the closed investigation id as the related id', () => {
    const decision = disposition(
      attack({ alertIds: ['c1', 'c2'] }),
      stored({ alertIds: ['a1', 'a2'], investigationId: 'closed-fp' }),
      { status: 'closed', closeReason: 'false_positive' }
    );

    expect(decision.relatedInvestigationId).toBe('closed-fp');
  });

  it('keeps a stored match when the group union falls under the overlap ratio', () => {
    const phase = attack({
      alertIds: ['a', 'b'],
      hostEntityIds: [],
      userEntityIds: [],
    });
    const sibling = attack({
      attackId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      alertIds: ['a', 'b', 'x', 'y', 'z'],
      hostEntityIds: [],
      userEntityIds: [],
    });
    const storedFingerprint = stored({
      alertIds: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'],
      hostEntityIds: ['other-host'],
      userEntityIds: ['other-user'],
    });

    const decision = disposition(
      chainSpan([phase, sibling]),
      storedFingerprint,
      { status: 'open', verdict: '' },
      [phase, sibling]
    );

    expect(decision.kind).toBe('attach');
  });

  it('returns a new review when the matched Investigation cannot be read', () => {
    const decision = disposition(canonical, stored(), undefined);

    expect(decision.kind).toBe('review');
    expect(decision.investigationId).toBe(investigationIdFromAttackId(canonical.attackId));
  });

  it('attaches when the unread Investigation was written moments ago', () => {
    const now = new Date('2026-10-21T12:00:00.000Z');
    const decision = disposition(
      canonical,
      stored({ writtenAt: now.toISOString() }),
      undefined,
      [canonical],
      now
    );

    expect(decision.kind).toBe('attach');
    expect(decision.investigationId).toBe('11111111-1111-8111-8111-111111111111');
    expect(decision.tagCorrelatedAlerts).toBe(false);
  });

  it('returns a new review when the unread Investigation is no longer pending', () => {
    const now = new Date('2026-10-21T12:00:00.000Z');
    const decision = disposition(
      canonical,
      stored({ writtenAt: '2026-10-21T10:00:00.000Z' }),
      undefined,
      [canonical],
      now
    );

    expect(decision.kind).toBe('review');
  });

  it('returns attach and tags an open in-analysis investigation', () => {
    const decision = disposition(canonical, stored(), { status: 'open', verdict: 'In analysis' });

    expect(decision.tagCorrelatedAlerts).toBe(true);
  });

  it('returns attach and tags a handed-off investigation', () => {
    const decision = disposition(canonical, stored(), {
      status: 'open',
      verdict: 'Handed off to Forensics Watch',
    });

    expect(decision.tagCorrelatedAlerts).toBe(true);
  });

  it('returns a retirement journal for a handed-off true positive or inconclusive', () => {
    const decision = disposition(canonical, stored(), {
      status: 'open',
      verdict: 'Handed off to Forensics Watch',
    });

    expect(decision.journalAlertsRetired).toBe(true);
  });

  it('returns attach and tags a declined close', () => {
    const decision = disposition(canonical, stored(), { status: 'closed', closeReason: 'other' });

    expect(decision.tagCorrelatedAlerts).toBe(true);
  });

  it('returns no retirement journal for a declined close', () => {
    const decision = disposition(canonical, stored(), {
      status: 'closed',
      closeReason: 'other',
      verdict: 'Escalation declined by an analyst',
    });

    expect(decision.journalAlertsRetired).toBe(false);
  });

  it('returns attach and tags a close that has no close reason', () => {
    const decision = disposition(canonical, stored(), { status: 'closed' });

    expect(decision.tagCorrelatedAlerts).toBe(true);
  });

  it('reviews a later attack that shares only SYSTEM on the same host', () => {
    const later = attack({
      attackId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      alertIds: ['b1'],
      userEntityIds: ['SYSTEM'],
      entityPairs: ['SYSTEM@host-1'],
      tactics: ['TA0040'],
    });
    const decision = disposition(
      later,
      stored({
        alertIds: ['a1', 'a2'],
        userEntityIds: ['SYSTEM'],
        entityPairs: ['SYSTEM@host-1'],
        tactics: ['TA0002'],
        investigationId: 'open-system',
      }),
      { status: 'open', verdict: 'In analysis' },
      [later]
    );

    expect(decision).toEqual(
      expect.objectContaining({
        kind: 'review_linked',
        relatedInvestigationId: 'open-system',
        relatedLinkReason: 'builtin_account',
      })
    );
  });

  it('reviews a later attack that shares only a local Administrator', () => {
    const later = attack({
      alertIds: ['b1'],
      userEntityIds: ['Administrator@host-1'],
      entityPairs: ['Administrator@host-1'],
    });
    const decision = disposition(
      later,
      stored({
        alertIds: ['a1', 'a2'],
        userEntityIds: ['Administrator@host-1'],
        entityPairs: ['Administrator@host-1'],
      }),
      { status: 'open', verdict: '' },
      [later]
    );

    expect(decision.kind).toBe('review_linked');
  });

  it('reviews a later attack that shares only root', () => {
    const later = attack({
      alertIds: ['b1'],
      userEntityIds: ['root'],
      entityPairs: ['root@host-1'],
    });
    const decision = disposition(
      later,
      stored({
        alertIds: ['a1', 'a2'],
        userEntityIds: ['root'],
        entityPairs: ['root@host-1'],
      }),
      { status: 'open', verdict: '' },
      [later]
    );

    expect(decision.kind).toBe('review_linked');
  });

  it('reviews a later attack that shares NT AUTHORITY\\SYSTEM', () => {
    const later = attack({
      alertIds: ['b1'],
      userEntityIds: ['NT AUTHORITY\\SYSTEM'],
      entityPairs: ['NT AUTHORITY\\SYSTEM@host-1'],
    });
    const decision = disposition(
      later,
      stored({
        alertIds: ['a1', 'a2'],
        userEntityIds: ['NT AUTHORITY\\SYSTEM'],
        entityPairs: ['NT AUTHORITY\\SYSTEM@host-1'],
      }),
      { status: 'open', verdict: '' },
      [later]
    );

    expect(decision.relatedLinkReason).toBe('builtin_account');
  });

  it('attaches when a built-in account also shares alerts', () => {
    const later = attack({
      alertIds: ['a1', 'a2'],
      userEntityIds: ['SYSTEM'],
      entityPairs: ['SYSTEM@host-1'],
    });
    const decision = disposition(
      later,
      stored({
        alertIds: ['a1', 'a2'],
        userEntityIds: ['SYSTEM'],
        entityPairs: ['SYSTEM@host-1'],
      }),
      { status: 'open', verdict: '' },
      [later]
    );

    expect(decision.kind).toBe('attach');
  });

  it('attaches when a named user is shared alongside a built-in account', () => {
    const later = attack({
      alertIds: ['b1'],
      userEntityIds: ['SYSTEM', 'bob'],
      entityPairs: ['SYSTEM@host-1', 'bob@host-1'],
    });
    const decision = disposition(
      later,
      stored({
        alertIds: ['a1', 'a2'],
        userEntityIds: ['SYSTEM', 'bob'],
        entityPairs: ['SYSTEM@host-1', 'bob@host-1'],
      }),
      { status: 'open', verdict: '' },
      [later]
    );

    expect(decision.kind).toBe('attach');
  });

  it('reviews a built-in match while the earlier Investigation is still pending', () => {
    const now = new Date('2026-10-21T12:00:00.000Z');
    const later = attack({
      alertIds: ['b1'],
      userEntityIds: ['SYSTEM'],
      entityPairs: ['SYSTEM@host-1'],
    });
    const decision = disposition(
      later,
      stored({
        alertIds: ['a1', 'a2'],
        userEntityIds: ['SYSTEM'],
        entityPairs: ['SYSTEM@host-1'],
        writtenAt: now.toISOString(),
        investigationId: 'pending-system',
      }),
      undefined,
      [later],
      now
    );

    expect(decision).toEqual(
      expect.objectContaining({
        kind: 'review_linked',
        relatedInvestigationId: 'pending-system',
        relatedLinkReason: 'builtin_account',
      })
    );
  });

  it('keeps the false-positive sentence when a built-in match is a closed false positive', () => {
    const later = attack({
      alertIds: ['b1'],
      userEntityIds: ['SYSTEM'],
      entityPairs: ['SYSTEM@host-1'],
    });
    const decision = disposition(
      later,
      stored({
        alertIds: ['a1', 'a2'],
        userEntityIds: ['SYSTEM'],
        entityPairs: ['SYSTEM@host-1'],
      }),
      { status: 'closed', closeReason: 'false_positive' },
      [later]
    );

    expect(decision.relatedLinkReason).toBe('false_positive');
  });

  it('returns a plain review when a built-in match has no readable Investigation', () => {
    const now = new Date('2026-10-21T12:00:00.000Z');
    const later = attack({
      alertIds: ['b1'],
      userEntityIds: ['SYSTEM'],
      entityPairs: ['SYSTEM@host-1'],
    });
    const decision = disposition(
      later,
      stored({
        alertIds: ['a1', 'a2'],
        userEntityIds: ['SYSTEM'],
        entityPairs: ['SYSTEM@host-1'],
        writtenAt: '2026-10-21T10:00:00.000Z',
      }),
      undefined,
      [later],
      now
    );

    expect(decision.kind).toBe('review');
  });

  it('returns attach and does not tag a false-positive close', () => {
    const decision = disposition(canonical, stored(), {
      status: 'closed',
      closeReason: 'false_positive',
    });

    expect(decision.tagCorrelatedAlerts).toBe(false);
  });
});

describe('bestStoredFingerprint', () => {
  it('returns the stored fingerprint with the larger alert overlap', () => {
    const winner = stored({ id: 'more', alertIds: ['a1', 'a2', 'a3'] });
    const loser = stored({
      id: 'less',
      alertIds: ['a1', 'a2'],
      hostEntityIds: ['host-9'],
      userEntityIds: ['user-9'],
    });

    expect(
      bestStoredFingerprint(attack({ alertIds: ['a1', 'a2', 'a3', 'a4'] }), [loser, winner])?.id
    ).toBe('more');
  });

  it('returns undefined when a cross-run host-only fingerprint is the only hit', () => {
    expect(
      bestStoredFingerprint(attack({ alertIds: ['c1'], userEntityIds: [] }), [
        stored({ alertIds: ['a1'], userEntityIds: [] }),
      ])
    ).toBeUndefined();
  });
});
