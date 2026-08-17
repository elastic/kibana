/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageHeader,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import * as i18n from './translations';

export interface PndPageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Controls rendered inline to the left of the title (same header row). */
  leftSideItems?: React.ReactNode[];
  rightSideItems?: React.ReactNode[];
  border?: boolean;
  backTo?: { path: string; label?: string };
  bottomSpacer?: boolean;
}

/**
 * Page header for PND routes.
 *
 * Important: keep everything in `EuiPageHeader` children and do **not** pass
 * `rightSideItems` into EUI. When `rightSideItems` is set, EUI leaves the
 * children-only path and prepends an `EuiSpacer` before custom children —
 * which pushes Watches (and any page with actions) down vs placeholders.
 */
export const PndPageHeader: React.FC<PndPageHeaderProps> = ({
  title,
  subtitle,
  leftSideItems,
  rightSideItems,
  border = false,
  backTo,
  bottomSpacer = true,
}) => {
  const history = useHistory();
  const leadingItems = leftSideItems?.filter(Boolean) ?? [];
  const trailingItems = rightSideItems?.filter(Boolean) ?? [];

  return (
    <>
      {backTo ? (
        <>
          <EuiButtonEmpty
            iconType="chevronSingleLeft"
            flush="left"
            onClick={() => history.push(backTo.path)}
            data-test-subj="pndPageHeaderBack"
          >
            {backTo.label ?? i18n.BACK_DEFAULT}
          </EuiButtonEmpty>
          <EuiSpacer size="s" />
        </>
      ) : null}
      <EuiPageHeader alignItems="center" bottomBorder={border} data-test-subj="pndPageHeader">
        <EuiFlexGroup
          alignItems="center"
          justifyContent="spaceBetween"
          gutterSize="l"
          responsive={false}
          wrap
        >
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              {leadingItems.map((item, index) => (
                <EuiFlexItem key={index} grow={false}>
                  {item}
                </EuiFlexItem>
              ))}
              <EuiFlexItem grow={false}>
                <EuiTitle size="l">
                  <h1>{title}</h1>
                </EuiTitle>
                {subtitle ? (
                  <>
                    <EuiSpacer size="xs" />
                    <EuiText color="subdued" size="s">
                      {typeof subtitle === 'string' ? <p>{subtitle}</p> : subtitle}
                    </EuiText>
                  </>
                ) : null}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          {trailingItems.length > 0 ? (
            <EuiFlexItem grow={false}>
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
                {trailingItems.map((item, index) => (
                  <EuiFlexItem key={index} grow={false}>
                    {item}
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      </EuiPageHeader>
      {bottomSpacer ? <EuiSpacer size="l" /> : null}
    </>
  );
};
