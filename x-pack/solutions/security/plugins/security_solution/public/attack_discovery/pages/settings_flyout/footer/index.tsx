/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';

import * as i18n from './translations';

interface Props {
  closeModal: () => void;
  actionButtons?: React.ReactNode;
}

const FooterComponent: React.FC<Props> = ({ closeModal, actionButtons }) => {
  return (
    <EuiFlexGroup
      alignItems="center"
      data-test-subj="footer"
      gutterSize="none"
      justifyContent="spaceBetween"
      responsive={false}
    >
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty data-test-subj="close" onClick={closeModal} size="s">
          {i18n.CLOSE}
        </EuiButtonEmpty>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>{actionButtons}</EuiFlexItem>
    </EuiFlexGroup>
  );
};

FooterComponent.displayName = 'Footer';

export const Footer = React.memo(FooterComponent);
