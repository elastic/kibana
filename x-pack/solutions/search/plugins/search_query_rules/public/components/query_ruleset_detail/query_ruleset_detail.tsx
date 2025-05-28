/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import {
  EuiButton,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPopover,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useParams } from 'react-router-dom';
import { QueryRulesQueryRule } from '@elastic/elasticsearch/lib/api/types';
import { i18n } from '@kbn/i18n';
import { PLUGIN_ROUTE_ROOT } from '../../../common/api_routes';
import { useKibana } from '../../hooks/use_kibana';
import { useFetchQueryRuleset } from '../../hooks/use_fetch_query_ruleset';
import { ErrorPrompt } from '../error_prompt/error_prompt';
import { isNotFoundError, isPermissionError } from '../../utils/query_rules_utils';
import { QueryRulesPageTemplate } from '../../layout/query_rules_page_template';
import { QueryRuleDetailPanel } from './query_rule_detail_panel';
import { UseRunQueryRuleset } from '../../hooks/use_run_query_ruleset';
import { DeleteRulesetModal } from '../query_rules_sets/delete_ruleset_modal';

export const QueryRulesetDetail: React.FC = () => {
  const {
    services: { application, http },
  } = useKibana();
  const { rulesetId = '' } = useParams<{
    rulesetId?: string;
  }>();

  const {
    data: queryRulesetData,
    isInitialLoading,
    isError,
    error,
  } = useFetchQueryRuleset(rulesetId);

  const [rules, setRules] = useState<QueryRulesQueryRule[]>(queryRulesetData?.rules ?? []);

  const [isPopoverOpen, setPopover] = useState(false);
  const splitButtonPopoverId = useGeneratedHtmlId({
    prefix: 'splitButtonPopover',
  });

  const onButtonClick = () => {
    setPopover(!isPopoverOpen);
  };

  const closePopover = () => {
    setPopover(false);
  };
  const items = [
    <EuiContextMenuItem
      color="danger"
      key="delete"
      icon="trash"
      onClick={() => setRulesetToDelete(rulesetId)}
    >
      Delete ruleset
    </EuiContextMenuItem>,
  ];

  const [rulesetToDelete, setRulesetToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (queryRulesetData?.rules) {
      setRules(queryRulesetData.rules);
    }
  }, [queryRulesetData?.rules]);

  return (
    <QueryRulesPageTemplate>
      {!isInitialLoading && !isError && !!queryRulesetData && (
        <KibanaPageTemplate.Header
          pageTitle={rulesetId}
          breadcrumbs={[
            {
              text: (
                <>
                  <EuiIcon size="s" type="arrowLeft" />{' '}
                  {i18n.translate('xpack.queryRules.queryRulesetDetail.backButton', {
                    defaultMessage: 'Back',
                  })}
                </>
              ),
              color: 'primary',
              'aria-current': false,
              href: '#',
              onClick: (e) =>
                application.navigateToUrl(http.basePath.prepend(`${PLUGIN_ROUTE_ROOT}`)),
            },
          ]}
          restrictWidth
          color="primary"
          data-test-subj="queryRulesetDetailHeader"
          rightSideItems={[
            <EuiFlexGroup alignItems="center" key="queryRulesetDetailHeaderButtons">
              <EuiFlexItem grow={false}>
                <UseRunQueryRuleset
                  rulesetId={rulesetId}
                  type="contextMenuItem"
                  content={i18n.translate('xpack.queryRules.queryRulesetDetail.testButton', {
                    defaultMessage: 'Test in Console',
                  })}
                />
              </EuiFlexItem>
              <EuiFlexGroup responsive={false} gutterSize="xs" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiButton
                    iconType="save"
                    fill
                    color="primary"
                    data-test-subj="queryRulesetDetailHeaderSaveButton"
                    onClick={() => {
                      // Logic to save the query ruleset
                    }}
                  >
                    <FormattedMessage
                      id="xpack.queryRules.queryRulesetDetail.saveButton"
                      defaultMessage="Save"
                    />
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiPopover
                    id={splitButtonPopoverId}
                    button={
                      <EuiButtonIcon
                        data-test-subj="searchQueryRulesQueryRulesetDetailButton"
                        display="fill"
                        size="m"
                        iconType="boxesVertical"
                        aria-label="More"
                        onClick={onButtonClick}
                      />
                    }
                    isOpen={isPopoverOpen}
                    closePopover={closePopover}
                    panelPaddingSize="none"
                    anchorPosition="downLeft"
                  >
                    <EuiContextMenuPanel size="s" items={items} />
                  </EuiPopover>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexGroup>,
          ]}
        />
      )}
      {rulesetToDelete && (
        <DeleteRulesetModal
          rulesetId={rulesetToDelete}
          closeDeleteModal={() => {
            setRulesetToDelete(null);
          }}
          onSuccess={() => {
            application.navigateToUrl(http.basePath.prepend(`${PLUGIN_ROUTE_ROOT}`));
          }}
        />
      )}
      {!isError && <QueryRuleDetailPanel rules={rules} setRules={setRules} />}
      {isError && (
        <ErrorPrompt
          errorType={
            isPermissionError(error)
              ? 'missingPermissions'
              : isNotFoundError(error)
              ? 'notFound'
              : 'generic'
          }
          data-test-subj="queryRulesetDetailErrorPrompt"
        />
      )}
    </QueryRulesPageTemplate>
  );
};
