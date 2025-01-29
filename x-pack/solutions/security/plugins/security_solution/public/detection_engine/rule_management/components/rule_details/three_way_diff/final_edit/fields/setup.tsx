/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FormSchema } from '../../../../../../../shared_imports';
import { UseField } from '../../../../../../../shared_imports';
import { schema } from '../../../../../../rule_creation_ui/components/step_about_rule/schema';
import type { SetupGuide } from '../../../../../../../../common/api/detection_engine';
import * as i18n from '../../../../../../rule_creation_ui/components/step_about_rule/translations';
import { MarkdownEditorForm } from '../../../../../../../common/components/markdown_editor';

export const setupSchema = { setup: schema.setup } as FormSchema<{
  setup: SetupGuide;
}>;

const componentProps = {
  placeholder: i18n.ADD_RULE_SETUP_HELP_TEXT,
  includePlugins: false,
};

export function SetupEdit(): JSX.Element {
  return <UseField path="setup" component={MarkdownEditorForm} componentProps={componentProps} />;
}
