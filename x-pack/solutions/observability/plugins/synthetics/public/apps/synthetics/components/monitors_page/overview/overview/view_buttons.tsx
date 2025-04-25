/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect } from 'react';
import { EuiButtonGroup, IconType } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useDispatch, useSelector } from 'react-redux';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import {
  DEFAULT_OVERVIEW_VIEW,
  OverviewView,
  isOverviewView,
  selectOverviewState,
  setOverviewViewAction,
} from '../../../../state';
import { useOverviewStatus } from '../../hooks/use_overview_status';
import { useUrlParams } from '../../../../hooks';

const CARD_VIEW_LABEL = i18n.translate('xpack.synthetics.overview.grid.cardView.label', {
  defaultMessage: 'Card view',
});

const COMPACT_VIEW_LABEL = i18n.translate('xpack.synthetics.overview.grid.compactView.label', {
  defaultMessage: 'Compact view',
});

const VIEW_LEGEND = i18n.translate('xpack.synthetics.overview.grid.view.legend', {
  defaultMessage: 'Monitors view',
});

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
  const { view } = useSelector(selectOverviewState);
  const [urlParams, updateUrlParams] = useUrlParams();

  const { view: urlView } = urlParams();

  const [localStorageView, setLocalStorageView] = useLocalStorage<OverviewView>(
    'synthetics.overviewView',
    urlView || view
  );

  useEffect(() => {
    // When the component mounts, check if there is a view in the URL first
    if (urlView) {
      dispatch(setOverviewViewAction(urlView));
    } // If there is no view in the URL, check if there is a view in local storage that is not the default view
    else if (localStorageView && localStorageView !== DEFAULT_OVERVIEW_VIEW) {
      dispatch(setOverviewViewAction(localStorageView));
      updateUrlParams({ view: localStorageView });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loading = !status || !loaded;

  const dispatch = useDispatch();

  const onChangeView = (id: string) => {
    if (!isOverviewView(id)) {
      throw new Error(`Invalid view: ${id}, this should never happen`);
    }
    dispatch(setOverviewViewAction(id));
    updateUrlParams({ view: id === DEFAULT_OVERVIEW_VIEW ? undefined : id });
    setLocalStorageView(id);
  };

  return (
    <EuiButtonGroup
      buttonSize="compressed"
      options={toggleButtonsIcons}
      idSelected={view}
      onChange={onChangeView}
      isIconOnly
      isDisabled={loading}
      legend={VIEW_LEGEND}
    />
  );
};
