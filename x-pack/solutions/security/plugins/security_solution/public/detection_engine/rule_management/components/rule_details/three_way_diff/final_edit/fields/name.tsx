/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FormSchema } from '../../../../../../../shared_imports';
import { Field, UseField } from '../../../../../../../shared_imports';
import { schema } from '../../../../../../rule_creation_ui/components/step_about_rule/schema';
import type { RuleName } from '../../../../../../../../common/api/detection_engine';

export const nameSchema = { name: schema.name } as FormSchema<{ name: RuleName }>;

const componentProps = {
  euiFieldProps: {
    fullWidth: true,
  },
};

export function NameEdit(): JSX.Element {
  return <UseField path="name" component={Field} componentProps={componentProps} />;
}
