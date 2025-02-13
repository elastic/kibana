/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { type FormSchema, type FormData, UseField } from '../../../../../../../shared_imports';
import { schema } from '../../../../../../rule_creation_ui/components/step_about_rule/schema';
import type { ThreatArray } from '../../../../../../../../common/api/detection_engine';
import { AddMitreAttackThreat } from '../../../../../../rule_creation_ui/components/mitre';
import { filterEmptyThreats } from '../../../../../../rule_creation_ui/pages/rule_creation/helpers';

export const threatSchema = { threat: schema.threat } as FormSchema<{ threat: ThreatArray }>;

export function ThreatEdit(): JSX.Element {
  return <UseField path="threat" component={AddMitreAttackThreat} />;
}

export function threatSerializer(formData: FormData): {
  threat: ThreatArray;
} {
  return {
    threat: filterEmptyThreats(formData.threat).map((singleThreat) => ({
      ...singleThreat,
      framework: 'MITRE ATT&CK',
    })),
  };
}
