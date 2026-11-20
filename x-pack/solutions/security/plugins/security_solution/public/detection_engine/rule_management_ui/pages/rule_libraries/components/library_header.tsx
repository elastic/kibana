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
import type { RuleLibraryListItem, RuleLibraryProviderType, RuleLibrarySyncStatus } from '../types';
import * as i18n from '../translations';
import { LibraryActionsMenu } from './library_actions_menu';

const STATUS_LABEL: Record<RuleLibrarySyncStatus, string> = {
  never_synced: i18n.STATUS_NEVER_SYNCED,
  synced: i18n.STATUS_SYNCED,
  syncing: i18n.STATUS_SYNCING,
  sync_failed: i18n.STATUS_SYNC_FAILED,
};

const STATUS_COLOR_TOKEN = {
  never_synced: 'mediumShade',
  synced: 'success',
  syncing: 'primary',
  sync_failed: 'danger',
} as const;

interface StatusIndicatorProps {
  status: RuleLibrarySyncStatus;
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

  if (status !== 'sync_failed' || !error) {
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

const getSyncFacts = (library: RuleLibraryListItem): EuiDescriptionListProps['listItems'] => [
  {
    title: i18n.FACT_STATUS,
    description: <StatusIndicator status={library.syncStatus} error={library.lastError} />,
  },
  {
    title: i18n.FACT_LAST_SYNC,
    description: library.syncedAt ? (
      <EuiToolTip
        content={
          <>
            <FormattedDate value={library.syncedAt} year="numeric" month="short" day="2-digit" />{' '}
            <FormattedTime value={library.syncedAt} timeZoneName="short" />
          </>
        }
      >
        <span tabIndex={0}>
          <FormattedRelative value={library.syncedAt} />
        </span>
      </EuiToolTip>
    ) : (
      i18n.FACT_NEVER_SYNCED
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
  canSync: boolean;
  canRemove: boolean;
  onSync: (libraryId: string) => void;
  onRemove: (libraryId: string) => void;
}

export const LibraryHeader = ({
  library,
  canSync,
  canRemove,
  onSync,
  onRemove,
}: LibraryHeaderProps) => (
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
          <FactsLine listItems={getSyncFacts(library)} />
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              iconType="refresh"
              isLoading={library.syncStatus === 'syncing'}
              isDisabled={!canSync || library.syncStatus === 'syncing'}
              onClick={() => onSync(library.id)}
              data-test-subj="syncRuleLibraryButton"
            >
              {i18n.SYNC_NOW}
            </EuiButton>
          </EuiFlexItem>
          {library.group === 'custom' ? (
            <EuiFlexItem grow={false}>
              <LibraryActionsMenu canRemove={canRemove} onRemove={() => onRemove(library.id)} />
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiPanel>
);
