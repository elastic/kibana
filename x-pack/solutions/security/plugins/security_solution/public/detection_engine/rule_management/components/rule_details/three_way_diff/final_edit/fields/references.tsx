/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { compact } from 'lodash';
import * as i18n from '../../../../../../rule_creation_ui/components/step_about_rule/translations';
import type { FormSchema, FormData } from '../../../../../../../shared_imports';
import { UseField } from '../../../../../../../shared_imports';
import { schema } from '../../../../../../rule_creation_ui/components/step_about_rule/schema';
import type { RuleReferenceArray } from '../../../../../../../../common/api/detection_engine';
import { AddItem } from '../../../../../../rule_creation_ui/components/add_item_form';
import { isUrlInvalid } from '../../../../../../../common/utils/validators';

export const referencesSchema = { references: schema.references } as FormSchema<{
  references: RuleReferenceArray;
}>;

const componentProps = {
  addText: i18n.ADD_REFERENCE,
  validate: isUrlInvalid,
};

export function ReferencesEdit(): JSX.Element {
  return <UseField path="references" component={AddItem} componentProps={componentProps} />;
}

export function referencesSerializer(formData: FormData): {
  references: RuleReferenceArray;
} {
  return {
    /* Remove empty items from the references array */
    references: compact(formData.references),
  };
}
