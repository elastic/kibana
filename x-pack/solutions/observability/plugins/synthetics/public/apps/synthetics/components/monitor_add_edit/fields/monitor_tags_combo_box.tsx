/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useFetcher } from '@kbn/observability-shared-plugin/public';
import { fetchTagSuggestions } from '../../../state';
import type { FormattedComboBoxProps } from './combo_box';
import { FormattedComboBox } from './combo_box';

export const MonitorTagsComboBox = (props: FormattedComboBoxProps) => {
  const { data: suggestions, loading } = useFetcher(() => fetchTagSuggestions(), []);
  const options = useMemo(() => (suggestions ?? []).map((tag) => ({ label: tag })), [suggestions]);

  return <FormattedComboBox {...props} options={options} isLoading={Boolean(loading)} />;
};
