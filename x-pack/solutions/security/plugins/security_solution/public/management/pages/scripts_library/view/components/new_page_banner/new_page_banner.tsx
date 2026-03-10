/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiSpacer,
  EuiTitle,
  type EuiIconProps,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';
import { ScriptPageBannerIcon } from './banner_icon';

export type BannerIconProps = Omit<EuiIconProps, 'type'>;

export const BannerIcon = () => {
  return <EuiIcon type={ScriptPageBannerIcon} size="xxl" aria-hidden={true} />;
};

interface NewPageBannerProps {
  onDismiss: () => void;
  'data-test-subj'?: string;
}

export const NewPageBanner: React.FC<NewPageBannerProps> = ({
  onDismiss,
  'data-test-subj': dataTestSubj,
}) => {
  const getTestId = useTestIdGenerator(dataTestSubj);
  return (
    <>
      <EuiCallOut announceOnMount color="primary" onDismiss={onDismiss} iconType="info">
        <EuiFlexGroup direction="row" gutterSize="s" alignItems="flexEnd">
          <EuiFlexItem grow={false} alignSelf="flexStart" data-test-subj={getTestId('banner-icon')}>
            <BannerIcon />
          </EuiFlexItem>
          <EuiFlexItem data-test-subj={getTestId('info-text')}>
            <EuiFlexGroup direction="column" gutterSize="xs">
              <EuiFlexItem>
                <EuiTitle size="m">
                  <h4>
                    <FormattedMessage
                      id="xpack.securitySolution.management.scriptsLibrary.newPageBanner.title"
                      defaultMessage="New: Scripts library"
                    />
                  </h4>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem>
                <FormattedMessage
                  id="xpack.securitySolution.management.scriptsLibrary.newPageBanner.description"
                  defaultMessage="Create and manage reusable scripts that can be run on endpoints during investigations and response."
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false} alignSelf="flexEnd">
            <EuiLink
              href="https://www.elastic.co/guide/en/security/current/scripts-library.html"
              target="_blank"
              data-test-subj={getTestId('learn-more-link')}
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
