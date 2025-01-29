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
import type { RuleDescription } from '../../../../../../../../common/api/detection_engine';

export const descriptionSchema = { description: schema.description } as FormSchema<{
  description: RuleDescription;
}>;

const componentProps = {
  euiFieldProps: {
    fullWidth: true,
    compressed: true,
  },
};

export function DescriptionEdit(): JSX.Element {
  return <UseField path="description" component={Field} componentProps={componentProps} />;
}
