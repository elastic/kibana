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
import type { InvestigationGuide } from '../../../../../../../../common/api/detection_engine';
import * as i18n from '../../../../../../rule_creation_ui/components/step_about_rule/translations';
import { MarkdownEditorForm } from '../../../../../../../common/components/markdown_editor';

export const noteSchema = { note: schema.note } as FormSchema<{
  note: InvestigationGuide;
}>;

const componentProps = {
  placeholder: i18n.ADD_RULE_NOTE_HELP_TEXT,
};

export function NoteEdit(): JSX.Element {
  return <UseField path="note" component={MarkdownEditorForm} componentProps={componentProps} />;
}
