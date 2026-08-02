/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { PND_FEATURE_ID } from '@kbn/pnd-common';

/**
 * The `ui` capability the `pnd_manage_autonomy` sub-feature privilege grants
 * (`pnd/server/plugin.ts`, `ui: ['manageAutonomy']`).
 *
 * Declared here rather than imported because `@kbn/pnd-common` has no constant
 * for it yet, and that package is another group's territory in this epic. It
 * belongs there next to `PND_MANAGE_AUTONOMY_PRIVILEGE_ID`.
 */
export const MANAGE_AUTONOMY_UI_CAPABILITY = 'manageAutonomy' as const;

/**
 * Whether this user may change a watch's autonomy level.
 *
 * `pnd_manage_autonomy` is `includeIn: 'none'` and is **not** folded into PND
 * `all`, so it has to be granted deliberately — most users legitimately see the
 * dial read-only. Fail-closed on every unknown shape: a missing `application`
 * service, a missing `pnd` capability block, or anything that is not literally
 * `true` denies the write, so the dial can never unlock by accident.
 */
export const useCanManageAutonomy = (): boolean => {
  const { services } = useKibana<{ application?: ApplicationStart }>();

  return (
    services.application?.capabilities?.[PND_FEATURE_ID]?.[MANAGE_AUTONOMY_UI_CAPABILITY] === true
  );
};
