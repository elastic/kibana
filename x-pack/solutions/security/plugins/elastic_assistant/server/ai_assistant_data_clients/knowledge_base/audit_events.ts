/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EcsEvent } from '@kbn/core/server';
import type { AuditEvent } from '@kbn/security-plugin/server';
import type { ArrayElement } from '@kbn/utility-types';

export enum AUDIT_TYPE {
  CHANGE = 'change',
  DELETION = 'deletion',
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

export enum KnowledgeBaseAuditAction {
  CREATE = 'knowledge_base_entry_create',
  UPDATE = 'knowledge_base_entry_update',
  DELETE = 'knowledge_base_entry_delete',
}

type VerbsTuple = [string, string, string];
const knowledgeBaseEventVerbs: Record<KnowledgeBaseAuditAction, VerbsTuple> = {
  knowledge_base_entry_create: ['create', 'creating', 'created'],
  knowledge_base_entry_update: ['update', 'updating', 'updated'],
  knowledge_base_entry_delete: ['delete', 'deleting', 'deleted'],
};

const knowledgeBaseEventTypes: Record<KnowledgeBaseAuditAction, ArrayElement<EcsEvent['type']>> = {
  knowledge_base_entry_create: AUDIT_TYPE.CREATION,
  knowledge_base_entry_update: AUDIT_TYPE.CHANGE,
  knowledge_base_entry_delete: AUDIT_TYPE.DELETION,
};

export interface KnowledgeBaseAuditEventParams {
  action: KnowledgeBaseAuditAction;
  error?: Error;
  id?: string;
  name?: string;
  outcome?: EcsEvent['outcome'];
}

export function knowledgeBaseAuditEvent({
  action,
  error,
  id,
  name,
  outcome,
}: KnowledgeBaseAuditEventParams): AuditEvent {
  let doc = 'a knowledge base entry';
  if (id && name) {
    doc = `knowledge base entry [id=${id}, name="${name}"]`;
  } else if (id) {
    doc = `knowledge base entry [id=${id}]`;
  } else if (name) {
    doc = `knowledge base entry [name="${name}"]`;
  }
  const [present, progressive, past] = knowledgeBaseEventVerbs[action];
  const message = error
    ? `Failed attempt to ${present} ${doc}`
    : outcome === 'unknown'
    ? `User is ${progressive} ${doc}`
    : `User has ${past} ${doc}`;
  const type = knowledgeBaseEventTypes[action];

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
