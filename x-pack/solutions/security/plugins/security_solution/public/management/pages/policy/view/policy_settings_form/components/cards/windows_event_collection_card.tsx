/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { OperatingSystem } from '@kbn/securitysolution-utils';
import type { EventFormOption } from '../event_collection_card';
import { EventCollectionCard } from '../event_collection_card';
import type { PolicyFormComponentCommonProps } from '../../types';
import { POLICY_EVENT_COLLECTION_LABELS } from '../../../../../../../../common/endpoint/models/policy_settings_ui_labels';

const OPTIONS: ReadonlyArray<EventFormOption<OperatingSystem.WINDOWS>> =
  POLICY_EVENT_COLLECTION_LABELS.windows.map(({ field, label }) => ({
    name: label,
    protectionField: field,
  }));

export type WindowsEventCollectionCardProps = PolicyFormComponentCommonProps;

export const WindowsEventCollectionCard = memo<WindowsEventCollectionCardProps>((props) => {
  return (
    <EventCollectionCard<OperatingSystem.WINDOWS>
      {...props}
      os={OperatingSystem.WINDOWS}
      selection={props.policy.windows.events}
      options={OPTIONS}
    />
  );
});
WindowsEventCollectionCard.displayName = 'WindowsEventCollectionCard';
