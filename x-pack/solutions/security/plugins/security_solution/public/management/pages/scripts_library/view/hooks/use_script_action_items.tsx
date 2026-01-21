/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiText } from '@elastic/eui';
import { getScriptsDetailPath } from '../../../../common/url_routing';
import type { ListScriptsRequestQuery } from '../../../../../../common/api/endpoint';
import { useUserPrivileges } from '../../../../../common/components/user_privileges';
import type { ContextMenuItemNavByRouterProps } from '../../../../components/context_menu_with_router_support';
import type { EndpointScript } from '../../../../../../common/endpoint/types';
import { SCRIPT_LIBRARY_LABELS as tableActionLabels } from '../../translations';
import type { ScriptsLibraryUrlParams } from '../components/scripts_library_url_params';
import { useAppUrl } from '../../../../../common/lib/kibana';

export interface UseScriptActionItemsProps {
  onClickAction: ({
    show,
    script,
  }: {
    show: Required<ScriptsLibraryUrlParams>['show'];
    script: EndpointScript;
  }) => void;
  queryParams: ListScriptsRequestQuery;
  script: EndpointScript;
  showDetailsAction?: boolean;
}

export const useScriptActionItems = ({
  onClickAction,
  queryParams,
  script,
  showDetailsAction = true,
}: UseScriptActionItemsProps): ContextMenuItemNavByRouterProps[] => {
  const { getAppUrl } = useAppUrl();
  const { canReadScriptsLibrary, canWriteScriptsLibrary } = useUserPrivileges().endpointPrivileges;

  const toRoutePath = useCallback(
    (show: Required<ScriptsLibraryUrlParams>['show']) =>
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
      ...(canReadScriptsLibrary && showDetailsAction
        ? [
            {
              'data-test-subj': 'actionDetails',
              icon: 'inspect',
              key: 'details',
              name: tableActionLabels.table.actions.details,
              href: getAppUrl({ path: toRoutePath('details') }),
              onClick: () => onClickAction({ show: 'details', script }),
              children: renderActionItem(tableActionLabels.table.actions.details),
            },
          ]
        : []),
      ...(canWriteScriptsLibrary
        ? [
            {
              'data-test-subj': 'actionEdit',
              icon: 'pencil',
              key: 'edit',
              name: tableActionLabels.table.actions.edit,
              href: getAppUrl({ path: toRoutePath('edit') }),
              onClick: () => onClickAction({ show: 'edit', script }),
              children: renderActionItem(tableActionLabels.table.actions.edit),
            },
          ]
        : []),
      ...(canReadScriptsLibrary
        ? [
            {
              'data-test-subj': 'actionDownload',
              icon: 'download',
              key: 'download',
              name: tableActionLabels.table.actions.download,
              href: script.downloadUri,
              children: renderActionItem(tableActionLabels.table.actions.download),
            },
          ]
        : []),
      ...(canWriteScriptsLibrary
        ? [
            {
              'data-test-subj': 'actionDelete',
              icon: 'trash',
              key: 'delete',
              name: tableActionLabels.table.actions.delete,
              onClick: () => onClickAction({ show: 'delete', script }),
              children: renderActionItem(tableActionLabels.table.actions.delete),
            },
          ]
        : []),
    ],
    [
      canReadScriptsLibrary,
      showDetailsAction,
      getAppUrl,
      toRoutePath,
      canWriteScriptsLibrary,
      script,
      onClickAction,
    ]
  );
};
