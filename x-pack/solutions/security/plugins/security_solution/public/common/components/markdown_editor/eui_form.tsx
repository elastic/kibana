/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { forwardRef, useState } from 'react';
import type { EuiMarkdownEditorProps } from '@elastic/eui';
import { EuiFormRow } from '@elastic/eui';
import type { FieldHook } from '../../../shared_imports';
import { getFieldValidityAndErrorMessage } from '../../../shared_imports';
import type { MarkdownEditorRef } from './editor';
import { MarkdownEditor } from './editor';

type MarkdownEditorFormProps = EuiMarkdownEditorProps & {
  field: FieldHook;
  dataTestSubj: string;
  idAria: string;
  isDisabled?: boolean;
  includePlugins?: boolean;
};

export const MarkdownEditorForm = React.memo(
  forwardRef<MarkdownEditorRef, MarkdownEditorFormProps>(
    ({ field, dataTestSubj, idAria, includePlugins, placeholder }, ref) => {
      const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
      const [isMarkdownInvalid, setIsMarkdownInvalid] = useState(false);

      return (
        <EuiFormRow
          data-test-subj={dataTestSubj}
          describedByIds={idAria ? [idAria] : undefined}
          error={errorMessage}
          fullWidth
          helpText={field.helpText}
          isInvalid={isInvalid || isMarkdownInvalid}
          label={field.label}
          labelAppend={field.labelAppend}
        >
          <MarkdownEditor
            ref={ref}
            ariaLabel={idAria}
            onChange={field.setValue}
            value={field.value as string}
            data-test-subj={`${dataTestSubj}-markdown-editor`}
            setIsMarkdownInvalid={setIsMarkdownInvalid}
            includePlugins={includePlugins}
            placeholder={placeholder}
          />
        </EuiFormRow>
      );
    }
  )
);

MarkdownEditorForm.displayName = 'MarkdownEditorForm';
