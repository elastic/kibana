/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldSearch,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AnalyticsLinks, AnalyticsSourceAudience } from '../../types';
import { getAnalyticsSourceGroups, getAnalyticsSources } from '../../sources';
import type { AnalyticsPageId } from './page_ids';
import { getPageTelemetryId, getPageTestSubj } from './page_ids';
import { SourceTile } from './source_tile';

interface SourcesFlyoutProps {
  page: AnalyticsPageId;
  audience: AnalyticsSourceAudience;
  links: Pick<
    AnalyticsLinks,
    'canUseIntegrations' | 'isSourceAvailable' | 'openSource' | 'browseIntegrations'
  >;
  /** The control that opened the flyout, which a source that opens a dialog returns the focus to. */
  getOpener?: () => HTMLElement | null;
  onClose: () => void;
}

/** Every way to add data, grouped by kind and searchable, kept out of the page until asked for. */
export const SourcesFlyout = ({
  page,
  audience,
  links,
  getOpener,
  onClose,
}: SourcesFlyoutProps): React.JSX.Element => {
  const titleId = useGeneratedHtmlId({ prefix: 'analyticsSourcesFlyoutTitle' });
  const [searchTerm, setSearchTerm] = useState('');

  const { isSourceAvailable } = links;
  const groups = useMemo(() => {
    const sources = getAnalyticsSources().filter(isSourceAvailable);
    return getAnalyticsSourceGroups(audience).map((group) => ({
      ...group,
      sources: sources.filter((source) => source.group === group.id),
    }));
  }, [audience, isSourceAvailable]);

  const visibleGroups = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (term === '') {
      return groups.filter(({ sources }) => sources.length > 0);
    }
    return groups
      .map((group) => ({
        ...group,
        sources: group.title.toLowerCase().includes(term)
          ? group.sources
          : group.sources.filter(
              ({ title, description }) =>
                title.toLowerCase().includes(term) || description.toLowerCase().includes(term)
            ),
      }))
      .filter(({ sources }) => sources.length > 0);
  }, [groups, searchTerm]);

  const searchLabel =
    audience === 'events'
      ? i18n.translate('xpack.searchHomepage.analytics.sourcesFlyout.searchLabel', {
          defaultMessage: 'Search event sources',
        })
      : i18n.translate('xpack.searchHomepage.analytics.sourcesFlyout.searchAllLabel', {
          defaultMessage: 'Search ways to add data',
        });

  return (
    <EuiFlyout
      onClose={onClose}
      size="m"
      aria-labelledby={titleId}
      data-test-subj={getPageTestSubj(page, 'SourcesFlyout')}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={titleId}>
            {audience === 'events'
              ? i18n.translate('xpack.searchHomepage.analytics.sourcesFlyout.title', {
                  defaultMessage: 'Event sources',
                })
              : i18n.translate('xpack.searchHomepage.analytics.sourcesFlyout.allTitle', {
                  defaultMessage: 'Add data',
                })}
          </h2>
        </EuiTitle>
        <EuiSpacer size="m" />
        <EuiFieldSearch
          fullWidth
          incremental
          value={searchTerm}
          onChange={({ target: { value } }) => setSearchTerm(value)}
          placeholder={searchLabel}
          aria-label={searchLabel}
          data-test-subj={getPageTestSubj(page, 'SourcesFlyoutSearch')}
        />
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {visibleGroups.length === 0 && (
          <EuiText size="s" color="subdued" data-test-subj={getPageTestSubj(page, 'SourcesEmpty')}>
            <p role="status">
              {i18n.translate('xpack.searchHomepage.analytics.sourcesFlyout.noMatches', {
                defaultMessage:
                  'No sources match your search. Browse all integrations to find more.',
              })}
            </p>
          </EuiText>
        )}
        {visibleGroups.map((group, index) => (
          <React.Fragment key={group.id}>
            {index > 0 && <EuiSpacer size="l" />}
            <div data-test-subj={getPageTestSubj(page, `SourceGroup-${group.id}`)}>
              <EuiTitle size="xxs">
                <h3>{group.title}</h3>
              </EuiTitle>
              <EuiText size="xs" color="subdued">
                <p>{group.description}</p>
              </EuiText>
              <EuiSpacer size="s" />
              <EuiFlexGrid columns={2} gutterSize="m">
                {group.sources.map((source) => (
                  <EuiFlexItem key={source.id}>
                    <SourceTile
                      page={page}
                      placement="Flyout"
                      source={source}
                      canUseIntegrations={links.canUseIntegrations}
                      onSelect={(selectedSource) => {
                        const opener = getOpener?.();
                        // The embedded Console opens underneath the flyout's mask.
                        onClose();
                        links.openSource(selectedSource, opener);
                      }}
                    />
                  </EuiFlexItem>
                ))}
              </EuiFlexGrid>
            </div>
          </React.Fragment>
        ))}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              flush="left"
              onClick={onClose}
              data-test-subj={getPageTestSubj(page, 'SourcesFlyoutClose')}
            >
              {i18n.translate('xpack.searchHomepage.analytics.sourcesFlyout.closeButton', {
                defaultMessage: 'Close',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip
              content={
                links.canUseIntegrations
                  ? undefined
                  : i18n.translate(
                      'xpack.searchHomepage.analytics.sourcesFlyout.browseMissingPrivilege',
                      { defaultMessage: 'You need the Integrations privilege to browse them.' }
                    )
              }
            >
              <EuiButton
                iconType="external"
                iconSide="right"
                onClick={links.browseIntegrations}
                isDisabled={!links.canUseIntegrations}
                hasAriaDisabled
                data-test-subj={getPageTestSubj(page, 'BrowseIntegrations')}
                data-telemetry-id={getPageTelemetryId(page, 'browseIntegrations')}
              >
                {i18n.translate('xpack.searchHomepage.analytics.sourcesFlyout.browseButton', {
                  defaultMessage: 'Browse all integrations',
                })}
              </EuiButton>
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
