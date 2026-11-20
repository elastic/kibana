/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiDescriptionListProps } from '@elastic/eui';
import { FormattedDate, FormattedRelative, FormattedTime } from '@kbn/i18n-react';
import type {
  RuleLibraryListItem,
  RuleLibraryProviderType,
  RuleLibraryRefreshStatus,
} from '../types';
import * as i18n from '../translations';

const STATUS_LABEL: Record<RuleLibraryRefreshStatus, string> = {
  never_refreshed: i18n.STATUS_NEVER_REFRESHED,
  refreshed: i18n.STATUS_REFRESHED,
  refreshing: i18n.STATUS_REFRESHING,
  refresh_failed: i18n.STATUS_REFRESH_FAILED,
};

const STATUS_COLOR_TOKEN = {
  never_refreshed: 'mediumShade',
  refreshed: 'success',
  refreshing: 'primary',
  refresh_failed: 'danger',
} as const;

interface StatusIndicatorProps {
  status: RuleLibraryRefreshStatus;
  error?: string;
}

const StatusIndicator = ({ status, error }: StatusIndicatorProps) => {
  const { euiTheme } = useEuiTheme();

  const indicator = (
    <>
      <span
        aria-hidden="true"
        css={{
          display: 'inline-block',
          width: euiTheme.size.s,
          height: euiTheme.size.s,
          marginInlineEnd: euiTheme.size.xs,
          borderRadius: '50%',
          verticalAlign: 'middle',
          backgroundColor: euiTheme.colors[STATUS_COLOR_TOKEN[status]],
        }}
      />
      {STATUS_LABEL[status]}
    </>
  );

  if (status !== 'refresh_failed' || !error) {
    return indicator;
  }

  return (
    <EuiToolTip content={error}>
      <span tabIndex={0}>{indicator}</span>
    </EuiToolTip>
  );
};

const PROVIDER_ICON: Record<RuleLibraryProviderType, string> = {
  fleet: 'productFleet',
  git: 'branch',
  s3: 'logoAWS',
};

const getSummaryFacts = (library: RuleLibraryListItem): EuiDescriptionListProps['listItems'] => [
  ...(library.version ? [{ title: i18n.FACT_VERSION, description: library.version }] : []),
  {
    title: i18n.FACT_PROVIDER,
    description: (
      <>
        <EuiIcon
          type={PROVIDER_ICON[library.provider]}
          size="s"
          css={{ verticalAlign: 'text-bottom' }}
          aria-hidden={true}
        />{' '}
        {library.provider}
      </>
    ),
  },
  ...(library.license ? [{ title: i18n.FACT_LICENSE, description: library.license }] : []),
  {
    title: i18n.FACT_SCOPE,
    description: library.scope === 'space' ? i18n.FACT_SCOPE_SPACE : i18n.FACT_SCOPE_SHARED,
  },
];

const getSourceFacts = ({
  sourceUrl,
  branch,
}: RuleLibraryListItem): EuiDescriptionListProps['listItems'] =>
  sourceUrl
    ? [
        {
          title: i18n.FACT_SOURCE,
          description: (
            <>
              {sourceUrl}
              {branch ? (
                <>
                  {' '}
                  <EuiBadge color="hollow" iconType="branch">
                    {branch}
                  </EuiBadge>
                </>
              ) : null}
            </>
          ),
        },
      ]
    : [];

const getRefreshFacts = (library: RuleLibraryListItem): EuiDescriptionListProps['listItems'] => [
  {
    title: i18n.FACT_STATUS,
    description: <StatusIndicator status={library.refreshStatus} error={library.lastError} />,
  },
  {
    title: i18n.FACT_LAST_REFRESH,
    description: library.refreshedAt ? (
      <EuiToolTip
        content={
          <>
            <FormattedDate value={library.refreshedAt} year="numeric" month="short" day="2-digit" />{' '}
            <FormattedTime value={library.refreshedAt} timeZoneName="short" />
          </>
        }
      >
        <span tabIndex={0}>
          <FormattedRelative value={library.refreshedAt} />
        </span>
      </EuiToolTip>
    ) : (
      i18n.FACT_NEVER_REFRESHED
    ),
  },
];

const FactsLine = ({ listItems }: { listItems: EuiDescriptionListProps['listItems'] }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexItem grow={false} css={{ minHeight: euiTheme.size.l, justifyContent: 'center' }}>
      <EuiDescriptionList
        type="inline"
        compressed
        listItems={listItems}
        descriptionProps={{ css: { marginInlineEnd: euiTheme.size.base } }}
      />
    </EuiFlexItem>
  );
};

interface LibraryHeaderProps {
  library: RuleLibraryListItem;
  canRefresh: boolean;
  onRefresh: (libraryId: string) => void;
}

export const LibraryHeader = ({ library, canRefresh, onRefresh }: LibraryHeaderProps) => (
  <EuiPanel hasBorder paddingSize="m" data-test-subj="ruleLibraryHeader">
    <EuiFlexGroup gutterSize="m" alignItems="flexStart" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiIcon type={library.icon} size="xl" aria-hidden={true} />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiTitle size="s">
          <h2>{library.title}</h2>
        </EuiTitle>
        {library.description ? (
          <EuiText size="s" color="subdued">
            {library.description}
          </EuiText>
        ) : null}
        <EuiSpacer size="s" />
        <EuiFlexGroup direction="column" gutterSize="xs">
          <FactsLine listItems={getSummaryFacts(library)} />
          {library.sourceUrl ? <FactsLine listItems={getSourceFacts(library)} /> : null}
          <FactsLine listItems={getRefreshFacts(library)} />
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          size="s"
          iconType="refresh"
          isLoading={library.refreshStatus === 'refreshing'}
          isDisabled={!canRefresh}
          onClick={() => onRefresh(library.id)}
          data-test-subj="refreshRuleLibraryButton"
        >
          {i18n.REFRESH_NOW}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiPanel>
);
