/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect } from 'react';
import type { Threats } from '@kbn/securitysolution-io-ts-alerting-types';
import type { FieldHook } from '../../../../shared_imports';
import { AddMitreAttackThreat } from '../mitre';
import { threatDefault } from './default_value';

interface Props {
  field: FieldHook;
  dataTestSubj: string;
  idAria: string;
  isDisabled: boolean;
}

/**
 * Keeps the ATT&CK threats field seeded with the same empty row used on rule creation.
 * The ATT&CK UI only renders its section label when the value array is non-empty; an empty
 * `threat: []` from the API would otherwise show a lone "Add tactic" button and look removed
 * next to the ATLAS section (which always has a default row).
 */
export const AddMitreAttackThreatWithDefault = memo((props: Props) => {
  const { field } = props;

  useEffect(() => {
    const value = field.value as Threats | undefined;
    if (!Array.isArray(value) || value.length === 0) {
      field.setValue(threatDefault);
    }
  }, [field, field.value]);

  return <AddMitreAttackThreat {...props} />;
});

AddMitreAttackThreatWithDefault.displayName = 'AddMitreAttackThreatWithDefault';
