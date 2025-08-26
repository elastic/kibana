/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EcsEvent } from '@kbn/core/server';
import type { User } from '@kbn/elastic-assistant-common';
import type { AuditEvent } from '@kbn/security-plugin/server';
import type { ArrayElement } from '@kbn/utility-types';

export enum AUDIT_TYPE {
  CHANGE = 'change',
  ACCESS = 'access',
  CREATION = 'creation',
}

export enum AUDIT_CATEGORY {
  AUTHENTICATION = 'authentication',
  DATABASE = 'database',
  WEB = 'web',
}

export enum AUDIT_OUTCOME {
  FAILURE = 'failure',
  SUCCESS = 'success',
  UNKNOWN = 'unknown',
}

export enum ConversationAuditAction {
  SHARED = 'security_assistant_conversation_shared',
  PRIVATE = 'security_assistant_conversation_private',
}

type VerbsTuple = [string, string, string];
const conversationEventVerbs: Record<ConversationAuditAction, VerbsTuple> = {
  [ConversationAuditAction.SHARED]: ['share', 'sharing', 'shared'],
  [ConversationAuditAction.PRIVATE]: ['make private', 'making private', 'made private'],
};

const conversationEventTypes: Record<ConversationAuditAction, ArrayElement<EcsEvent['type']>> = {
  [ConversationAuditAction.SHARED]: AUDIT_TYPE.CHANGE,
  [ConversationAuditAction.PRIVATE]: AUDIT_TYPE.CHANGE,
};

export interface ConversationAuditEventParams {
  action: ConversationAuditAction;
  error?: Error;
  id?: string;
  title?: string;
  users?: User[];
  outcome?: EcsEvent['outcome'];
}

export function conversationAuditEvent({
  action,
  error,
  id,
  title,
  outcome,
  users,
}: ConversationAuditEventParams): AuditEvent {
  let doc = 'a conversation';
  if (id && title) {
    doc = `conversation [id=${id}, title="${title}"]`;
  } else if (id) {
    doc = `conversation [id=${id}]`;
  } else if (title) {
    doc = `conversation [title="${title}"]`;
  }
  const [present, progressive, past] = conversationEventVerbs[action];

  let message = error
    ? `Failed attempt to ${present} ${doc}`
    : outcome === 'unknown'
    ? `User is ${progressive} ${doc}`
    : `User has ${past} ${doc}`;
  if (action === ConversationAuditAction.SHARED && users) {
    const usersMessage =
      users.length > 0
        ? ` to user${users.length > 1 ? 's' : ''} (${users
            .map((u: User) => formatUserAsString(u))
            .join(', ')})`
        : ' to all users in the space';
    message = `${message}${usersMessage}`;
  }
  const type = conversationEventTypes[action];

  return {
    message,
    event: {
      action,
      category: [AUDIT_CATEGORY.DATABASE],
      type: type ? [type] : undefined,
      outcome: error ? AUDIT_OUTCOME.FAILURE : outcome ?? AUDIT_OUTCOME.SUCCESS,
    },
    error: error && {
      code: error.name,
      message: error.message,
    },
  };
}

const formatUserAsString = (user: User): string => {
  if (user.name && user.id) {
    return `[id=${user.id}, name=${user.name}]`;
  }
  if (user.name) {
    return `[name=${user.name}]`;
  }
  if (user.id) {
    return `[id=${user.id}]`;
  }
  return '';
};
