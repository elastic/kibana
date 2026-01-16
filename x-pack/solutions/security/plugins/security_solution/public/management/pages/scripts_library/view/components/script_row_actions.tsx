/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenuPanel,
  EuiPopover,
  type EuiContextMenuPanelProps,
  type EuiPopoverProps,
} from '@elastic/eui';
import type { ListScriptsRequestQuery } from '../../../../../../common/api/endpoint';
import type { EndpointScript } from '../../../../../../common/endpoint/types';
import { ContextMenuItemNavByRouter } from '../../../../components/context_menu_with_router_support';
import { scriptsLibraryLabels as i18n } from '../../translations';
import { useScriptActionItems } from '../hooks/use_script_action_items';
import type { ScriptsLibraryTableProps } from './scripts_library_table';

export interface ScriptRowActionsProps {
  queryParams: ListScriptsRequestQuery;
  scriptItem: EndpointScript;
  onClickDelete: ScriptsLibraryTableProps['onClickDelete'];
  'data-test-subj'?: string;
}

export const ScriptRowActions = memo<ScriptRowActionsProps>(
  ({ queryParams, onClickDelete, scriptItem, 'data-test-subj': dataTestSubj }) => {
    const [isOpen, setIsOpen] = useState(false);
    const scriptItemActions = useScriptActionItems({
      script: scriptItem,
      queryParams,
      onClickDelete,
    });

    const handleCloseMenu = useCallback(() => setIsOpen(false), [setIsOpen]);
    const handleToggleMenu = useCallback(() => setIsOpen(!isOpen), [isOpen]);

    const menuItems: EuiContextMenuPanelProps['items'] = useMemo(() => {
      return scriptItemActions.map((itemProps) => {
        return (
          <ContextMenuItemNavByRouter
            {...itemProps}
            onClick={(ev) => {
              handleCloseMenu();
              if (itemProps.onClick) {
                itemProps.onClick(ev);
              }
            }}
          />
        );
      });
    }, [handleCloseMenu, scriptItemActions]);

    const panelProps: EuiPopoverProps['panelProps'] = useMemo(() => {
      return { 'data-test-subj': `${dataTestSubj}-panel` };
    }, [dataTestSubj]);

    return (
      <EuiPopover
        anchorPosition="downRight"
        panelPaddingSize="none"
        panelProps={panelProps}
        button={
          <EuiButtonIcon
            data-test-subj={dataTestSubj}
            iconType="boxesHorizontal"
            onClick={handleToggleMenu}
            aria-label={i18n.table.columns.actionsAriaLabel}
          />
        }
        isOpen={isOpen}
        closePopover={handleCloseMenu}
      >
        <EuiContextMenuPanel items={menuItems} />
      </EuiPopover>
    );
  }
);
ScriptRowActions.displayName = 'ScriptRowActions';
