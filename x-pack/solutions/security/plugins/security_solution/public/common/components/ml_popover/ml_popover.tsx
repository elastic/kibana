/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiHeaderSectionItemButton,
  EuiPopover,
  EuiPopoverTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { useState } from 'react';
import styled from 'styled-components';
import { useSecurityJobs } from './hooks/use_security_jobs';
import * as i18n from './translations';
import { UpgradeContents } from './upgrade_contents';
import { MlJobSettingsContent } from './ml_job_settings_content';

const PopoverContentsDiv = styled.div`
  max-width: 684px;
  max-height: 90vh;
  overflow-y: auto;
  overflow-x: hidden;
  padding-bottom: 15px;
`;

PopoverContentsDiv.displayName = 'PopoverContentsDiv';

export const MlPopover = React.memo(() => {
  const mlPopoverTitleId = useGeneratedHtmlId();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const { isMlAdmin, isLicensed, refetch: refreshJobs } = useSecurityJobs();

  if (!isLicensed) {
    // If the user does not have platinum show upgrade UI
    return (
      <EuiPopover
        anchorPosition="downRight"
        aria-label={i18n.ML_JOB_SETTINGS}
        id="integrations-popover"
        button={
          <EuiHeaderSectionItemButton
            aria-expanded={isPopoverOpen}
            aria-haspopup="true"
            aria-label={i18n.ML_JOB_SETTINGS}
            color="primary"
            data-test-subj="integrations-button"
            iconType="chevronSingleDown"
            iconSide="right"
            onClick={() => setIsPopoverOpen(!isPopoverOpen)}
            textProps={{ style: { fontSize: '1rem' } }}
          >
            {i18n.ML_JOB_SETTINGS}
          </EuiHeaderSectionItemButton>
        }
        isOpen={isPopoverOpen}
        closePopover={() => setIsPopoverOpen(!isPopoverOpen)}
        repositionOnScroll
      >
        <UpgradeContents />
      </EuiPopover>
    );
  } else if (isMlAdmin) {
    // If the user has Platinum License & ML Admin Permissions, show Anomaly Detection button & full config UI
    return (
      <EuiPopover
        anchorPosition="downRight"
        aria-labelledby={mlPopoverTitleId}
        id="integrations-popover"
        button={
          <EuiHeaderSectionItemButton
            aria-expanded={isPopoverOpen}
            aria-haspopup="true"
            aria-label={i18n.ML_JOB_SETTINGS}
            color="primary"
            data-test-subj="integrations-button"
            iconType="chevronSingleDown"
            iconSide="right"
            onClick={() => {
              setIsPopoverOpen(!isPopoverOpen);
              refreshJobs();
            }}
            textProps={{ style: { fontSize: '1rem' } }}
          >
            {i18n.ML_JOB_SETTINGS}
          </EuiHeaderSectionItemButton>
        }
        isOpen={isPopoverOpen}
        closePopover={() => setIsPopoverOpen(!isPopoverOpen)}
        repositionOnScroll
      >
        <PopoverContentsDiv data-test-subj="ml-popover-contents">
          <EuiPopoverTitle id={mlPopoverTitleId}>{i18n.ML_JOB_SETTINGS}</EuiPopoverTitle>
          <MlJobSettingsContent />
        </PopoverContentsDiv>
      </EuiPopover>
    );
  } else {
    // If the user has Platinum License & not ML Admin, hide Anomaly Detection button as they don't have permissions to configure
    return null;
  }
});

MlPopover.displayName = 'MlPopover';
