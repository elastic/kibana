/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiText } from '@elastic/eui';
import type { ListScriptsRequestQuery } from '../../../../../../common/api/endpoint';
import { getScriptsDetailPath } from '../../../../common/routing';
import { useUserPrivileges } from '../../../../../common/components/user_privileges';
import type { ContextMenuItemNavByRouterProps } from '../../../../components/context_menu_with_router_support';
import type { EndpointScript } from '../../../../../../common/endpoint/types';
import { scriptsLibraryLabels as i18n } from '../../translations';
import type { ScriptsLibraryUrlParams } from '../components/scripts_library_url_params';
import { useAppUrl } from '../../../../../common/lib/kibana';
import type { ScriptsLibraryTableProps } from '../components/scripts_library_table';

export const useScriptActionItems = ({
  onClickDelete,
  queryParams,
  script,
}: {
  onClickDelete: ScriptsLibraryTableProps['onClickDelete'];
  queryParams: ListScriptsRequestQuery;
  script: EndpointScript;
}): ContextMenuItemNavByRouterProps[] => {
  const { getAppUrl } = useAppUrl();
  const { canReadScriptsLibrary, canWriteScriptsLibrary } = useUserPrivileges().endpointPrivileges;

  const toRoutePath = useCallback(
    (show: ScriptsLibraryUrlParams['show']) =>
      getScriptsDetailPath({
        query: {
          ...queryParams,
          selectedScriptId: script.id,
          show,
        },
      }),
    [queryParams, script.id]
  );

  const renderActionItem = (text: string) => <EuiText size="s">{text}</EuiText>;

  return useMemo<ContextMenuItemNavByRouterProps[]>(
    () => [
      ...(canReadScriptsLibrary
        ? [
            {
              'data-test-subj': 'detailsLink',
              icon: 'inspect',
              key: 'detailsLink',
              name: i18n.table.actions.details,
              href: getAppUrl({ path: toRoutePath('details') }),
              children: renderActionItem(i18n.table.actions.details),
            },
          ]
        : []),
      ...(canWriteScriptsLibrary
        ? [
            {
              'data-test-subj': 'editLink',
              icon: 'pencil',
              key: 'editLink',
              name: i18n.table.actions.edit,
              href: getAppUrl({ path: toRoutePath('edit') }),
              children: renderActionItem(i18n.table.actions.edit),
            },
          ]
        : []),
      ...(canReadScriptsLibrary
        ? [
            {
              'data-test-subj': 'downloadLink',
              icon: 'download',
              key: 'downloadLink',
              name: i18n.table.actions.download,
              href: script.downloadUri,
              children: renderActionItem(i18n.table.actions.download),
            },
          ]
        : []),
      ...(canWriteScriptsLibrary
        ? [
            {
              'data-test-subj': 'deleteLink',
              icon: 'trash',
              key: 'deleteLink',
              name: i18n.table.actions.delete,
              onClick: () => onClickDelete(script),
              children: renderActionItem(i18n.table.actions.delete),
            },
          ]
        : []),
    ],
    [canReadScriptsLibrary, getAppUrl, toRoutePath, canWriteScriptsLibrary, script, onClickDelete]
  );
};
