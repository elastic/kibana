/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiFieldSearch } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { debounce } from 'lodash';
import { useAssetDetailsUrlState } from '../../hooks/use_asset_details_url_state';

export const ProcessesSearchBarHeader = () => {
  const [urlState, setUrlState] = useAssetDetailsUrlState();
  const [searchText, setSearchText] = useState(urlState?.processSearch ?? '');

  const debouncedSetUrlState = useMemo(
    () =>
      debounce((query: string) => {
        setUrlState({ processSearch: query });
      }, 300),
    [setUrlState]
  );

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchText(value);
      debouncedSetUrlState(value);
    },
    [debouncedSetUrlState]
  );

  return (
    <EuiFieldSearch
      data-test-subj="infraAssetDetailsProcessesSearchBarInput"
      fullWidth
      placeholder={i18n.translate('xpack.infra.metrics.nodeDetails.searchForProcesses', {
        defaultMessage: 'Search for processes…',
      })}
      value={searchText}
      isClearable
      onChange={onChange}
    />
  );
};
