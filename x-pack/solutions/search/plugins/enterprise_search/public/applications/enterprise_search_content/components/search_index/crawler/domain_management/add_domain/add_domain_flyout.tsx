/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues, useActions } from 'kea';

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiPortal,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { CANCEL_BUTTON_LABEL } from '../../../../../../shared/constants';

import { AddDomainForm } from './add_domain_form';
import { AddDomainFormErrors } from './add_domain_form_errors';
import { AddDomainFormSubmitButton } from './add_domain_form_submit_button';
import { AddDomainLogic } from './add_domain_logic';

export const AddDomainFlyout: React.FC = () => {
  const { isFlyoutVisible } = useValues(AddDomainLogic);
  const { closeFlyout } = useActions(AddDomainLogic);

  if (isFlyoutVisible) {
    return (
      <EuiPortal>
        <EuiFlyout onClose={closeFlyout}>
          <EuiFlyoutHeader>
            <EuiTitle size="m">
              <h2>
                {i18n.translate('xpack.enterpriseSearch.crawler.addDomainFlyout.title', {
                  defaultMessage: 'Add a new domain',
                })}
              </h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody
            banner={
              <>
                <EuiSpacer size="l" />
                <AddDomainFormErrors />
              </>
            }
          >
            <EuiText>
              {i18n.translate('xpack.enterpriseSearch.crawler.addDomainFlyout.description', {
                defaultMessage:
                  'You can add multiple domains to this index\'s web crawler. Add another domain here and modify the entry points and crawl rules from the "Manage" page.',
              })}
              <p />
            </EuiText>
            <EuiSpacer size="l" />
            <AddDomainForm />
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty onClick={closeFlyout}>{CANCEL_BUTTON_LABEL}</EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <AddDomainFormSubmitButton />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </EuiFlyout>
      </EuiPortal>
    );
  }
  return null;
};
