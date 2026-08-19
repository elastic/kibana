/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonEmpty,
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
  border?: boolean;
  backTo?: { path: string; label?: string };
  bottomSpacer?: boolean;
}

/** Page header for PND routes. */
export const PndPageHeader: React.FC<PndPageHeaderProps> = ({
  title,
  subtitle,
  border = false,
  backTo,
  bottomSpacer = true,
}) => {
  const history = useHistory();

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
      </EuiPageHeader>
      {bottomSpacer ? <EuiSpacer size="l" /> : null}
    </>
  );
};
