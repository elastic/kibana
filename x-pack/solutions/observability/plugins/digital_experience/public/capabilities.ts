/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Capabilities } from '@kbn/core/public';
import type { UxPluginStart } from '@kbn/ux-plugin/public';
import { DIGITAL_EXPERIENCE_FEATURE_ID } from '../common/feature';

/**
 * Also requires the ux plugin and APM access because the Classic RUM data is read through them;
 * drop both checks (and the feature's `privilegesTooltip`) once Digital Experience no longer reads
 * Classic RUM.
 */
export const hasDigitalExperienceAccess = (
  capabilities: Capabilities,
  ux: UxPluginStart | undefined
): ux is UxPluginStart =>
  Boolean(ux && capabilities[DIGITAL_EXPERIENCE_FEATURE_ID]?.show && capabilities.apm?.show);
