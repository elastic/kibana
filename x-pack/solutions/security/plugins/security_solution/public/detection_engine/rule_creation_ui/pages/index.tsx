/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { EuiResizableContainerActions } from '@elastic/eui/src/components/resizable_container/types';
import React, { memo } from 'react';
import * as i18n from './translations';
import { HeaderPage } from '../../../common/components/header_page';
import type { HeaderPageProps } from '../../../common/components/header_page';

const CustomHeaderPage: React.FC<
  HeaderPageProps & {
    togglePanel: EuiResizableContainerActions['togglePanel'] | undefined;
    isRulePreviewVisible: boolean;
    setIsRulePreviewVisible: (value: React.SetStateAction<boolean>) => void;
    addToChatButton?: React.ReactNode;
  }
> = ({
  backOptions,
  isLoading,
  title,
  togglePanel,
  isRulePreviewVisible,
  setIsRulePreviewVisible,
  backComponent,
  addToChatButton,
}) => (
  <HeaderPage
    backOptions={backOptions}
    isLoading={isLoading}
    title={title}
    backComponent={backComponent}
  >
    <EuiFlexGroup gutterSize="s" alignItems="center">
      {addToChatButton && <EuiFlexItem grow={false}>{addToChatButton}</EuiFlexItem>}
      <EuiFlexItem grow={false}>
        <EuiButton
          data-test-subj="preview-container"
          isSelected={isRulePreviewVisible}
          fill={isRulePreviewVisible}
          iconType="visBarVerticalStacked"
          onClick={() => {
            togglePanel?.('preview', { direction: 'left' });
            setIsRulePreviewVisible((isVisible) => !isVisible);
          }}
        >
          {i18n.RULE_PREVIEW_TITLE}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  </HeaderPage>
);

export const CustomHeaderPageMemo = memo(CustomHeaderPage);
