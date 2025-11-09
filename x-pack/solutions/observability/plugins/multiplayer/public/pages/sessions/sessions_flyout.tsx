/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlyout, EuiFlyoutBody, EuiFlyoutFooter, EuiFlyoutHeader, EuiTitle } from '@elastic/eui';
import React from 'react';
import { OutPortal, createHtmlPortalNode } from 'react-reverse-portal';

export const mpEditFormFooterPortal = createHtmlPortalNode();

// eslint-disable-next-line import/no-default-export
export default function SessionsFlyout({ onClose }: { onClose: () => void }) {
  return (
    <EuiFlyout onClose={onClose} size="l" maxWidth={620} ownFocus>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s" data-test-subj="addmpFlyoutTitle">
          <h3 id="flyoutTitle">Poop</h3>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>Poop</EuiFlyoutBody>
      <EuiFlyoutFooter>
        <OutPortal node={mpEditFormFooterPortal} />
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
