/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FILTER_VALUE_CAP } from '../../common/filter_values';

/** Tells why the values of a filter that has all it takes cannot be picked. */
export function FilterLimitNote({ 'data-test-subj': dataTestSubj }: { 'data-test-subj': string }) {
  return (
    <EuiText size="xs" color="subdued" data-test-subj={dataTestSubj}>
      {i18n.translate('xpack.digitalExperience.filterLimitNote', {
        defaultMessage: 'A filter takes up to {limit} values. Remove one to pick another.',
        values: { limit: FILTER_VALUE_CAP },
      })}
    </EuiText>
  );
}
