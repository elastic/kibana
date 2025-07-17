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
  actionButtons?: React.ReactNode;
  closeButtonText?: string;
  closeModal: () => void;
}

const FooterComponent: React.FC<Props> = ({
  actionButtons,
  closeButtonText = i18n.CLOSE,
  closeModal,
}) => {
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
          {closeButtonText}
        </EuiButtonEmpty>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>{actionButtons}</EuiFlexItem>
    </EuiFlexGroup>
  );
};

FooterComponent.displayName = 'Footer';

export const Footer = React.memo(FooterComponent);
