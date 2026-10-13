/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { IocCategoryRow } from './parse_iocs';

export const INVESTIGATION_IOCS_FLYOUT_TEST_ID = 'investigationIocsFlyout';

export const INVESTIGATION_IOCS_FLYOUT_TITLE = i18n.translate(
  'xpack.securitySolution.agentBuilder.investigationIocs.flyoutTitle',
  { defaultMessage: 'IOCs' }
);

const copyValueAriaLabel = (value: string) =>
  i18n.translate('xpack.securitySolution.agentBuilder.investigationIocs.copyValueAriaLabel', {
    defaultMessage: 'Copy {value}',
    values: { value },
  });

export interface InvestigationIocsFlyoutProps {
  categories: IocCategoryRow[];
}

/** Category list shown when an indicator summary row is opened. */
export const InvestigationIocsFlyout = ({ categories }: InvestigationIocsFlyoutProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlyoutBody data-test-subj={INVESTIGATION_IOCS_FLYOUT_TEST_ID}>
      <EuiTitle size="s" css={css({ marginBottom: euiTheme.size.l })}>
        <h2>{INVESTIGATION_IOCS_FLYOUT_TITLE}</h2>
      </EuiTitle>

      {categories.map((category, index) => (
        <div
          key={category.id}
          css={css({ marginTop: index === 0 ? 0 : euiTheme.size.xl })}
          data-test-subj="investigationIocsCategory"
        >
          <EuiTitle size="xxs" css={css({ marginBottom: euiTheme.size.s })}>
            <h3>{category.typeLabel}</h3>
          </EuiTitle>
          <EuiFlexGroup gutterSize="s" wrap responsive={false} alignItems="center">
            {category.items.map((item, itemIndex) => (
              <EuiFlexItem
                key={`${item.value}-${itemIndex}`}
                grow={false}
                css={css({ maxInlineSize: '100%' })}
              >
                <EuiCopy textToCopy={item.value}>
                  {(copy) => {
                    const badge = (
                      <EuiBadge
                        color="hollow"
                        iconType="copy"
                        iconSide="right"
                        onClick={copy}
                        onClickAriaLabel={copyValueAriaLabel(item.value)}
                        title={item.comment ? undefined : item.value}
                        data-test-subj="investigationIocsValue"
                        css={css({ maxInlineSize: '100%' })}
                      >
                        <span
                          css={css({
                            display: 'inline-block',
                            maxInlineSize: '240px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            verticalAlign: 'bottom',
                          })}
                        >
                          {item.value}
                        </span>
                      </EuiBadge>
                    );

                    if (!item.comment) {
                      return badge;
                    }

                    return (
                      <EuiToolTip content={item.comment} position="top">
                        {badge}
                      </EuiToolTip>
                    );
                  }}
                </EuiCopy>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </div>
      ))}
    </EuiFlyoutBody>
  );
};
