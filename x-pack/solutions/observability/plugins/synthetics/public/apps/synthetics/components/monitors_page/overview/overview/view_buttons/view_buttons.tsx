/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiButtonGroup, IconType } from '@elastic/eui';
import { OverviewView } from '../../../../../state';
import { useViewButtons } from './hooks/use_view_buttons';
import { CARD_VIEW_LABEL, COMPACT_VIEW_LABEL, VIEW_LEGEND } from './labels';
import { useOverviewStatus } from '../../../hooks/use_overview_status';

const toggleButtonsIcons: Array<{ id: OverviewView; iconType: IconType; label: string }> = [
  {
    id: `cardView`,
    iconType: 'apps',
    label: CARD_VIEW_LABEL,
  },
  {
    id: 'compactView',
    iconType: 'tableDensityCompact',
    label: COMPACT_VIEW_LABEL,
  },
];

export const ViewButtons = () => {
  const { status, loaded } = useOverviewStatus({
    scopeStatusByLocation: true,
  });

  const { onChangeView, view } = useViewButtons();

  return (
    <EuiButtonGroup
      buttonSize="compressed"
      options={toggleButtonsIcons}
      idSelected={view}
      onChange={onChangeView}
      isIconOnly
      isDisabled={!status || !loaded}
      legend={VIEW_LEGEND}
    />
  );
};
