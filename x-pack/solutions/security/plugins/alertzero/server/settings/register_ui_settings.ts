/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. See the Elastic License 2.0 (ELv2)
 * or the Server Side Public License (SSPLv1) for more details.
 */
import type { CoreSetup } from '@kbn/core/server';
import { alertzeroAdvancedSettings } from './advanced_settings';

/** Registers AlertZero's per-space advanced settings (`alertzero:enabled`). */
export const registerAlertZeroUiSettings = (coreSetup: CoreSetup): void => {
  coreSetup.uiSettings.register(alertzeroAdvancedSettings);
};
