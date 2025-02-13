/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButton, EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { FilteringValidationState } from '@kbn/search-connectors';

interface FilteringStatusCalloutsProps {
  applyDraft: () => void;
  editDraft: () => void;
  state: FilteringValidationState;
}

export const SyncRulesStateCallouts: React.FC<FilteringStatusCalloutsProps> = ({
  applyDraft,
  editDraft,
  state,
}) => {
  switch (state) {
    case FilteringValidationState.EDITED:
      return (
        <EuiCallOut
          color="warning"
          title={
            <EuiFlexGroup>
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner />
              </EuiFlexItem>
              <EuiFlexItem>
                {i18n.translate(
                  'xpack.enterpriseSearch.index.connector.syncRules.validatingTitle',
                  {
                    defaultMessage: 'Draft sync rules are validating',
                  }
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          }
        >
          <EuiFlexGroup direction="column">
            <EuiFlexItem>
              {i18n.translate(
                'xpack.enterpriseSearch.index.connector.syncRules.validatingDescription',
                {
                  defaultMessage:
                    'Draft rules need to be validated before they can be activated. This may take a few minutes.',
                }
              )}
            </EuiFlexItem>
            <EuiFlexItem>
              <span>
                <EuiButton
                  data-telemetry-id="entSearchContent-connector-syncRules-validatingCallout-editRules"
                  onClick={editDraft}
                  color="warning"
                  fill
                >
                  {i18n.translate(
                    'xpack.enterpriseSearch.index.connector.syncRules.validatingCallout.editDraftRulesTitle',
                    {
                      defaultMessage: 'Edit draft rules',
                    }
                  )}
                </EuiButton>
              </span>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiCallOut>
      );
    case FilteringValidationState.INVALID:
      return (
        <EuiCallOut
          color="danger"
          iconType="cross"
          title={i18n.translate('xpack.enterpriseSearch.index.connector.syncRules.invalidTitle', {
            defaultMessage: 'Draft sync rules are invalid',
          })}
        >
          <EuiFlexGroup direction="column">
            <EuiFlexItem>
              {i18n.translate(
                'xpack.enterpriseSearch.index.connector.syncRules.invalidDescription',
                {
                  defaultMessage:
                    'Draft rules did not validate. Edit the draft rules before they can be activated.',
                }
              )}
            </EuiFlexItem>
            <EuiFlexItem>
              <span>
                <EuiButton
                  data-telemetry-id="entSearchContent-connector-syncRules-errorCallout-editRules"
                  onClick={editDraft}
                  color="danger"
                  fill
                >
                  {i18n.translate(
                    'xpack.enterpriseSearch.index.connector.syncRules.errorCallout.editDraftRulesTitle',
                    {
                      defaultMessage: 'Edit draft rules',
                    }
                  )}
                </EuiButton>
              </span>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiCallOut>
      );
    case FilteringValidationState.VALID:
      return (
        <EuiCallOut
          color="success"
          iconType="check"
          title={i18n.translate('xpack.enterpriseSearch.index.connector.syncRules.validatedTitle', {
            defaultMessage: 'Draft sync rules validated',
          })}
        >
          <EuiFlexGroup direction="column">
            <EuiFlexItem>
              {i18n.translate(
                'xpack.enterpriseSearch.index.connector.syncRules.validatedDescription',
                {
                  defaultMessage: 'Activate draft rules to take effect on the next sync.',
                }
              )}
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFlexGroup justifyContent="flexStart">
                <EuiFlexItem grow={false}>
                  <span>
                    <EuiButton
                      data-telemetry-id="entSearchContent-connector-syncRules-successCallout-applyRules"
                      onClick={applyDraft}
                      color="success"
                      fill
                    >
                      {i18n.translate(
                        'xpack.enterpriseSearch.index.connector.syncRules.successCallout.applyDraftRulesTitle',
                        {
                          defaultMessage: 'Activate draft rules',
                        }
                      )}
                    </EuiButton>
                  </span>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <span>
                    <EuiButton
                      data-telemetry-id="entSearchContent-connector-syncRules-successCallout-editRules"
                      onClick={editDraft}
                      color="success"
                    >
                      {i18n.translate(
                        'xpack.enterpriseSearch.index.connector.syncRules.errorCallout.successEditDraftRulesTitle',
                        {
                          defaultMessage: 'Edit draft rules',
                        }
                      )}
                    </EuiButton>
                  </span>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiCallOut>
      );
    default:
      return <></>;
  }
};
