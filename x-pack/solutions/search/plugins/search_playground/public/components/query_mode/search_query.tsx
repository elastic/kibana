/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFieldText } from '@elastic/eui';
import { Controller, useController, useFormContext } from 'react-hook-form';
import { i18n } from '@kbn/i18n';
import { ChatForm, ChatFormFields } from '../../types';

export const SearchQuery = () => {
  const { control } = useFormContext();
  const {
    field: { value: searchBarValue },
    formState: { isSubmitting },
  } = useController<ChatForm, ChatFormFields.searchQuery>({
    name: ChatFormFields.searchQuery,
  });

  return (
    <Controller
      control={control}
      name={ChatFormFields.searchQuery}
      render={({ field }) => (
        <EuiFieldText
          data-test-subj="searchPlaygroundSearchModeFieldText"
          prepend="{query}"
          {...field}
          value={searchBarValue}
          icon="search"
          fullWidth
          placeholder={i18n.translate(
            'xpack.searchPlayground.searchMode.queryView.searchBar.placeholder',
            { defaultMessage: 'Search for documents' }
          )}
          isLoading={isSubmitting}
        />
      )}
    />
  );
};
