/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';

import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  EuiTourStep,
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

  const TOUR_TRY_IN_CONSOLE_STORAGE_KEY = 'queryRules.tour.tryInConsole';

  const [isOpenTour, setIsOpenTour] = useState(() => {
    const storedPreference = localStorage.getItem(TOUR_TRY_IN_CONSOLE_STORAGE_KEY);
    return storedPreference === null ? true : storedPreference !== 'false';
  });

  const tourTriggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (queryRulesetData?.rules) {
      setRules(queryRulesetData.rules);
      const hasRules = queryRulesetData.rules.length > 0;
      if (!hasRules) {
        setIsOpenTour(false);
      }
    }
  }, [queryRulesetData?.rules]);

  const handleCloseTour = () => {
    localStorage.setItem(TOUR_TRY_IN_CONSOLE_STORAGE_KEY, 'false');
    setIsOpenTour(false);
  };

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
                <EuiButtonEmpty
                  buttonRef={tourTriggerRef as React.RefObject<HTMLButtonElement>}
                  iconType="database"
                  color="primary"
                  data-test-subj="queryRulesetDetailHeaderDataButton"
                  onClick={() => {
                    // Logic to handle data button click
                  }}
                >
                  <FormattedMessage
                    id="xpack.queryRules.queryRulesetDetail.dataButton"
                    defaultMessage="Data"
                  />
                </EuiButtonEmpty>

                <EuiTourStep
                  anchor={() => tourTriggerRef.current || document.body}
                  content={
                    <EuiText>
                      <p>Now you can try out the query rule results in the console</p>
                    </EuiText>
                  }
                  isStepOpen={isOpenTour}
                  minWidth={300}
                  onFinish={handleCloseTour}
                  step={1}
                  stepsTotal={1}
                  title="Test in Console"
                  anchorPosition="rightCenter"
                  zIndex={1}
                />
              </EuiFlexItem>
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
            </EuiFlexGroup>,
          ]}
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
