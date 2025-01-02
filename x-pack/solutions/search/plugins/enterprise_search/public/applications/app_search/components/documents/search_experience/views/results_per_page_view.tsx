/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiSelect, EuiSelectOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const wrapResultsPerPageOptionForEuiSelect: (option: number) => EuiSelectOption = (option) => ({
  text: option,
  value: option,
});

interface Props {
  options?: number[];
  value?: number;
  onChange(value: number): void;
}

export const ResultsPerPageView: React.FC<Props> = ({ onChange, options = [], value = 20 }) => {
  // If we don't have the value in options, unset it
  const selectedValue = value && !options.includes(value) ? undefined : value;

  return (
    <div>
      <EuiSelect
        options={options.map(wrapResultsPerPageOptionForEuiSelect)}
        value={selectedValue}
        prepend={i18n.translate(
          'xpack.enterpriseSearch.appSearch.documents.search.resultsPerPage.show',
          {
            defaultMessage: 'Show:',
          }
        )}
        onChange={(event) => onChange(parseInt(event.target.value, 10))}
        aria-label={i18n.translate(
          'xpack.enterpriseSearch.appSearch.documents.search.resultsPerPage.ariaLabel',
          {
            defaultMessage: 'Number of results to show per page',
          }
        )}
      />
    </div>
  );
};
