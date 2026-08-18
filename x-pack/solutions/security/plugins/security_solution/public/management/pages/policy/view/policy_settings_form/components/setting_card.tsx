/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, ReactNode } from 'react';
import React, { memo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiHorizontalRule,
  EuiText,
  EuiShowFor,
  EuiPanel,
  EuiTextColor,
  EuiIconTip,
  EuiSpacer,
} from '@elastic/eui';

import type { OperatingSystem } from '@kbn/securitysolution-utils';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';
import { OS_TITLES } from '../../../../../common/translations';

export const SettingCardHeader = memo<{ children: React.ReactNode; 'data-test-subj'?: string }>(
  ({ children, 'data-test-subj': dataTestSubj }) => (
    <EuiTitle size="xxs" data-test-subj={dataTestSubj}>
      <h5>{children}</h5>
    </EuiTitle>
  )
);
SettingCardHeader.displayName = 'SettingCardHeader';

export type SettingCardProps = React.PropsWithChildren<{
  /**
   * Card section title (e.g. Malware, Event collection).
   **/
  type: string;
  /**
   * Types of supported operating systems.
   */
  supportedOss: OperatingSystem[];
  /**
   * Subdued summary under the title. When omitted, supported OS names are shown instead.
   */
  sectionDescription?: ReactNode;
  osRestriction?: ReactNode;
  dataTestSubj?: string;
  /** React Node to be put on the right corner of the card */
  rightCorner?: ReactNode;
  mode?: 'edit' | 'view';
  selected?: boolean;
}>;

export const SettingCard: FC<SettingCardProps> = memo(
  ({
    type,
    supportedOss,
    sectionDescription,
    osRestriction,
    dataTestSubj,
    rightCorner,
    children,
    selected = true,
    mode = 'edit',
  }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);

    return (
      <EuiPanel data-test-subj={getTestId()} hasBorder={true} hasShadow={false} paddingSize="none">
        <EuiFlexGroup
          direction="row"
          gutterSize="m"
          alignItems="flexStart"
          justifyContent="spaceBetween"
          responsive={false}
          css={({ euiTheme }) => ({
            padding: `${euiTheme.size.base} ${euiTheme.size.base} 0 ${euiTheme.size.base}`,
          })}
        >
          <EuiFlexItem grow={1}>
            <EuiTitle size="s" data-test-subj={getTestId('type')}>
              <span>{type}</span>
            </EuiTitle>
            <EuiSpacer size="xs" />
            <EuiFlexGroup
              direction="row"
              gutterSize="s"
              alignItems="center"
              wrap
              data-test-subj={getTestId('osValueContainer')}
            >
              <EuiFlexItem grow={false}>
                <EuiText size="s" color="subdued" data-test-subj={getTestId('osValues')}>
                  {sectionDescription ?? supportedOss.map((os) => OS_TITLES[os]).join(', ')}
                </EuiText>
              </EuiFlexItem>
              {osRestriction && (
                <EuiFlexItem grow={false} data-test-subj={getTestId('osRestriction')}>
                  <EuiFlexGroup direction="row" gutterSize="xs">
                    <EuiFlexItem grow={false}>
                      <EuiTextColor color="subdued">
                        <FormattedMessage
                          id="xpack.securitySolution.endpoint.policy.details.antivirusRegistration.osRestriction"
                          defaultMessage="Restrictions"
                        />
                      </EuiTextColor>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiIconTip
                        type="warning"
                        color="warning"
                        content={osRestriction}
                        anchorProps={{ 'data-test-subj': getTestId('osRestrictionTooltipIcon') }}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiShowFor sizes={['m', 'l', 'xl', 'xxl']}>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup direction="row" gutterSize="none" justifyContent="flexEnd">
                <EuiFlexItem grow={false} data-test-subj={getTestId('rightCornerContainer')}>
                  {rightCorner}
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiShowFor>
          <EuiShowFor sizes={rightCorner ? ['s', 'xs'] : []}>
            <EuiFlexItem grow={false} data-test-subj={getTestId('rightCornerContainer')}>
              {rightCorner}
            </EuiFlexItem>
          </EuiShowFor>
        </EuiFlexGroup>

        {mode === 'edit' || selected ? (
          <>
            <EuiHorizontalRule margin="m" />
            <div
              css={({ euiTheme }) => ({
                padding: `0 ${euiTheme.size.base} ${euiTheme.size.base} ${euiTheme.size.base}`,
              })}
            >
              {children}
            </div>
          </>
        ) : (
          <EuiSpacer size="m" />
        )}
      </EuiPanel>
    );
  }
);

SettingCard.displayName = 'SettingCard';
