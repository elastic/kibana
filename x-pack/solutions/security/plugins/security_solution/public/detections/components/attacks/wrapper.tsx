/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';

import { SourcererScopeName } from '../../../sourcerer/store/model';
import { AttacksPageContent } from './content';
import { PAGE_TITLE } from '../../pages/attacks/translations';
import { DetectionsWrapper } from '../common/detections_wrapper';

/**
 * Retrieves the dataView for the attacks page then renders the attacks page when the dataView is valid.
 * Shows a loading skeleton while retrieving.
 * Shows an error message if the dataView is invalid.
 */
export const Wrapper = memo(() => {
  return (
    // TODO: Switch to `SourcererScopeName.attacks` data view scope once available
    <DetectionsWrapper scope={SourcererScopeName.detections} title={PAGE_TITLE}>
      {({ dataView, oldSourcererDataViewSpec }) => (
        <AttacksPageContent
          dataView={dataView}
          oldSourcererDataViewSpec={oldSourcererDataViewSpec}
        />
      )}
    </DetectionsWrapper>
  );
});
Wrapper.displayName = 'Wrapper';
