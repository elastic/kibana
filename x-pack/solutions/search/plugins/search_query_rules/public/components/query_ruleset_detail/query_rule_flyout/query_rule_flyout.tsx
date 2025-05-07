/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import {
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useFetchQueryRule } from '../../../hooks/use_fetch_query_rule';
import { QueryRuleFlyoutBody, QueryRuleFlyoutPanel } from '../styles';
import { QueryRuleMetadataEditor } from './query_rule_metadata_editor';

export interface QueryRuleFlyoutProps {
  onClose: () => void;
  ruleId: string;
  rulesetId: string;
}

export const QueryRuleFlyout: React.FC<QueryRuleFlyoutProps> = ({ onClose, ruleId, rulesetId }) => {
  // TODO get from API or props
  const { euiTheme } = useEuiTheme();

  const { data } = useFetchQueryRule(rulesetId, ruleId);
  const [actionType, setActionType] = React.useState<'pinned' | 'exclude'>(data?.type ?? 'pinned');
  useEffect(() => {
    if (data) {
      setActionType(data.type);
    }
  }, [data]);

  return (
    <EuiFlyout onClose={() => {}} ownFocus={false} size="l" aria-labelledby="flyoutTitle">
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup direction="column">
          <EuiFlexItem>
            <EuiTitle size="m" id="flyoutTitle">
              <h2>
                <FormattedMessage
                  id="xpack.search.queryRulesetDetail.queryRuleFlyoutTitle.create"
                  defaultMessage="Create rule"
                />
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup responsive={false}>
              <EuiFlexItem>
                <FormattedMessage
                  defaultMessage="Rule ID: {ruleId}"
                  id="xpack.search.queryRulesetDetail.queryRuleFlyout.ruleId"
                  values={{ ruleId }}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody css={QueryRuleFlyoutBody}>
        <EuiFlexGroup gutterSize="none" css={QueryRuleFlyoutPanel(euiTheme)}>
          <EuiFlexItem grow>
            <EuiPanel hasBorder paddingSize="l" borderRadius="none">
              <EuiFlexGroup responsive={false} alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiButtonGroup
                    legend="Action Type"
                    className="eui-displayInlineBlock"
                    options={[
                      {
                        id: 'pinned',
                        label: (
                          <>
                            <EuiIcon type="pin" size="m" />
                            &nbsp;
                            <FormattedMessage
                              id="xpack.search.queryRulesetDetail.queryRuleFlyout.actionType.pinned"
                              defaultMessage="Pinned"
                            />
                          </>
                        ),
                      },
                      {
                        id: 'exclude',
                        label: (
                          <>
                            <EuiIcon type="eyeClosed" size="m" />
                            &nbsp;
                            <FormattedMessage
                              id="xpack.search.queryRulesetDetail.queryRuleFlyout.actionType.exclude"
                              defaultMessage="Exclude"
                            />
                          </>
                        ),
                      },
                    ]}
                    onChange={(id) => {
                      setActionType(id as 'pinned' | 'exclude');
                    }}
                    buttonSize="compressed"
                    type="single"
                    idSelected={actionType}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    <p>
                      {actionType === 'pinned' ? (
                        <FormattedMessage
                          id="xpack.search.queryRulesetDetail.queryRuleFlyout.actionType.pinned.description"
                          defaultMessage="Pin documents to the top of the search results."
                        />
                      ) : (
                        <FormattedMessage
                          id="xpack.search.queryRulesetDetail.queryRuleFlyout.actionType.exclude.description"
                          defaultMessage="Exclude documents from the search results."
                        />
                      )}
                    </p>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiHorizontalRule />
            </EuiPanel>
          </EuiFlexItem>
          <EuiFlexItem grow>
            <EuiPanel hasBorder paddingSize="l" borderRadius="none">
              {data &&
                data.criteria &&
                (Array.isArray(data?.criteria) ? (
                  data?.criteria.map((criteria, index) => (
                    <QueryRuleMetadataEditor
                      criteria={criteria}
                      key={`${criteria.type}-${index}`}
                      onChange={(newCriteria) => {
                        // Logic to handle criteria change
                      }}
                      onRemove={() => {
                        // Logic to handle criteria removal
                      }}
                    />
                  ))
                ) : (
                  <QueryRuleMetadataEditor
                    criteria={data?.criteria}
                    onChange={(newCriteria) => {
                      // Logic to handle criteria change
                    }}
                    onRemove={() => {
                      // Logic to handle criteria removal
                    }}
                  />
                ))}
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
