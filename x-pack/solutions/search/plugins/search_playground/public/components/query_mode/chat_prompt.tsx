/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFieldText } from '@elastic/eui';
import { Controller, useFormContext } from 'react-hook-form';
import { i18n } from '@kbn/i18n';
import { PlaygroundFormFields } from '../../types';

export const ChatPrompt = ({ isLoading }: { isLoading: boolean }) => {
  const { control } = useFormContext();

  return (
    <Controller
      control={control}
      name={PlaygroundFormFields.question}
      render={({ field }) => (
        <EuiFieldText
          data-test-subj="searchPlaygroundChatQuestionFieldText"
          prepend="{query}"
          name={field.name}
          onBlur={field.onBlur}
          onChange={field.onChange}
          value={field.value}
          inputRef={field.ref}
          fullWidth
          placeholder={i18n.translate(
            'xpack.searchPlayground.searchMode.queryView.chatQuestion.placeholder',
            { defaultMessage: 'Ask a question' }
          )}
          isLoading={isLoading}
        />
      )}
    />
  );
};
