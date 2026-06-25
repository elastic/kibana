/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import { EuiButton, EuiModal } from '@elastic/eui';
import { BulkResponseConsole } from './bulk_response_console';
import {
  type ContextMenuItemNavByRouterProps,
  ContextMenuWithRouterSupport,
} from '../../../../../components/context_menu_with_router_support';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';

type TakeActionType = 'respond';

export interface PolicyTakeActionButtonProps {
  'data-test-subj'?: string;
}

export const PolicyTakeActionButton = memo<PolicyTakeActionButtonProps>(
  ({ 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const [showActionType, setShowActionType] = useState<TakeActionType | undefined>();

    const menuItems: ContextMenuItemNavByRouterProps[] = useMemo(() => {
      return [
        {
          onClick: () => {
            setShowActionType('respond');
          },
          children: 'Respond',
          icon: 'console',
        },
      ];
    }, []);

    const userActionUi = useMemo(() => {
      switch (showActionType) {
        case 'respond':
          return <BulkResponseConsole />;
        default:
          return null;
      }
    }, [showActionType]);

    const closeDialogHandler = useCallback(() => {
      setShowActionType(undefined);
    }, []);

    return (
      <>
        <ContextMenuWithRouterSupport
          maxHeight="235px"
          fixedWidth={true}
          panelPaddingSize="none"
          items={menuItems}
          data-test-subj={getTestId('popover')}
          button={
            <EuiButton data-test-subj={getTestId()}>
              {/* FIXME:PT i18n this */}
              {'Take action'}
            </EuiButton>
          }
          // FIXME:PT cleanup
          // title={POLICY_EFFECT_SCOPE_TITLE(policies.length)}
          // isNavigationDisabled={!canReadPolicies}
        />

        {showActionType && <EuiModal onClose={closeDialogHandler}>{userActionUi}</EuiModal>}
      </>
    );
  }
);
PolicyTakeActionButton.displayName = 'PolicyTakeActionButton';
