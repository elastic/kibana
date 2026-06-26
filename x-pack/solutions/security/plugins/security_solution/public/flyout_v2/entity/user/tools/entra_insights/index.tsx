/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlyoutBody, EuiFlyoutHeader } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ManagedUserHit } from '../../../../../../common/search_strategy/security_solution/users/managed_details';
import { UserAssetTableType } from '../../../../../explore/users/store/model';
import { DocumentDetailsProvider } from '../../../../../flyout/document_details/shared/context';
import { AssetDocumentTab } from '../../../../../flyout/entity_details/user_details_left/tabs/asset_document';
import { ToolsFlyoutHeader } from '../../../../shared/components/tools_flyout_header';
import { ENTRA_INSIGHTS_TOOL_TEST_ID } from './test_ids';

const TITLE = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.user.entraInsights.title',
  { defaultMessage: 'Entra Data' }
);

export interface EntraInsightsProps {
  /** Managed user hit containing the Entra asset document _id and _index. */
  managedUser: ManagedUserHit;
  /** The user name displayed in the flyout header label. */
  value: string;
  /** Opens the originating user flyout as a child. */
  onOpenUser?: () => void;
}

export const EntraInsights = memo(({ managedUser, value, onOpenUser }: EntraInsightsProps) => {
  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <ToolsFlyoutHeader title={TITLE} onTitleClick={onOpenUser} label={value} iconType="user" />
      </EuiFlyoutHeader>
      <EuiFlyoutBody data-test-subj={ENTRA_INSIGHTS_TOOL_TEST_ID}>
        <DocumentDetailsProvider
          id={managedUser._id}
          indexName={managedUser._index}
          scopeId={UserAssetTableType.assetEntra}
        >
          <AssetDocumentTab />
        </DocumentDetailsProvider>
      </EuiFlyoutBody>
    </>
  );
});

EntraInsights.displayName = 'EntraInsights';
