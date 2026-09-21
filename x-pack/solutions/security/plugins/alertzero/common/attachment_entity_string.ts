/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Canonical entity string shapes Hunt Watch writers may put on SSE `entities[]`.
 * Bare identifiers (e.g. `dev-user`) are rejected so the UI never has to guess a kind.
 *
 * Allowed:
 * - ECS-prefixed: `user.name: jdoe`, `host.name: srv-01`, …
 * - EUID wrappers: `entity:user:…`, `entity:host:…`, `entity:service:…`, `entity:generic:…`
 *   (also short `user:…` / `host:…` / `service:…`)
 * - AWS IAM ARNs: `arn:aws:iam::123456789012:user/dev-user`
 */
const ECS_PREFIXED =
  /^(user\.name|user\.email|user\.id|host\.name|host\.hostname|host\.id|service\.name|service\.id):\s*.+$/i;

const EUID_WRAPPED =
  /^(entity:(user|host|service|generic)|user|host|service):.+$/i;

const AWS_IAM_ARN = /^arn:aws:iam::\d+:(user|role|group)\/.+$/i;

export const isTypedAttachmentEntityString = (value: string): boolean => {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }
  return ECS_PREFIXED.test(trimmed) || EUID_WRAPPED.test(trimmed) || AWS_IAM_ARN.test(trimmed);
};
