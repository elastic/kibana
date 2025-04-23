/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import type { FlyoutPanelProps } from '@kbn/expandable-flyout';
import { i18n } from '@kbn/i18n';
import {
  EuiSpacer,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  EuiTitle,
  EuiAccordion,
  EuiLink,
} from '@elastic/eui';
import { useKibana } from '../../../common/lib/kibana';
import {
  CategoryBadge,
  ESQLBadge,
  IndexStatusBadge,
} from '../../../entity_analytics/components/threat_hunting_badges';
import { ThreatHuntingQueryDiscoverLink } from '../../../entity_analytics/components/threat_hunting_query_discover_link';
import { useGetThreatHuntingQueryByUuid } from '../../../entity_analytics/api/hooks/use_get_threat_hunting_query_by_uuid';
import { LOADING_TEST_ID } from './test_ids';
import { FlyoutLoading } from '../../shared/components/flyout_loading';
import { FlyoutError } from '../../shared/components/flyout_error';
import { FlyoutHeader } from '../../shared/components/flyout_header';
import { FlyoutTitle } from '../../shared/components/flyout_title';
import { FlyoutBody } from '../../shared/components/flyout_body';

const MitreLink = ({ technique }: { technique: string }) => {
  return (
    <EuiLink
      href={`https://attack.mitre.org/techniques/${technique}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      {technique}
    </EuiLink>
  );
};

const IntegrationLink = ({ integration }: { integration: string }) => {
  const { http } = useKibana().services;

  return (
    <EuiLink
      href={http.basePath.prepend(`/app/integrations/detail/${integration}/overview`)}
      target="_blank"
      rel="noopener noreferrer"
    >
      {integration}
    </EuiLink>
  );
};

export interface ThreatHuntingQueryPanelExpandableFlyoutProps extends FlyoutPanelProps {
  key: 'threat-hunting-query-panel';
  params: {
    queryUuid: string;
    isPreviewMode?: boolean;
  };
}

export const ThreatHuntingQueryPanelKey: ThreatHuntingQueryPanelExpandableFlyoutProps['key'] =
  'threat-hunting-query-panel';

export interface ThreatHuntingQueryPanelProps extends Record<string, unknown> {
  /**
   * UUID of the query
   */
  queryUuid: string;
}

/**
 * Displays a rule overview panel
 */
export const ThreatHuntingQueryPanel: FC<ThreatHuntingQueryPanelProps> = memo(({ queryUuid }) => {
  const { data, isLoading: loading } = useGetThreatHuntingQueryByUuid(queryUuid);

  if (loading) {
    return <FlyoutLoading data-test-subj={LOADING_TEST_ID} />;
  }

  if (!data) {
    return <FlyoutError />;
  }

  const { query } = data;
  return (
    <>
      <FlyoutHeader>
        <FlyoutTitle title={query.name} />
      </FlyoutHeader>
      <FlyoutBody>
        <EuiFlexGroup direction="column" gutterSize="m">
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h3>
                {i18n.translate('xpack.securitySolution.threatHunting.flyout.summaryTitle', {
                  defaultMessage: 'Summary',
                })}
              </h3>
            </EuiTitle>

            <EuiFlexGroup direction="column" gutterSize="xs" css={{ marginTop: '12px' }}>
              <EuiFlexItem>
                <EuiText size="s">
                  <strong>
                    {i18n.translate('xpack.securitySolution.threatHunting.flyout.author', {
                      defaultMessage: 'Author:',
                    })}
                  </strong>{' '}
                  {query.author}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s">
                  <strong>
                    {i18n.translate('xpack.securitySolution.threatHunting.flyout.category', {
                      defaultMessage: 'Category:',
                    })}
                  </strong>{' '}
                  <CategoryBadge category={query.category} />
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s">
                  <strong>
                    {i18n.translate('xpack.securitySolution.threatHunting.flyout.integration', {
                      defaultMessage: 'Integration:',
                    })}
                  </strong>{' '}
                  {query.integration.map((integration, index) => (
                    <span key={index} css={{ marginRight: '4px' }}>
                      <IntegrationLink integration={integration} />
                    </span>
                  ))}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s">
                  <strong>
                    {i18n.translate('xpack.securitySolution.threatHunting.flyout.language', {
                      defaultMessage: 'Language:',
                    })}
                  </strong>{' '}
                  <ESQLBadge />
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s">
                  <strong>
                    {i18n.translate('xpack.securitySolution.threatHunting.flyout.IndexStatus', {
                      defaultMessage: 'Index Status:',
                    })}
                  </strong>{' '}
                  <IndexStatusBadge status={query.indexStatus} />
                </EuiText>
              </EuiFlexItem>
              {query.mitre && query.mitre.length > 0 && (
                <EuiFlexItem>
                  <EuiText size="s">
                    <strong>
                      {i18n.translate('xpack.securitySolution.threatHunting.flyout.mitreTactics', {
                        defaultMessage: 'MITRE Techniques:',
                      })}
                    </strong>{' '}
                    {query.mitre.map((technique, index) => (
                      <span key={index} css={{ marginRight: '4px' }}>
                        <MitreLink technique={technique} />
                      </span>
                    ))}
                  </EuiText>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiTitle size="xs">
              <h3>
                {i18n.translate('xpack.securitySolution.threatHunting.flyout.descriptionTitle', {
                  defaultMessage: 'Description',
                })}
              </h3>
            </EuiTitle>

            <EuiText size="s" css={{ marginTop: '12px' }}>
              {query.description}
            </EuiText>
          </EuiFlexItem>

          {query.notes && query.notes.length > 0 && (
            <EuiFlexItem>
              <EuiTitle size="xs">
                <h3>
                  {i18n.translate('xpack.securitySolution.threatHunting.flyout.notesTitle', {
                    defaultMessage: 'Notes',
                  })}
                </h3>
              </EuiTitle>

              <EuiText size="s" css={{ marginTop: '12px' }}>
                <ul>
                  {query.notes.map((note, index) => (
                    <li key={index}>{note}</li>
                  ))}
                </ul>
              </EuiText>
            </EuiFlexItem>
          )}

          <EuiFlexItem>
            <EuiTitle size="xs">
              <h3>
                {i18n.translate('xpack.securitySolution.threatHunting.flyout.queriesTitle', {
                  defaultMessage: 'Queries',
                })}
              </h3>
            </EuiTitle>

            <EuiFlexGroup direction="column" gutterSize="m" css={{ marginTop: '12px' }}>
              {query.queries.map((q, index) => (
                <EuiFlexItem key={index}>
                  <EuiPanel paddingSize="m" hasShadow={false} hasBorder>
                    <EuiFlexGroup direction="row" justifyContent="spaceBetween" gutterSize="s">
                      <EuiFlexItem>
                        <EuiTitle size="xxs">
                          <h4>{`Query ${index + 1}`}</h4>
                        </EuiTitle>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <ThreatHuntingQueryDiscoverLink query={q} />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                    <EuiSpacer size="s" />
                    <EuiAccordion
                      id={`query-${index}`}
                      buttonContent={`Show query`}
                      initialIsOpen={index === 0}
                      paddingSize="s"
                    >
                      <EuiCodeBlock language="esql" fontSize="s" paddingSize="m" isCopyable>
                        {q.query}
                      </EuiCodeBlock>
                    </EuiAccordion>
                  </EuiPanel>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </FlyoutBody>
    </>
  );
});

ThreatHuntingQueryPanel.displayName = 'ThreatHuntingQueryPanel';
