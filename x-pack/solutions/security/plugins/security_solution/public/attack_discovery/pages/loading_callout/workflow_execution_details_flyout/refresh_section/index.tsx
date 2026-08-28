/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiSpacer } from '@elastic/eui';
import React, { useCallback } from 'react';

import * as i18n from '../translations';

interface Props {
  onClose: () => void;
  onRefresh: () => void;
}

const RefreshSectionComponent: React.FC<Props> = ({ onClose, onRefresh }) => {
  const handleRefresh = useCallback(() => {
    onRefresh();
    onClose();
  }, [onClose, onRefresh]);

  return (
    <>
      <EuiSpacer size="m" />

      <EuiButton data-test-subj="flyoutRefreshButton" iconType="refresh" onClick={handleRefresh}>
        {i18n.REFRESH}
      </EuiButton>
    </>
  );
};

RefreshSectionComponent.displayName = 'RefreshSection';

export const RefreshSection = React.memo(RefreshSectionComponent);
