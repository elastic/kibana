/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiLink, EuiPageTemplate, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ElasticAgentCardIllustration } from '@kbn/shared-ux-card-no-data';
import type { ReactNode } from 'react';
import React from 'react';
import { css } from '@emotion/react';

interface NoDataProps {
  titleText: string;
  bodyText: string | ReactNode;
  refetchText?: string;
  onRefetch?: () => void;
  testString?: string;
}

export const NoData: React.FC<NoDataProps> = ({
  titleText,
  bodyText,
  refetchText,
  onRefetch,
  testString,
}) => {
  const showRefetchButton = refetchText && onRefetch;

  return (
    <EuiPageTemplate.EmptyPrompt
      data-test-subj={testString}
      title={
        <h2>{titleText}</h2>
      }
      titleSize="s"
      icon={<ElasticAgentCardIllustration />}
      body={<p>{bodyText}</p>}
      actions={
        showRefetchButton ? (
          <EuiButton
            data-test-subj="infraNoDataButton"
            iconType="refresh"
            color="primary"
            fill
            onClick={onRefetch}
          >
            {refetchText}
          </EuiButton>
        ) : undefined
      }
      footer={
        <>
          <EuiTitle size="xxs">
            <span>
              {i18n.translate('xpack.infra.noData.learnMore', {
                defaultMessage: 'Want to learn more?',
              })}
            </span>
          </EuiTitle>
          <EuiLink href="#" onClick={(e) => e.preventDefault()} data-test-subj="infraNoDataReadTheDocsLink">
            {i18n.translate('xpack.infra.noData.readTheDocs', {
              defaultMessage: 'Read the docs',
            })}
          </EuiLink>
        </>
      }
    />
  );
};
