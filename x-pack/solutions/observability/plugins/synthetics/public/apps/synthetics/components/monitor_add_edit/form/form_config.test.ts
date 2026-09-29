/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { ConfigKey, FormMonitorType } from '../types';
import { FORM_CONFIG } from './form_config';

vi.mock('../../../../../utils/kibana_service', () => {
  const mocked = {
    kibanaService: { coreStart: { docLinks: { links: {} } } },
  };
  return { ...mocked, default: mocked };
});

const paramsFields = (fields: Array<{ fieldKey: string }> | undefined) =>
  (fields ?? []).filter((field) => field.fieldKey === ConfigKey.PARAMS);

const paramsInConfig = (type: FormMonitorType) => {
  const config = FORM_CONFIG(false)[type];
  const stepFields = [
    ...paramsFields(config.step1),
    ...paramsFields(config.step2),
    ...paramsFields(config.step3),
    ...paramsFields(config.scriptEdit),
  ];
  const advancedFields = (config.advanced ?? []).flatMap((group) => paramsFields(group.components));

  return {
    stepFields,
    advancedFields,
    step3: paramsFields(config.step3),
    scriptEdit: paramsFields(config.scriptEdit),
  };
};

describe('FORM_CONFIG parameters placement', () => {
  it.each([FormMonitorType.MULTISTEP, FormMonitorType.API, FormMonitorType.SINGLE])(
    'shows parameters once, only in advanced, for %s',
    (type) => {
      const { stepFields, advancedFields, step3, scriptEdit } = paramsInConfig(type);

      expect(advancedFields).toHaveLength(1);
      expect(stepFields).toHaveLength(0);
      expect(step3).toHaveLength(0);
      expect(scriptEdit).toHaveLength(0);
    }
  );

  it.each([FormMonitorType.HTTP, FormMonitorType.TCP, FormMonitorType.ICMP])(
    'does not show parameters for %s',
    (type) => {
      const { stepFields, advancedFields } = paramsInConfig(type);

      expect(advancedFields).toHaveLength(0);
      expect(stepFields).toHaveLength(0);
    }
  );
});
