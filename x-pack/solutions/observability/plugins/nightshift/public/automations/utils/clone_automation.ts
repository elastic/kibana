/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { Automation, CreateAutomationBody } from '../hooks/use_automations';

const getCopyName = (name: string, existingNames: string[]): string => {
  const taken = new Set(existingNames);
  const first = i18n.translate('xpack.nightshift.automations.cloneName', {
    defaultMessage: '{name} (copy)',
    values: { name },
  });
  if (!taken.has(first)) return first;
  for (let copy = 2; ; copy++) {
    const candidate = i18n.translate('xpack.nightshift.automations.cloneNumberedName', {
      defaultMessage: '{name} (copy {copy})',
      values: { name, copy },
    });
    if (!taken.has(candidate)) return candidate;
  }
};

export const toCloneRequestBody = (
  { name, description, tags, automationType, trigger, execution, completion, runtime }: Automation,
  existingNames: string[]
): CreateAutomationBody => ({
  name: getCopyName(name, existingNames),
  description,
  tags,
  isEnabled: false,
  automationType,
  trigger,
  execution,
  completion,
  runtime,
});
