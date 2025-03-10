/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { memo, useMemo } from 'react';
import type { CommonProps } from '@elastic/eui';
import { EuiFlexItem } from '@elastic/eui';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import {
  MANAGEMENT_OF_GLOBAL_ARTIFACT_NOT_ALLOWED_MESSAGE,
  MANAGEMENT_OF_SHARED_PER_POLICY_ARTIFACT_NOT_ALLOWED_MESSAGE,
} from './translations';
import { useSpaceId } from '../../../../common/hooks/use_space_id';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { isArtifactGlobal } from '../../../../../common/endpoint/service/artifacts';
import { useCardArtifact } from './card_artifact_context';
import type { ActionsContextMenuProps } from '../../actions_context_menu';
import { ActionsContextMenu } from '../../actions_context_menu';
import { getArtifactOwnerSpaceIds } from '../../../../../common/endpoint/service/artifacts/utils';

export interface CardActionsFlexItemProps extends Pick<CommonProps, 'data-test-subj'> {
  /** If defined, then an overflow menu will be shown with the actions provided */
  actions?: ActionsContextMenuProps['items'];
}

export const CardActionsFlexItem = memo<CardActionsFlexItemProps>(
  ({ actions, 'data-test-subj': dataTestSubj }) => {
    const item = useCardArtifact() as ExceptionListItemSchema;
    const canManageGlobalArtifacts =
      useUserPrivileges().endpointPrivileges.canManageGlobalArtifacts;
    const isGlobal = useMemo(() => isArtifactGlobal(item), [item]);
    const ownerSpaceIds = useMemo(() => getArtifactOwnerSpaceIds(item), [item]);
    const isSpacesEnabled = useIsExperimentalFeatureEnabled(
      'endpointManagementSpaceAwarenessEnabled'
    );
    const activeSpaceId = useSpaceId();

    interface MenuButtonDisableOptions {
      isDisabled: boolean;
      disabledTooltip: ReactNode;
    }
    const { isDisabled, disabledTooltip } = useMemo<MenuButtonDisableOptions>(() => {
      const response: MenuButtonDisableOptions = { isDisabled: false, disabledTooltip: undefined };

      if (!isSpacesEnabled) {
        return response;
      }

      if (canManageGlobalArtifacts) {
        return response;
      }

      if (isGlobal) {
        response.isDisabled = true;
        response.disabledTooltip = MANAGEMENT_OF_GLOBAL_ARTIFACT_NOT_ALLOWED_MESSAGE;
        return response;
      }

      if (!activeSpaceId || !ownerSpaceIds.includes(activeSpaceId)) {
        response.isDisabled = true;
        response.disabledTooltip = MANAGEMENT_OF_SHARED_PER_POLICY_ARTIFACT_NOT_ALLOWED_MESSAGE;

        return response;
      }

      return response;
    }, [activeSpaceId, canManageGlobalArtifacts, isGlobal, isSpacesEnabled, ownerSpaceIds]);

    return actions && actions.length > 0 ? (
      <EuiFlexItem grow={false}>
        <ActionsContextMenu
          items={actions}
          icon="boxesHorizontal"
          isDisabled={isDisabled}
          disabledTooltip={disabledTooltip}
          data-test-subj={dataTestSubj}
        />
      </EuiFlexItem>
    ) : null;
  }
);
CardActionsFlexItem.displayName = 'CardActionsFlexItem';
