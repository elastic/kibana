/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { Automation, CreateAutomationBody } from '../hooks/use_automations';

export const toCloneRequestBody = ({
  name,
  description,
  tags,
  automationType,
  trigger,
  execution,
  completion,
  runtime,
}: Automation): CreateAutomationBody => ({
  name: i18n.translate('xpack.nightshift.automations.cloneName', {
    defaultMessage: '{name} (copy)',
    values: { name },
  }),
  description,
  tags,
  isEnabled: false,
  automationType,
  trigger,
  execution,
  completion,
  runtime,
});
