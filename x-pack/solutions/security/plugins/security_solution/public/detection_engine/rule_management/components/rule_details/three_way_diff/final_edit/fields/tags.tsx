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
import type { RuleTagArray } from '../../../../../../../../common/api/detection_engine';

export const tagsSchema = { tags: schema.tags } as FormSchema<{ name: RuleTagArray }>;

const componentProps = {
  euiFieldProps: {
    fullWidth: true,
    placeholder: '',
  },
};

export function TagsEdit(): JSX.Element {
  return <UseField path="tags" component={Field} componentProps={componentProps} />;
}
