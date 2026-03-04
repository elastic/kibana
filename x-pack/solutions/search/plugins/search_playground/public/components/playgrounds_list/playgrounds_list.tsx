/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import type { CriteriaWithPagination } from '@elastic/eui';
import { EuiButton, EuiSpacer } from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { PLUGIN_ID, PLUGIN_NAME } from '../../../common';
import { useKibana } from '../../hooks/use_kibana';
import type { UsePlaygroundsListParameters } from '../../hooks/use_playgrounds_list';
import { usePlaygroundsList } from '../../hooks/use_playgrounds_list';
import { SEARCH_PLAYGROUND_CHAT_PATH } from '../../routes';

import { PlaygroundsListError } from './playgrounds_list_error';
import { PlaygroundsListLoading } from './playgrounds_list_loading';
import { PlaygroundsListEmptyState } from './empty_state';
import type { PlaygroundsTableProps } from './playgrounds_table';
import { PlaygroundsTable } from './playgrounds_table';
import type { PlaygroundListObject } from '../../types';
import { PlaygroundDeprecationNotice } from './playground_deprecation_notice';

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
    return (
      <PlaygroundsListEmptyState
        CTAContent={
          <span>
            <EuiButton
              data-test-subj="newPlaygroundButton"
              fill
              iconType="plusInCircle"
              fullWidth={false}
              onClick={onNewPlayground}
            >
              <FormattedMessage
                id="xpack.searchPlayground.playgroundsList.emptyPrompt.cta.text"
                defaultMessage="New Playground"
              />
            </EuiButton>
          </span>
        }
      />
    );
  }

  return (
    <>
      <KibanaPageTemplate.Header
        pageTitle={PLUGIN_NAME}
        description={i18n.translate('xpack.searchPlayground.playgroundsList.page.description', {
          defaultMessage: 'Use your data to experiment with creating a chat experience.',
        })}
        rightSideItems={[
          <EuiButton
            data-test-subj="newPlaygroundButton"
            fill
            iconType="plusInCircle"
            onClick={onNewPlayground}
          >
            <FormattedMessage
              id="xpack.searchPlayground.playgroundsList.page.cta.text"
              defaultMessage="New Playground"
            />
          </EuiButton>,
        ]}
      />
      <KibanaPageTemplate.Section color="plain">
        <PlaygroundDeprecationNotice />
        <EuiSpacer />
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
