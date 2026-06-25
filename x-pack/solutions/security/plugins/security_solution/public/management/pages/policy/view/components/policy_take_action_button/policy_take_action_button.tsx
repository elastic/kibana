/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { MaybeImmutable, PolicyData } from '../../../../../../../common/endpoint/types';
import { BulkResponseConsoleModal } from './bulk_response_console';
import {
  type ContextMenuItemNavByRouterProps,
  ContextMenuWithRouterSupport,
} from '../../../../../components/context_menu_with_router_support';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';

type TakeActionType = 'respond';

export interface PolicyTakeActionButtonProps {
  integrationPolicy: MaybeImmutable<PolicyData>;
  'data-test-subj'?: string;
}

export const PolicyTakeActionButton = memo<PolicyTakeActionButtonProps>(
  ({ integrationPolicy, 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const [showActionType, setShowActionType] = useState<TakeActionType | undefined>();

    const menuItems: ContextMenuItemNavByRouterProps[] = useMemo(() => {
      return [
        {
          onClick: () => {
            setShowActionType('respond');
          },
          children: i18n.translate('xpack.securitySolution.endpointPolicyTakeAction.bulkRespond', {
            defaultMessage: 'Bulk respond',
          }),
          icon: 'console',
        },
      ];
    }, []);

    const handleUserActionUiOnCloseHandler = useCallback(() => {
      setShowActionType(undefined);
    }, []);

    const userActionUi = useMemo(() => {
      switch (showActionType) {
        case 'respond':
          return (
            <BulkResponseConsoleModal
              integrationPolicyId={integrationPolicy.id}
              onClose={handleUserActionUiOnCloseHandler}
            />
          );
        default:
          return null;
      }
    }, [handleUserActionUiOnCloseHandler, integrationPolicy.id, showActionType]);

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

        {userActionUi}
      </>
    );
  }
);
PolicyTakeActionButton.displayName = 'PolicyTakeActionButton';
