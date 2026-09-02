/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The entity use_case_permission module is now a thin re-export of the shared
 * `useCanAttachToCase` hook. Tests live with the implementation:
 * x-pack/solutions/security/plugins/security_solution/public/cases/attachments/hooks/use_can_attach_to_case.test.ts
 */
it('see use_can_attach_to_case.test.ts for coverage', () => {
  expect(true).toBe(true);
});
