/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  CriteriaWithPagination,
  EuiButton,
  EuiImage,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiText,
} from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { PLUGIN_ID } from '../../../common';
import { useKibana } from '../../hooks/use_kibana';
import { UsePlaygroundsListParameters, usePlaygroundsList } from '../../hooks/use_playgrounds_list';
import { SEARCH_PLAYGROUND_CHAT_PATH } from '../../routes';

import { PlaygroundsListError } from './playgrounds_list_error';
import { PlaygroundsListLoading } from './playgrounds_list_loading';
import { PlaygroundsListEmptyState } from './playgrounds_list_empty_state';
import { PlaygroundsTable, PlaygroundsTableProps } from './playgrounds_table';
import { PlaygroundListObject } from '../../types';
import { useAssetBasePath } from '../../hooks/use_asset_base_path';

function PlaygroundListObjectFieldToSortField(field: string): 'updated_at' {
  // SO Index does not currently allow sorting on name, update this when we update SO index settings
  switch (field) {
    case 'updatedAt':
    default:
      return 'updated_at';
  }
}

function SortFieldToPlaygroundListObjectField(
  sortField: string
): PlaygroundsTableProps['sortField'] {
  // SO Index does not currently allow sorting on name, update this when we update SO index settings
  switch (sortField) {
    case 'updated_at':
    default:
      return 'updatedAt';
  }
}

export const PlaygroundsList = () => {
  const [playgroundQuery, setPlaygroundsQuery] = useState<UsePlaygroundsListParameters>({
    page: 1,
    sortField: 'updated_at',
    sortOrder: 'desc',
  });
  const { application } = useKibana().services;
  const assetBasePath = useAssetBasePath();
  const { data, isLoading, isError, error } = usePlaygroundsList(playgroundQuery);
  const onNewPlayground = useCallback(() => {
    application.navigateToApp(PLUGIN_ID, { path: SEARCH_PLAYGROUND_CHAT_PATH });
  }, [application]);
  const onTablePageChange = useCallback(
    (criteria: CriteriaWithPagination<PlaygroundListObject>) => {
      setPlaygroundsQuery((value) => ({
        page: criteria.page.index + 1,
        sortOrder: criteria.sort?.direction ?? value.sortOrder,
        sortField: PlaygroundListObjectFieldToSortField(criteria.sort?.field ?? 'updatedAt'),
      }));
    },
    []
  );

  if (isLoading) {
    return <PlaygroundsListLoading />;
  }

  if (isError || data === undefined) {
    return <PlaygroundsListError error={error} />;
  }

  if (data._meta.total === 0) {
    return <PlaygroundsListEmptyState onNewPlayground={onNewPlayground} />;
  }

  return (
    <>
      <KibanaPageTemplate.Header>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={1}>
            <EuiFlexGroup direction="column">
              <EuiTitle size="l">
                <h1>
                  {i18n.translate('xpack.searchPlayground.playgroundsList.page.title', {
                    defaultMessage: 'Playground',
                  })}
                </h1>
              </EuiTitle>
              <EuiText>
                <p>
                  {i18n.translate('xpack.searchPlayground.playgroundsList.page.description', {
                    defaultMessage: 'Use your data to experiment with RAG applications',
                  })}
                </p>
              </EuiText>
              <EuiFlexItem>
                <span>
                  <EuiButton
                    data-test-subj="newPlaygroundButton"
                    fill
                    iconType="plusInCircle"
                    fullWidth={false}
                    onClick={onNewPlayground}
                  >
                    <FormattedMessage
                      id="xpack.searchPlayground.playgroundsList.page.cta.text"
                      defaultMessage="New Playground"
                    />
                  </EuiButton>
                </span>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={2}>
            <EuiImage size="l" src={`${assetBasePath}/placeholder_playground_hero.png`} alt="" />
          </EuiFlexItem>
        </EuiFlexGroup>
      </KibanaPageTemplate.Header>
      <KibanaPageTemplate.Section color="plain">
        <PlaygroundsTable
          playgroundsData={data}
          onChange={onTablePageChange}
          sortDirection={playgroundQuery.sortOrder}
          sortField={SortFieldToPlaygroundListObjectField(playgroundQuery.sortField)}
        />
      </KibanaPageTemplate.Section>
    </>
  );
};
