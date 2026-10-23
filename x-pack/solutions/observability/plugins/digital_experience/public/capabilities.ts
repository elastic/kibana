/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Capabilities } from '@kbn/core/public';
import { DIGITAL_EXPERIENCE_FEATURE_ID } from '../common/feature';

/**
 * Also requires APM access because the Classic RUM data is read through its routes; drop that check
 * (and the feature's `privilegesTooltip`) once Digital Experience no longer reads Classic RUM.
 */
export const hasDigitalExperienceAccess = (capabilities: Capabilities): boolean =>
  Boolean(capabilities[DIGITAL_EXPERIENCE_FEATURE_ID]?.show && capabilities.apm?.show);
