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
import { useSpaceId } from '../../../../common/hooks/use_space_id';
import { useEndpointPrivileges } from '../../../../common/components/user_privileges/endpoint';
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
    const canManageGlobalArtifacts = useEndpointPrivileges().canManageGlobalArtifacts;
    const isGlobal = useMemo(() => isArtifactGlobal(item), [item]);
    const ownerSpaceIds = useMemo(() => getArtifactOwnerSpaceIds(item), [item]);
    const isSpacesEnabled = useIsExperimentalFeatureEnabled(
      'endpointManagementSpaceAwarenessEnabled'
    );
    const activeSpaceId = useSpaceId();

    const { isDisabled, disabledTooltip } = useMemo<{
      isDisabled: boolean;
      disabledTooltip: ReactNode;
    }>(() => {
      if (!isSpacesEnabled || canManageGlobalArtifacts) {
        return { isDisabled: false, disabledTooltip: undefined };
      }

      if (isGlobal) {
        return {
          isDisabled: true,
          disabledTooltip: 'something here: not allowed to manage global artifacts',
        };
      }

      if (!activeSpaceId || !ownerSpaceIds.includes(activeSpaceId)) {
        return {
          isDisabled: true,
          disabledTooltip: 'SOmething here: not allowed to manage shared artifact in active space',
        };
      }

      return { isDisabled: false, disabledTooltip: undefined };
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
