/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { RuleFieldEditFormWrapper } from '../../../field_final_side';
import { ThreatMatchIndicatorPathEditAdapter } from './indicator_path_edit_adapter';

export function ThreatMatchIndicatorPathEditForm(): JSX.Element {
  return (
    <RuleFieldEditFormWrapper
      component={ThreatMatchIndicatorPathEditAdapter}
      ruleFieldFormSchema={schema}
    />
  );
}

const schema = {};
