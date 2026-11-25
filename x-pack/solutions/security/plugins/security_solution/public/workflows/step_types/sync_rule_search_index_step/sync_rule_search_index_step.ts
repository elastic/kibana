/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createPublicStepDefinition } from '@kbn/workflows-extensions/public';
import { syncRuleSearchIndexStepCommonDefinition } from '../../../../common/workflows/step_types/sync_rule_search_index_step/sync_rule_search_index_step_common';

export const syncRuleSearchIndexStepDefinition = createPublicStepDefinition({
  ...syncRuleSearchIndexStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/sparkles').then(({ icon }) => ({
      default: icon,
    }))
  ),
});
