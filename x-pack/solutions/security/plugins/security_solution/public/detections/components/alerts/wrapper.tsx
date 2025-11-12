/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';

import { SourcererScopeName } from '../../../sourcerer/store/model';
import { AlertsPageContent } from './content';
import { PAGE_TITLE } from '../../pages/alerts/translations';
import { DetectionsWrapper } from '../common/detections_wrapper';

/**
 * Retrieves the dataView for the alerts page then renders the alerts page when the dataView is valid.
 * Shows a loading skeleton while retrieving.
 * Shows an error message if the dataView is invalid.
 */
export const Wrapper = memo(() => {
  return (
    <DetectionsWrapper scope={SourcererScopeName.detections} title={PAGE_TITLE}>
      {({ dataView, oldSourcererDataViewSpec, runtimeMappings }) => (
        <AlertsPageContent
          dataView={dataView}
          oldSourcererDataViewSpec={oldSourcererDataViewSpec}
          runtimeMappings={runtimeMappings}
        />
      )}
    </DetectionsWrapper>
  );
});

Wrapper.displayName = 'Wrapper';
