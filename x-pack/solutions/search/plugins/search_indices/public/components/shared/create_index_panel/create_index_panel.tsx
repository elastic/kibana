/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTextAlign,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { docLinks } from '../../../../common/doc_links';
import { useKibana } from '../../../hooks/use_kibana';
import { CreateIndexViewMode } from '../../../types';
import { CreateIndexCalloutBrowseIntegrationBtn } from './callout_browse_integration_stack';
import { CreateIndexPanelCreateO11ySpaceBtn } from './callout_create_o11y_space_stack';

const WIDTH = '980px';

export interface CreateIndexPanelProps {
  children: React.ReactNode | React.ReactNode[];
  createIndexView: CreateIndexViewMode;
  onChangeView: (id: string) => void;
  onClose: () => void;
  showSkip?: boolean;
  title?: React.ReactNode;
}

export const CreateIndexPanel = ({
  children,
  createIndexView,
  onChangeView,
  onClose,
  showSkip,
  title,
}: CreateIndexPanelProps) => {
  const { cloud, http } = useKibana().services;
  const { euiTheme } = useEuiTheme();

  const isServerless: boolean = cloud?.isServerlessEnabled ?? false;

  const o11yTrialLink = useMemo(() => {
    if (cloud && cloud.isServerlessEnabled) {
      const baseUrl = cloud?.projectsUrl ?? 'https://cloud.elastic.co/projects/';
      return `${baseUrl}create/observability/start`;
    }
    return http.basePath.prepend('/app/observability/onboarding');
  }, [cloud, http]);

  return (
    <>
      <EuiPanel
        color="subdued"
        hasShadow={false}
        hasBorder
        style={{
          width: WIDTH,
          margin: '0 auto',
          padding: euiTheme.size.l,
          paddingTop: euiTheme.size.m,
        }}
      >
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiButtonIcon
            data-test-subj="closeCreateIndex"
            iconType="cross"
            onClick={onClose}
            color="text"
            aria-label={i18n.translate('xpack.searchIndices.shared.createIndex.closeAriaLabel', {
              defaultMessage: 'Close create index',
            })}
          />
        </EuiFlexGroup>
        <EuiPanel
          color="transparent"
          paddingSize="none"
          style={{
            paddingLeft: euiTheme.size.m,
            paddingRight: euiTheme.size.m,
          }}
        >
          <EuiFlexGroup alignItems="center" gutterSize="m">
            <EuiFlexItem grow={false}>
              <EuiIcon type="logoElasticsearch" size="xl" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="xs">
                <h1>
                  {i18n.translate('xpack.searchIndices.shared.createIndex.pageTitle', {
                    defaultMessage: 'Elasticsearch',
                  })}
                </h1>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          <EuiTitle size="l">
            <h2>
              {i18n.translate('xpack.searchIndices.shared.createIndex.pageDescription', {
                defaultMessage: 'Get started with Elasticsearch',
              })}
            </h2>
          </EuiTitle>
        </EuiPanel>
        <EuiSpacer size="l" />
        <EuiPanel>
          <EuiFlexGroup direction="column" gutterSize="m">
            <EuiFlexGroup alignItems="center">
              <EuiFlexItem>
                <EuiTitle size="xs">
                  <h4>
                    {title ??
                      i18n.translate('xpack.searchIndices.shared.createIndex.defaultTitle', {
                        defaultMessage: 'Create an index',
                      })}
                  </h4>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonGroup
                  legend={i18n.translate(
                    'xpack.searchIndices.shared.createIndex.viewSelect.legend',
                    {
                      defaultMessage: 'Create index view selection',
                    }
                  )}
                  options={[
                    {
                      id: CreateIndexViewMode.UI,
                      label: i18n.translate(
                        'xpack.searchIndices.shared.createIndex.viewSelect.ui',
                        {
                          defaultMessage: 'UI',
                        }
                      ),
                      'data-test-subj': 'createIndexUIViewBtn',
                    },
                    {
                      id: CreateIndexViewMode.Code,
                      label: i18n.translate(
                        'xpack.searchIndices.shared.createIndex.viewSelect.code',
                        {
                          defaultMessage: 'Code',
                        }
                      ),
                      'data-test-subj': 'createIndexCodeViewBtn',
                    },
                  ]}
                  buttonSize="compressed"
                  idSelected={createIndexView}
                  onChange={onChangeView}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiText color="subdued">
              <p>
                {i18n.translate('xpack.searchIndices.shared.createIndex.description', {
                  defaultMessage:
                    'An index stores your data and defines the schema, or field mappings, for your searches',
                })}
              </p>
            </EuiText>
            {children}
          </EuiFlexGroup>
        </EuiPanel>

        <EuiSpacer />
        <EuiPanel color="transparent">
          <EuiTextAlign textAlign="center">
            <EuiTitle size="xs">
              <h5>
                {i18n.translate(
                  'xpack.searchIndices.shared.createIndex.observabilityCallout.title',
                  {
                    defaultMessage: 'Looking to store your logs or metrics data?',
                  }
                )}
              </h5>
            </EuiTitle>
          </EuiTextAlign>
          <EuiSpacer size="m" />
          <EuiFlexGroup alignItems="center" justifyContent="center">
            <EuiFlexItem grow={false}>
              {isServerless ? (
                <EuiButtonEmpty
                  color="text"
                  iconSide="right"
                  iconType="popout"
                  data-test-subj="analyzeLogsBtn"
                  href={docLinks.analyzeLogs}
                  target="_blank"
                >
                  {i18n.translate(
                    'xpack.searchIndices.shared.createIndex.observabilityCallout.logs.button',
                    {
                      defaultMessage: 'Collect and analyze logs',
                    }
                  )}
                </EuiButtonEmpty>
              ) : (
                <CreateIndexCalloutBrowseIntegrationBtn />
              )}

              <EuiText color="subdued" size="s" textAlign="center">
                <small>
                  {i18n.translate(
                    'xpack.searchIndices.shared.createIndex.observabilityCallout.logs.subTitle',
                    {
                      defaultMessage: 'Explore Logstash and Beats',
                    }
                  )}
                </small>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText>or</EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {isServerless ? (
                <EuiButtonEmpty
                  color="text"
                  iconSide="right"
                  iconType="popout"
                  data-test-subj="startO11yTrialBtn"
                  href={o11yTrialLink}
                  target="_blank"
                >
                  {i18n.translate(
                    'xpack.searchIndices.shared.createIndex.observabilityCallout.o11yTrial.button',
                    {
                      defaultMessage: 'Start an Observability trial',
                    }
                  )}
                </EuiButtonEmpty>
              ) : (
                <CreateIndexPanelCreateO11ySpaceBtn />
              )}
              <EuiText color="subdued" size="s" textAlign="center">
                <small>
                  {i18n.translate(
                    'xpack.searchIndices.shared.createIndex.observabilityCallout.o11yTrial.subTitle',
                    {
                      defaultMessage: 'Powerful performance monitoring',
                    }
                  )}
                </small>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiPanel>
      {showSkip === true && (
        <>
          <EuiSpacer />
          <EuiFlexGroup justifyContent="center">
            <EuiButtonEmpty onClick={onClose} data-test-subj="createIndexSkipBtn">
              {i18n.translate('xpack.searchIndices.shared.createIndex.skipLabel', {
                defaultMessage: 'Skip',
              })}
            </EuiButtonEmpty>
          </EuiFlexGroup>
        </>
      )}
    </>
  );
};
