/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { snakeCase } from 'lodash';
import { useFieldUpgradeContext } from '../../rule_upgrade/field_upgrade_context';
import { FieldEditFormContextProvider } from '../context/field_edit_form_context';
import { FieldFinalSideContent } from './field_final_side_content';
import { FieldFinalSideHeader } from './field_final_side_header';

export function FieldFinalSide(): JSX.Element {
  const { fieldName } = useFieldUpgradeContext();

  return (
    <section data-test-subj={`${snakeCase(fieldName)}-finalSide`}>
      <FieldEditFormContextProvider>
        <FieldFinalSideHeader />
        <FieldFinalSideContent />
      </FieldEditFormContextProvider>
    </section>
  );
}
