/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink, EuiPanel, EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { css } from '@emotion/css';
import { ILM_LOCATOR_ID, IlmLocatorParams } from '@kbn/index-lifecycle-management-common-shared';
import {
  IngestStreamEffectiveLifecycle,
  IngestStreamGetResponse,
  isDslLifecycle,
  isErrorLifecycle,
  isIlmLifecycle,
  isUnwiredStreamDefinition,
} from '@kbn/streams-schema';
import { useStreamsAppBreadcrumbs } from '../../hooks/use_streams_app_breadcrumbs';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { EntityOverviewTabList } from '../entity_overview_tab_list';
import { LoadingPanel } from '../loading_panel';
import { StreamsAppPageBody } from '../streams_app_page_body';
import { StreamsAppPageHeader } from '../streams_app_page_header';
import { StreamsAppPageHeaderTitle } from '../streams_app_page_header/streams_app_page_header_title';
import { useKibana } from '../../hooks/use_kibana';

export interface EntityViewTab {
  name: string;
  label: string;
  content: React.ReactElement;
}

export function EntityDetailViewWithoutParams({
  selectedTab,
  tabs,
  entity,
  definition,
}: {
  selectedTab: string;
  tabs: EntityViewTab[];
  entity: {
    displayName?: string;
    id: string;
  };
  definition?: IngestStreamGetResponse;
}) {
  const router = useStreamsAppRouter();
  useStreamsAppBreadcrumbs(() => {
    if (!entity.displayName) {
      return [];
    }

    return [
      {
        title: entity.displayName,
        path: `/{key}`,
        params: { path: { key: entity.id } },
      } as const,
    ];
  }, [entity.displayName, entity.id]);

  if (!entity.displayName) {
    return <LoadingPanel />;
  }

  const tabMap = Object.fromEntries(
    tabs.map((tab) => {
      return [
        tab.name,
        {
          href: router.link('/{key}/{tab}', {
            path: { key: entity.id, tab: tab.name },
          }),
          label: tab.label,
          content: tab.content,
        },
      ];
    })
  );

  const selectedTabObject = tabMap[selectedTab];

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="none"
      className={css`
        max-width: 100%;
      `}
    >
      <EuiFlexItem grow={false}>
        <EuiPanel color="transparent">
          <EuiLink data-test-subj="streamsEntityDetailViewGoBackHref" href={router.link('/')}>
            <EuiFlexGroup direction="row" alignItems="center" gutterSize="s">
              <EuiIcon type="arrowLeft" />
              {i18n.translate('xpack.streams.entityDetailView.goBackLinkLabel', {
                defaultMessage: 'Back',
              })}
            </EuiFlexGroup>
          </EuiLink>
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <StreamsAppPageHeader
          verticalPaddingSize="none"
          title={
            <StreamsAppPageHeaderTitle
              title={
                <EuiFlexGroup gutterSize="s" alignItems="center">
                  {entity.displayName}
                  {definition && isUnwiredStreamDefinition(definition.stream) ? (
                    <>
                      {' '}
                      <EuiBadge>
                        {i18n.translate(
                          'xpack.streams.entityDetailViewWithoutParams.unmanagedBadgeLabel',
                          { defaultMessage: 'Classic' }
                        )}
                      </EuiBadge>
                    </>
                  ) : null}
                  {definition && <LifecycleBadge lifecycle={definition.effective_lifecycle} />}
                </EuiFlexGroup>
              }
            />
          }
        >
          <EntityOverviewTabList
            tabs={Object.entries(tabMap).map(([tabKey, { label, href }]) => {
              return {
                name: tabKey,
                label,
                href,
                selected: selectedTab === tabKey,
              };
            })}
          />
        </StreamsAppPageHeader>
      </EuiFlexItem>
      <StreamsAppPageBody>{selectedTabObject.content}</StreamsAppPageBody>
    </EuiFlexGroup>
  );
}

function LifecycleBadge({ lifecycle }: { lifecycle: IngestStreamEffectiveLifecycle }) {
  const {
    dependencies: {
      start: { share },
    },
  } = useKibana();
  const ilmLocator = share.url.locators.get<IlmLocatorParams>(ILM_LOCATOR_ID);

  if (isIlmLifecycle(lifecycle)) {
    return (
      <EuiBadge color="hollow">
        <EuiLink
          data-test-subj="streamsAppLifecycleBadgeIlmPolicyNameLink"
          color="text"
          href={ilmLocator?.getRedirectUrl({
            page: 'policy_edit',
            policyName: lifecycle.ilm.policy,
          })}
        >
          {i18n.translate('xpack.streams.entityDetailViewWithoutParams.ilmBadgeLabel', {
            defaultMessage: 'ILM Policy: {name}',
            values: { name: lifecycle.ilm.policy },
          })}
        </EuiLink>
      </EuiBadge>
    );
  }

  if (isErrorLifecycle(lifecycle)) {
    return (
      <EuiBadge color="hollow">
        {i18n.translate('xpack.streams.entityDetailViewWithoutParams.errorBadgeLabel', {
          defaultMessage: 'Error: {message}',
          values: { message: lifecycle.error.message },
        })}
      </EuiBadge>
    );
  }
  if (isDslLifecycle(lifecycle)) {
    return (
      <EuiBadge color="hollow">
        {i18n.translate('xpack.streams.entityDetailViewWithoutParams.dslBadgeLabel', {
          defaultMessage: 'Retention: {retention}',
          values: { retention: lifecycle.dsl.data_retention || '∞' },
        })}
      </EuiBadge>
    );
  }

  return (
    <EuiBadge color="hollow">
      {i18n.translate('xpack.streams.entityDetailViewWithoutParams.disabledLifecycleBadgeLabel', {
        defaultMessage: 'Retention: Disabled',
      })}
    </EuiBadge>
  );
}
