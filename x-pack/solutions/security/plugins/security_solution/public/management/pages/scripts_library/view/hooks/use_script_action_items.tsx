/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiText } from '@elastic/eui';
import { useUserPrivileges } from '../../../../../common/components/user_privileges';
import type { ContextMenuItemNavByRouterProps } from '../../../../components/context_menu_with_router_support';
import type { EndpointScript } from '../../../../../../common/endpoint/types';
import { SCRIPT_LIBRARY_LABELS as tableActionLabels } from '../../translations';
import type { ScriptsLibraryUrlParams } from '../components/scripts_library_url_params';

export interface UseScriptActionItemsProps {
  onClickAction: ({
    show,
    script,
  }: {
    show: Required<ScriptsLibraryUrlParams>['show'];
    script: EndpointScript;
  }) => void;
  script: EndpointScript;
  showDetailsAction?: boolean;
}

export const useScriptActionItems = ({
  onClickAction,
  script,
  showDetailsAction = true,
}: UseScriptActionItemsProps): ContextMenuItemNavByRouterProps[] => {
  const { canReadScriptsLibrary, canWriteScriptsLibrary } = useUserPrivileges().endpointPrivileges;

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
              onClick: () => onClickAction({ show: 'details', script }),
              children: renderActionItem(tableActionLabels.table.actions.details),
            },
          ]
        : []),
      // TODO : un comment in the next PR when edit flyout is added
      // ...(canWriteScriptsLibrary
      // ? [
      //     {
      //       'data-test-subj': 'actionEdit',
      //       icon: 'pencil',
      //       key: 'edit',
      //       name: tableActionLabels.table.actions.edit,
      //       onClick: () => onClickAction({ show: 'edit', script }),
      //       children: renderActionItem(tableActionLabels.table.actions.edit),
      //     },
      //   ]
      // : []),
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
    [canReadScriptsLibrary, showDetailsAction, canWriteScriptsLibrary, script, onClickAction]
  );
};
