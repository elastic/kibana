/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createPublicStepDefinition } from '@kbn/workflows-extensions/public';
import { setAttackTagsStepCommonDefinition } from '../../../../common/workflows/step_types/set_attack_tags_step/set_attack_tags_step_common';
import { alertTagsInputEditorHandlers } from '../common/alert_tags_selection_handler';

export const setAttackTagsStepDefinition = createPublicStepDefinition({
  ...setAttackTagsStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/app_security').then(({ icon }) => ({
      default: icon,
    }))
  ),
  editorHandlers: alertTagsInputEditorHandlers,
});
