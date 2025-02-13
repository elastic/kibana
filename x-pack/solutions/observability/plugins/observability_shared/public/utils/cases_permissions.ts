/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const noCasesPermissions = () => ({
  all: false,
  create: false,
  read: false,
  update: false,
  delete: false,
  push: false,
  connectors: false,
  settings: false,
  createComment: false,
  reopenCase: false,
  assign: false,
});

export const allCasesPermissions = () => ({
  all: true,
  create: true,
  read: true,
  update: true,
  delete: true,
  push: true,
  connectors: true,
  settings: true,
  createComment: true,
  reopenCase: true,
  assign: true,
});
