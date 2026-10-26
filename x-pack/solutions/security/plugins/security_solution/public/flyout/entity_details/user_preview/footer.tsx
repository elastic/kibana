/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { FlyoutFooter } from '../../shared/components/flyout_footer';
import { UserPanelKey } from '../shared/constants';
import type { EntityStoreRecord } from '../shared/hooks/use_entity_from_store';

export interface UserPreviewPanelFooterProps {
  contextID: string;
  scopeId: string;
  userName: string;
  entityId?: string;
  /** When entity store v2 is enabled: entity record from the store. */
  entity?: EntityStoreRecord;
}

export const UserPreviewPanelFooter = ({
  contextID,
  scopeId,
  userName,
  entityId,
  entity,
}: UserPreviewPanelFooterProps) => {
  const { openFlyout } = useExpandableFlyoutApi();

  const openUserFlyout = useCallback(() => {
    openFlyout({
      right: {
        id: UserPanelKey,
        params: {
          contextID,
          userName,
          entityId,
          scopeId,
        },
      },
    });
  }, [openFlyout, userName, entityId, contextID, scopeId]);

  return (
    <FlyoutFooter data-test-subj={'user-preview-footer'}>
      <EuiFlexGroup justifyContent="center">
        <EuiFlexItem grow={false}>
          <EuiLink onClick={openUserFlyout} target="_blank" data-test-subj={'open-user-flyout'}>
            {i18n.translate('xpack.securitySolution.flyout.user.preview.viewDetailsLabel', {
              defaultMessage: 'Show full user details',
            })}
          </EuiLink>
        </EuiFlexItem>
      </EuiFlexGroup>
    </FlyoutFooter>
  );
};
