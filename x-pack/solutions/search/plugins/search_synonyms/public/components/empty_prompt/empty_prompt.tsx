/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButton, EuiLink, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiEmptyPrompt } from '@elastic/eui';
import { highFive } from '@elastic/eui-illustrations';
import { EuiIllustration } from '@elastic/eui';
import { docLinks } from '../../../common/doc_links';

interface EmptyPromptProps {
  getStartedAction: () => void;
}
export const EmptyPrompt: React.FC<EmptyPromptProps> = ({ getStartedAction }) => {
  return (
    <EuiEmptyPrompt
      layout="horizontal"
      color="plain"
      icon={
        <EuiIllustration
          type={highFive}
          alt=""
          style={{ maxInlineSize: 180, marginInline: 'auto' }}
        />
      }
      title={
        <h2 style={{ whiteSpace: 'nowrap' }}>
          <FormattedMessage
            id="xpack.searchSynonyms.emptyPrompt.title"
            defaultMessage="Search with synonyms"
          />
        </h2>
      }
      body={
        <p>
          <FormattedMessage
            id="xpack.searchSynonyms.emptyPrompt.subtitle"
            defaultMessage="Create and manage Elasticsearch synonym sets and rules, which expand search results by matching different terms that express the same concept."
          />
        </p>
      }
      actions={
        <EuiButton
          color="primary"
          fill
          iconType="plusCircle"
          iconSide="left"
          onClick={getStartedAction}
          data-test-subj="searchSynonymsEmptyPromptGetStartedButton"
        >
          <FormattedMessage
            id="xpack.searchSynonyms.emptyPrompt.getStartedButton"
            defaultMessage="Create a synonym set"
          />
        </EuiButton>
      }
      footer={
        <>
          <EuiTitle size="xxs">
            <span>
              <FormattedMessage
                id="xpack.searchSynonyms.emptyPrompt.footer"
                defaultMessage="Prefer to use the APIs?"
              />
            </span>
          </EuiTitle>{' '}
          <EuiLink
            data-test-subj="searchSynonymsEmptyPromptFooterLink"
            href={docLinks.synonymsApi}
            target="_blank"
            external
          >
            <FormattedMessage
              id="xpack.searchSynonyms.emptyPrompt.footerLink"
              defaultMessage="View documentation"
            />
          </EuiLink>
        </>
      }
    />
  );
};
