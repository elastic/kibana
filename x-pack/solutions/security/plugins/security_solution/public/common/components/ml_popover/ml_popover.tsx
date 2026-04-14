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
  EuiSpacer,
} from '@elastic/eui';
import React, { useState } from 'react';
import styled from 'styled-components';
import { MlJobsAdminFields } from './ml_jobs_admin_fields';
import { useMlJobsSettingsData } from './hooks/use_ml_jobs_settings_data';
import * as i18n from './translations';
import { UpgradeContents } from './upgrade_contents';

const PopoverContentsDiv = styled.div`
  max-width: 684px;
  max-height: 90vh;
  overflow-y: auto;
  overflow-x: hidden;
  padding-bottom: 15px;
`;

PopoverContentsDiv.displayName = 'PopoverContentsDiv';

export const MlPopover = React.memo(() => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const data = useMlJobsSettingsData();

  if (data.variant === 'hidden') {
    return null;
  }

  if (data.variant === 'upgrade') {
    return (
      <EuiPopover
        anchorPosition="downRight"
        id="integrations-popover"
        button={
          <EuiHeaderSectionItemButton
            aria-expanded={isPopoverOpen}
            aria-haspopup="true"
            aria-label={i18n.ML_JOB_SETTINGS}
            color="primary"
            data-test-subj="integrations-button"
            iconType="arrowDown"
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
  }

  const { refreshJobs, admin } = data;

  return (
    <EuiPopover
      anchorPosition="downRight"
      id="integrations-popover"
      button={
        <EuiHeaderSectionItemButton
          aria-expanded={isPopoverOpen}
          aria-haspopup="true"
          aria-label={i18n.ML_JOB_SETTINGS}
          color="primary"
          data-test-subj="integrations-button"
          iconType="arrowDown"
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
        <EuiPopoverTitle>{i18n.ML_JOB_SETTINGS}</EuiPopoverTitle>
        <MlJobsAdminFields admin={admin} />
      </PopoverContentsDiv>
    </EuiPopover>
  );
});

MlPopover.displayName = 'MlPopover';
