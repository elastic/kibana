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

export const MetadataSearchBarHeader = () => {
  const [urlState, setUrlState] = useAssetDetailsUrlState();
  const [searchText, setSearchText] = useState(urlState?.metadataSearch ?? '');

  const debouncedSetUrlState = useMemo(
    () =>
      debounce((query: string) => {
        setUrlState({ metadataSearch: query });
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
      data-test-subj="infraAssetDetailsMetadataSearchBarInput"
      fullWidth
      placeholder={i18n.translate('xpack.infra.metadataEmbeddable.searchForMetadata', {
        defaultMessage: 'Search for metadata…',
      })}
      value={searchText}
      isClearable
      onChange={onChange}
    />
  );
};
