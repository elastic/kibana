/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import { EuiButton, EuiContextMenuPanel, EuiPopover } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';
import type { EndpointScript } from '../../../../../../../common/endpoint/types';
import { ContextMenuItemNavByRouter } from '../../../../../components/context_menu_with_router_support/context_menu_item_nav_by_router';
import {
  useScriptActionItems,
  type UseScriptActionItemsProps,
} from '../../hooks/use_script_action_items';

interface EndpointScriptDetailsActionsProps {
  scriptItem: EndpointScript;
  onClickAction: UseScriptActionItemsProps['onClickAction'];
  'data-test-subj'?: string;
}
export const EndpointScriptDetailsActions = memo<EndpointScriptDetailsActionsProps>(
  ({ scriptItem: script, onClickAction, 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const menuOptions = useScriptActionItems({
      script,
      onClickAction,
      showDetailsAction: false,
    });
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const closePopoverHandler = useCallback(() => {
      setIsPopoverOpen(false);
    }, []);

    const takeActionItems = useMemo(() => {
      return menuOptions.map((item) => {
        return (
          <ContextMenuItemNavByRouter
            {...item}
            onClick={(ev) => {
              closePopoverHandler();
              if (item.onClick) {
                item.onClick(ev);
              }
            }}
          />
        );
      });
    }, [closePopoverHandler, menuOptions]);

    const takeActionButton = useMemo(() => {
      return (
        <EuiButton
          iconSide="right"
          fill
          iconType="arrowDown"
          data-test-subj={getTestId('takeActionButton')}
          onClick={() => {
            setIsPopoverOpen(!isPopoverOpen);
          }}
        >
          <FormattedMessage
            id="xpack.securitySolution.script.detailsActions.buttonLabel"
            defaultMessage="Take action"
          />
        </EuiButton>
      );
    }, [isPopoverOpen, getTestId]);

    return (
      <EuiPopover
        id="EndpointScriptDetailsActionsPanel"
        button={takeActionButton}
        isOpen={isPopoverOpen}
        closePopover={closePopoverHandler}
        panelPaddingSize="none"
        anchorPosition="downLeft"
        data-test-subj={getTestId('actionsPopover')}
      >
        <EuiContextMenuPanel size="s" items={takeActionItems} />
      </EuiPopover>
    );
  }
);

EndpointScriptDetailsActions.displayName = 'EndpointScriptDetailsActions';
