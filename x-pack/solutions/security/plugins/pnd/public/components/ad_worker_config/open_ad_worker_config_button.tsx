/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AdWorkerConfigFlyout } from './ad_worker_config_flyout';

/**
 * Button that opens the Attack Discovery Worker config flyout. Self-contained (owns the open state)
 * so it can be dropped onto any PND page.
 */
export const OpenAdWorkerConfigButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <EuiButton
        iconType="gear"
        onClick={() => setIsOpen(true)}
        data-test-subj="openAdWorkerConfig"
      >
        {i18n.translate('xpack.pnd.adWorkerConfig.openButton', {
          defaultMessage: 'Configure Attack Discovery Worker',
        })}
      </EuiButton>
      {isOpen && <AdWorkerConfigFlyout onClose={() => setIsOpen(false)} />}
    </>
  );
};
