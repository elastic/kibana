/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import type { FieldSpec } from '@kbn/data-views-plugin/common';
import type { Option } from '../helpers/create_options';
import { createOptionsFromFields } from '../helpers/create_options';

interface SearchableFieldOptions {
  options: Option[];
  onSearchChange: (searchValue: string) => void;
}

export const useSearchableFieldOptions = (fields: FieldSpec[]): SearchableFieldOptions => {
  const [searchValue, setSearchValue] = useState('');

  return {
    options: createOptionsFromFields(fields, ({ value }) => value.includes(searchValue)),
    onSearchChange: setSearchValue,
  };
};
