/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PND_GATE_REGISTRY } from '@kbn/pnd-common';
import type { PndConversation } from '@kbn/pnd-common';

import { gateLabel } from '../../../watches/translations';
import { THREAD_GATE_LABEL } from '../../translations';
import { mockConversations, mockThreadConversations } from '../../mock/conversations';
import { describeThreadGate } from '.';

const threadFor = (gateId: PndConversation['gateId']): PndConversation => {
  const thread = mockThreadConversations.find((conversation) => conversation.gateId === gateId);

  if (thread == null) {
    throw new Error(`no thread fixture for gate ${gateId}`);
  }

  return thread;
};

describe('describeThreadGate', () => {
  it('names the gate a thread is paired with', () => {
    expect(describeThreadGate(threadFor('apply_tuning'))).toEqual('Apply a rule tuning');
  });

  it.each([...PND_GATE_REGISTRY])('describes the $gateId thread', ({ gateId }) => {
    expect(describeThreadGate(threadFor(gateId))).toEqual(THREAD_GATE_LABEL[gateId]);
  });

  it.each([...mockConversations])(
    'describes no gate for the alert-keyed $kind conversation, which has none',
    (conversation) => {
      expect(describeThreadGate(conversation)).toBeUndefined();
    }
  );

  it('describes no gate for a thread the server sent without one', () => {
    const { correlationId, createdAt, id, kind, title, updatedAt } = threadFor('apply_tuning');

    expect(
      describeThreadGate({ correlationId, createdAt, id, kind, title, updatedAt })
    ).toBeUndefined();
  });

  it('describes no gate for a gate this UI does not have in its registry', () => {
    // Cast: the contract's `gateId` is a closed enum, so only a server ahead of this browser
    // can produce a gate the registry has never heard of. It must read as "no gate" rather
    // than as a label invented from the id.
    const unregistered = {
      ...threadFor('apply_tuning'),
      gateId: 'await_apply_tuning' as PndConversation['gateId'],
    };

    expect(describeThreadGate(unregistered)).toBeUndefined();
  });

  it('describes no gate for a conversation whose kind the browser does not know', () => {
    const unknownKind = {
      ...threadFor('apply_tuning'),
      kind: 'containment' as PndConversation['kind'],
    };

    expect(describeThreadGate(unknownKind)).toBeUndefined();
  });

  /**
   * The `KIND_PILL_COLOR` / `CONVERSATION_CATEGORY_COLORS` precedent: copy that must not drift is
   * duplicated
   * where it is used and pinned by a test, rather than imported across a layer that should not
   * depend on the other. A thread row and the autonomy control name the same four decisions, so
   * a change to one wording without the other is a bug in whichever was left behind.
   */
  it.each([...PND_GATE_REGISTRY])(
    'labels the $gateId gate exactly as the autonomy control does',
    ({ gateId }) => {
      expect(THREAD_GATE_LABEL[gateId]).toEqual(gateLabel(gateId));
    }
  );
});
