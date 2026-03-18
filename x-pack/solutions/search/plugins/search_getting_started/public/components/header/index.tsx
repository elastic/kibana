/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiLink,
  EuiPanel,
  EuiTitle,
  EuiSpacer,
  EuiText,
  EuiButtonEmpty,
  EuiButtonIcon,
  useCurrentEuiBreakpoint,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { SEARCH_HOMEPAGE } from '@kbn/deeplinks-search';
import { useAssetBasePath } from '../../hooks/use_asset_base_path';
import { useKibana } from '../../hooks/use_kibana';
import { PLUGIN_NAME } from '../../../common';
import { docLinks } from '../../common/doc_links';
import { SearchGettingStartedSectionHeading } from '../section_heading';
import { AddDataButton } from './add_data_button';
import { ElasticsearchConnectionDetails } from '../elasticsearch_connection_details';

const skipAndGoHomeLabel = i18n.translate('xpack.search.gettingStarted.page.headerCtaEmpty', {
  defaultMessage: 'Skip and go to Home',
});

export const SearchGettingStartedHeader: React.FC = () => {
  const assetBasePath = useAssetBasePath();
  const currentBreakpoint = useCurrentEuiBreakpoint();
  const {
    services: { application, cloud, kibanaVersion },
  } = useKibana();

  return (
    <EuiFlexGroup gutterSize={currentBreakpoint === 'xl' ? 'l' : 'xl'} direction="column">
      <EuiFlexGroup gutterSize="m" alignItems="stretch" direction="rowReverse">
        <EuiFlexItem>
          <EuiImage size="xl" src={`${assetBasePath}/search_getting_started_header.svg`} alt="" />
        </EuiFlexItem>
        <EuiFlexItem style={{ alignSelf: 'center' }}>
          <EuiPanel color="transparent" paddingSize="none">
            <SearchGettingStartedSectionHeading title={PLUGIN_NAME} icon="launch" />
            <EuiSpacer size="s" />
            <EuiTitle size="l">
              <h1>
                {i18n.translate('xpack.search.gettingStarted.page.title', {
                  defaultMessage: 'Start building with Elasticsearch.',
                })}
              </h1>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiText grow={false}>
              <p>
                {i18n.translate('xpack.search.gettingStarted.page.description', {
                  defaultMessage:
                    'Dive into an API tutorial or connect your deployment to start building.',
                })}
              </p>
            </EuiText>
            <EuiSpacer size="l" />
            <EuiFlexGroup gutterSize="m" responsive={false}>
              <EuiFlexItem grow={false}>
                <AddDataButton />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  aria-label={skipAndGoHomeLabel}
                  data-test-subj="skipAndGoHomeBtn"
                  onClick={() => {
                    application.navigateToApp(SEARCH_HOMEPAGE);
                  }}
                  color="text"
                >
                  {skipAndGoHomeLabel}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiLink
                      data-test-subj="gettingStarted-kibana-version"
                      color="text"
                      target="_blank"
                      href={
                        !cloud?.isServerlessEnabled
                          ? docLinks.hostedCloudReleaseNotes
                          : docLinks.serverlessReleaseNotes
                      }
                    >
                      <FormattedMessage
                        id="xpack.search.gettingStarted.versionTextLabel"
                        defaultMessage="{version}"
                        values={{
                          version: !cloud?.isServerlessEnabled ? `v${kibanaVersion}` : 'Changelog',
                        }}
                      />
                    </EuiLink>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiCopy textToCopy={`v${kibanaVersion}`}>
                      {(copy) => (
                        <EuiButtonIcon
                          aria-label={i18n.translate(
                            'xpack.search.gettingStarted.versionCopyButton',
                            { defaultMessage: 'Copy version to clipboard' }
                          )}
                          data-test-subj="gettingStarted-copy-version"
                          iconType="copyClipboard"
                          color="text"
                          size="xs"
                          onClick={copy}
                        />
                      )}
                    </EuiCopy>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
      <ElasticsearchConnectionDetails />
    </EuiFlexGroup>
  );
};
