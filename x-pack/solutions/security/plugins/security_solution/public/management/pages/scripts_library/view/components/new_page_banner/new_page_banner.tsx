/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiSpacer,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import { IconScriptLibrary } from '../../../../../../common/icons/script_library';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';

interface NewPageBannerProps {
  onDismiss: () => void;
  'data-test-subj'?: string;
}
const Icon = () => {
  return <IconScriptLibrary height={24} />;
};

export const NewPageBanner: React.FC<NewPageBannerProps> = ({
  onDismiss,
  'data-test-subj': dataTestSubj,
}) => {
  const getTestId = useTestIdGenerator(dataTestSubj);
  const { euiTheme } = useEuiTheme();

  const bannerStyle = useMemo(
    () => ({
      borderRadius: euiTheme.border.radius.medium,
      padding: `${euiTheme.size.base} ${euiTheme.size.xxl} ${euiTheme.size.base} ${euiTheme.size.base}`,
    }),
    [euiTheme]
  );
  return (
    <>
      <EuiCallOut
        announceOnMount
        color="primary"
        onDismiss={onDismiss}
        data-test-subj={getTestId('new-page-banner')}
        style={bannerStyle}
      >
        <EuiFlexGroup direction="row" gutterSize="s" alignItems="center" justifyContent="flexStart">
          <EuiFlexItem grow={false} data-test-subj={getTestId('banner-icon')}>
            <EuiIcon type={Icon} aria-hidden={true} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiTitle size="m">
              <h4>
                <FormattedMessage
                  id="xpack.securitySolution.management.scriptsLibrary.newPageBanner.title"
                  defaultMessage="New: Script library"
                />
              </h4>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem>
            <FormattedMessage
              id="xpack.securitySolution.management.scriptsLibrary.newPageBanner.description"
              defaultMessage="Upload and manage reusable scripts to run on endpoints protected by Elastic Defend."
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiLink
              href="https://www.elastic.co/guide/en/security/current/scripts-library.html"
              target="_blank"
              data-test-subj={getTestId('new-page-banner-learn-more-link')}
            >
              <FormattedMessage
                id="xpack.securitySolution.management.scriptsLibrary.newPageBanner.learnMoreLink"
                defaultMessage="learn more"
              />
            </EuiLink>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiCallOut>
      <EuiSpacer size="l" />
    </>
  );
};
