/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiText,
  EuiTabbedContent,
  EuiTabbedContentTab,
  EuiSpacer,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { FilteringValidation } from '@kbn/search-connectors';

import { AdvancedSyncRules } from './advanced_sync_rules';
import { EditSyncRulesTab } from './edit_sync_rules_tab';
import { SyncRulesTable } from './editable_basic_rules_table';

interface EditFilteringFlyoutProps {
  errors: FilteringValidation[];
  hasAdvancedFilteringFeature: boolean;
  hasBasicFilteringFeature: boolean;
  revertLocalAdvancedFiltering: () => void;
  revertLocalFilteringRules: () => void;
  setIsEditing: (value: boolean) => void;
}

enum FilteringTabs {
  BASIC = 'basic',
  ADVANCED = 'advanced',
}

export const EditSyncRulesFlyout: React.FC<EditFilteringFlyoutProps> = ({
  errors,
  hasAdvancedFilteringFeature,
  hasBasicFilteringFeature,
  revertLocalFilteringRules,
  revertLocalAdvancedFiltering,
  setIsEditing,
}) => {
  const tabs: EuiTabbedContentTab[] = [
    ...(hasBasicFilteringFeature
      ? [
          {
            content: (
              <EditSyncRulesTab revertAction={revertLocalFilteringRules}>
                <SyncRulesTable />
              </EditSyncRulesTab>
            ),
            id: FilteringTabs.BASIC,
            name: i18n.translate(
              'xpack.enterpriseSearch.content.index.connector.syncRules.basicTabTitle',
              {
                defaultMessage: 'Basic rules',
              }
            ),
          },
        ]
      : []),
    ...(hasAdvancedFilteringFeature
      ? [
          {
            content: (
              <EditSyncRulesTab revertAction={revertLocalAdvancedFiltering}>
                <AdvancedSyncRules />
              </EditSyncRulesTab>
            ),
            id: FilteringTabs.ADVANCED,
            name: i18n.translate(
              'xpack.enterpriseSearch.content.index.connector.syncRules.advancedTabTitle',
              {
                defaultMessage: 'Advanced rules',
              }
            ),
          },
        ]
      : []),
  ];

  return (
    <EuiFlyout ownFocus onClose={() => setIsEditing(false)} aria-labelledby="rulesFlyout" size="l">
      <EuiFlyoutHeader>
        <EuiTitle size="m">
          <h2 id="rulesFlyout">
            {i18n.translate(
              'xpack.enterpriseSearch.content.index.connector.syncRules.flyout.title',
              {
                defaultMessage: 'Draft rules',
              }
            )}
          </h2>
        </EuiTitle>
        <EuiSpacer />
        <EuiText size="s">
          {i18n.translate(
            'xpack.enterpriseSearch.content.index.connector.syncRules.flyout.description',
            {
              defaultMessage: 'Plan and edit rules here before applying them to the next sync.',
            }
          )}
        </EuiText>
        <EuiSpacer />
        {!!errors?.length && (
          <EuiFlexGroup direction="column">
            {errors.map((error, index) => (
              <EuiFlexItem id={`${index}`} grow={false}>
                <EuiCallOut
                  color="danger"
                  title={i18n.translate(
                    'xpack.enterpriseSearch.content.index.connector.syncRules.flyout.errorTitle',
                    {
                      defaultMessage:
                        'Sync {idsLength, plural, one {rule} other {rules}} {ids} {idsLength, plural, one {is} other {are}} invalid.',
                      values: {
                        ids: error.ids.join(', '),
                        idsLength: error.ids.length,
                      },
                    }
                  )}
                >
                  <>
                    {error.messages.map((message) => (
                      <p id={message}>{message}</p>
                    ))}
                  </>
                </EuiCallOut>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        )}
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiTabbedContent tabs={tabs} />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
