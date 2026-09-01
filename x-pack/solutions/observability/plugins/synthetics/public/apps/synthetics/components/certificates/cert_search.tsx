/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangeEvent } from 'react';
import React, { useState } from 'react';
import { EuiFieldSearch } from '@elastic/eui';
import styled from 'styled-components';
import useDebounce from 'react-use/lib/useDebounce';
import * as labels from './translations';

const WrapFieldSearch = styled('div')`
  width: 100%;
`;

interface Props {
  setSearch: (val: string) => void;
  initialValue?: string;
}

export const CertificateSearch: React.FC<Props> = ({ setSearch, initialValue = '' }) => {
  const [debouncedValue, setDebouncedValue] = useState(initialValue);

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
    <WrapFieldSearch>
      <EuiFieldSearch
        data-test-subj="uptimeCertSearch"
        placeholder={labels.SEARCH_CERTS}
        defaultValue={initialValue}
        onChange={onChange}
        isClearable={true}
        aria-label={labels.SEARCH_CERTS}
        fullWidth={true}
      />
    </WrapFieldSearch>
  );
};
