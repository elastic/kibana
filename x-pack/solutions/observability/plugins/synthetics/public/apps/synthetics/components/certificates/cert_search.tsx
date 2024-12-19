/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEvent, useState } from 'react';
import { EuiFieldSearch } from '@elastic/eui';
import useDebounce from 'react-use/lib/useDebounce';
import { css } from '@emotion/react';
import * as labels from './translations';

interface Props {
  setSearch: (val: string) => void;
}

export const CertificateSearch: React.FC<Props> = ({ setSearch }) => {
  const [debouncedValue, setDebouncedValue] = useState('');

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    setDebouncedValue(e.target.value);
  };

  useDebounce(
    () => {
      setSearch(debouncedValue);
    },
    350,
    [debouncedValue]
  );

  return (
    <div
      css={css`
        max-width: 700px;
      `}
    >
      <EuiFieldSearch
        data-test-subj="uptimeCertSearch"
        placeholder={labels.SEARCH_CERTS}
        onChange={onChange}
        isClearable={true}
        aria-label={labels.SEARCH_CERTS}
        fullWidth={true}
      />
    </div>
  );
};
