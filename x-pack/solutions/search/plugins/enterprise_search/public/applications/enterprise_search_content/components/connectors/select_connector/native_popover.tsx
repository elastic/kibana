/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { css } from '@emotion/react';

import {
  EuiPopover,
  EuiPopoverTitle,
  EuiText,
  EuiPopoverFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiPopoverProps,
  useEuiTheme,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

interface NativePopoverProps {
  button: EuiPopoverProps['button'];
  closePopover: () => void;
  isPopoverOpen: boolean;
}

export const NativePopover: React.FC<NativePopoverProps> = ({
  button,
  isPopoverOpen,
  closePopover,
}) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiPopover
      button={button}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      <EuiPopoverTitle>
        {i18n.translate(
          'xpack.enterpriseSearch.content.newIndex.selectConnectore.nativePopover.title',
          {
            defaultMessage: 'Elastic Cloud',
          }
        )}
      </EuiPopoverTitle>
      <EuiText
        grow={false}
        size="s"
        css={css`
          max-width: calc(${euiTheme.size.xl} * 10);
        `}
      >
        <p>
          {i18n.translate(
            'xpack.enterpriseSearch.content.newIndex.selectConnectore.nativePopover.description',
            {
              defaultMessage:
                'Elastic managed connectors are hosted on Elastic Cloud. Get started with a free 14-day trial.',
            }
          )}
        </p>
      </EuiText>
      <EuiPopoverFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="entSearchContent-connectors-nativePopover-trialButton"
              data-telemetry-id="entSearchContent-connectors-nativePopover-trialButton"
              iconType="popout"
              target="_blank"
              href="https://www.elastic.co/cloud/cloud-trial-overview"
            >
              {i18n.translate(
                'xpack.enterpriseSearch.content.newIndex.selectConnector.cloudTrialButton',
                {
                  defaultMessage: 'Elastic Cloud Trial',
                }
              )}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPopoverFooter>
    </EuiPopover>
  );
};
