/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import {
  EuiButton,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiTitle,
  EuiIllustration,
} from '@elastic/eui';
import { useCaseDataviz } from '@elastic/eui-illustrations';

import { FormattedMessage } from '@kbn/i18n-react';
import { TryInConsoleButton } from '@kbn/try-in-console';
import { i18n } from '@kbn/i18n';
import { PLUGIN_TITLE } from '../../../common';
import { docLinks } from '../../../common/doc_links';

import { CREATE_QUERY_RULE_SET_API_SNIPPET } from '../../../common/constants';

import { useKibana } from '../../hooks/use_kibana';
import { AnalyticsEvents } from '../../analytics/constants';
import { useUsageTracker } from '../../hooks/use_usage_tracker';

interface EmptyPromptProps {
  getStartedAction: () => void;
}
export const EmptyPrompt: React.FC<EmptyPromptProps> = ({ getStartedAction }) => {
  const usageTracker = useUsageTracker();
  const { application, share, console: consolePlugin } = useKibana().services;

  useEffect(() => {
    usageTracker?.load(AnalyticsEvents.emptyPromptLoaded);
  }, [usageTracker]);

  return (
    <EuiEmptyPrompt
      color="plain"
      hasShadow={true}
      title={
        <h2>
          <FormattedMessage
            id="xpack.queryRules.emptyPrompt.title"
            defaultMessage="Add business logic to your search with {pluginTitle}"
            values={{ pluginTitle: PLUGIN_TITLE }}
          />
        </h2>
      }
      layout="horizontal"
      icon={
        <EuiIllustration
          type={useCaseDataviz}
          alt={PLUGIN_TITLE}
          style={{ maxInlineSize: 180, marginInline: 'auto' }}
        />
      }
      body={

        <p>
          <FormattedMessage
            id="xpack.queryRules.emptyPrompt.subtitle"
            defaultMessage="Enhance the search experience with custom query rules that allow you to filter and prioritize results based on your business logic."
          />
        </p>

      }
      actions={
        [
          <EuiButton
            iconSide="left"
            iconType="plusCircle"
            color="primary"
            fill
            onClick={() => {
              usageTracker?.click(AnalyticsEvents.gettingStartedButtonClicked);
              getStartedAction();
            }}
          >
            <FormattedMessage
              id="xpack.queryRules.emptyPrompt.getStartedButton"
              defaultMessage="Create your first ruleset"
            />
          </EuiButton>,
          <TryInConsoleButton
            application={application}
            sharePlugin={share ?? undefined}
            consolePlugin={consolePlugin ?? undefined}
            request={CREATE_QUERY_RULE_SET_API_SNIPPET}
            type="emptyButton"
            buttonProps={{
              size: 'm',
            }}
            content={i18n.translate('xpack.queryRules.emptyPrompt.TryInConsoleLabel', {
              defaultMessage: 'Create in Console',
            })}
            showIcon
            data-test-subj={AnalyticsEvents.createInConsoleClicked}
          />
        ]}
      footer={
        <EuiFlexGroup direction="row" alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiTitle size="xxs">
              <span>
                <FormattedMessage
                  id="xpack.queryRules.emptyPrompt.footer"
                  defaultMessage="Prefer to use the APIs?"
                />
              </span>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiLink
              data-test-subj="searchQueryRulesEmptyPromptFooterLink"
              href={docLinks.queryRulesApi}
              target="_blank"
              external
            >
              <FormattedMessage
                id="xpack.queryRules.emptyPrompt.footerLink"
                defaultMessage="View documentation"
              />
            </EuiLink>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    />
  );
};
