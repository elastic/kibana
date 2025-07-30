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
import { PlaygroundForm, PlaygroundFormFields } from '../../types';

export const SearchQuery = ({ isLoading }: { isLoading: boolean }) => {
  const { control } = useFormContext();
  const {
    formState: { isSubmitting },
  } = useController<PlaygroundForm, PlaygroundFormFields.searchQuery>({
    name: PlaygroundFormFields.searchQuery,
  });

  return (
    <Controller
      control={control}
      name={PlaygroundFormFields.searchQuery}
      render={({ field }) => (
        <EuiFieldText
          data-test-subj="searchPlaygroundSearchModeFieldText"
          prepend="{query}"
          name={field.name}
          onBlur={field.onBlur}
          onChange={field.onChange}
          value={field.value}
          inputRef={field.ref}
          icon="search"
          fullWidth
          placeholder={i18n.translate(
            'xpack.searchPlayground.searchMode.queryView.searchBar.placeholder',
            { defaultMessage: 'Search for documents' }
          )}
          isLoading={isLoading || isSubmitting}
        />
      )}
    />
  );
};
