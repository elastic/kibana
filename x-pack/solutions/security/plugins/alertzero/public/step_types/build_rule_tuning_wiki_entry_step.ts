/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createPublicStepDefinition } from '@kbn/workflows-extensions/public';
import { buildRuleTuningWikiEntryStepCommonDefinition } from '../../common/step_types/build_rule_tuning_wiki_entry_step';

export const buildRuleTuningWikiEntryPublicStepDefinition = createPublicStepDefinition({
  ...buildRuleTuningWikiEntryStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/document').then(({ icon }) => ({
      default: icon,
    }))
  ),
});
