/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { OverviewStatusMetaData } from '../../../../../../../../../common/runtime_types';
import { ActionsPopover } from '../../actions_popover';

export const MonitorsActions = ({ monitor }: { monitor: OverviewStatusMetaData }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  return (
    <ActionsPopover
      isPopoverOpen={isPopoverOpen}
      locationId={monitor.locationId}
      monitor={monitor}
      position="default"
      setIsPopoverOpen={setIsPopoverOpen}
    />
  );
};
