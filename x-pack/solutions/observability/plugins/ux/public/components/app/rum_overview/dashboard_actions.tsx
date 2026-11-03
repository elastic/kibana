/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import type { EmbeddablePackageState } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import type { SaveModalDashboardProps } from '@kbn/presentation-util-plugin/public';
import { SavedObjectSaveModalDashboard } from '@kbn/presentation-util-plugin/public';
import React, { useCallback, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  buildUxAppControlPanel,
  type UxDashboardAppControlPanel,
} from '../../../../common/embeddables/overview_panel/app_control';
import {
  buildOverviewConvertPackages,
  buildOverviewPanelPackage,
  dashboardPathForId,
} from '../../../../common/embeddables/overview_panel/build_packages';
import type { UxOverviewPanelKind } from '../../../../common/embeddables/overview_panel/constants';
import {
  uxOverviewConvertTitle,
  uxOverviewPanelTitle,
} from '../../../../common/embeddables/overview_panel/panel_copy';
import type { UxOverviewDashboardFilters } from '../../../../common/embeddables/overview_panel/types';
import { useLegacyUrlParams } from '../../../context/url_params_context/use_url_params';
import { resolveUxAppControlDataView } from '../../../embeddable/overview_panel/resolve_app_control_data_view';
import { useKibanaServices } from '../../../hooks/use_kibana_services';
import { uxTabSuffix } from '../../../utils/ux_app_path';

const CONVERT_LABEL = i18n.translate('xpack.ux.dashboard.convert.buttonLabel', {
  defaultMessage: 'Convert to dashboard',
});

const CONVERT_HELP = i18n.translate('xpack.ux.dashboard.convert.buttonTooltip', {
  defaultMessage:
    'Create a Kibana dashboard from this overview. Hide or rearrange panels there — Overview, replay, and reports stay as they are.',
});

const ADD_LABEL = i18n.translate('xpack.ux.dashboard.add.buttonAriaLabel', {
  defaultMessage: 'Add to dashboard',
});

const ADD_HELP = i18n.translate('xpack.ux.dashboard.add.buttonTooltip', {
  defaultMessage: 'Add this panel to a new or existing dashboard',
});

export const useOverviewDashboardFilters = (): UxOverviewDashboardFilters => {
  const {
    urlParams: {
      rangeFrom = 'now-24h',
      rangeTo = 'now',
      serviceName,
      kuery,
      browser,
      os,
      location,
      pageUrl,
      frustration,
      user,
      includeBots,
      botUa,
      breakpoint,
      connection,
      device,
      analyticsMode,
    },
  } = useLegacyUrlParams();

  return {
    rangeFrom,
    rangeTo,
    serviceName: typeof serviceName === 'string' ? serviceName : undefined,
    kuery,
    browser,
    os,
    location: typeof location === 'string' ? location : undefined,
    pageUrl,
    frustration,
    user,
    includeBots,
    botUa,
    breakpoint,
    connection,
    device,
    analyticsMode,
  };
};

const SAVE_ERROR = i18n.translate('xpack.ux.dashboard.saveErrorToast', {
  defaultMessage: 'Unable to save this panel to a dashboard.',
});

const pinnedAppControlForNewDashboard = async (
  dataViews: ReturnType<typeof useKibanaServices>['dataViews'],
  dashboardId: string | null,
  serviceName?: string
): Promise<UxDashboardAppControlPanel[] | undefined> => {
  const isNew = !dashboardId || dashboardId === 'new';
  if (!isNew || !serviceName) {
    return undefined;
  }
  const dataView = await resolveUxAppControlDataView(dataViews);
  if (!dataView) {
    return undefined;
  }
  return [buildUxAppControlPanel(dataView.id, dataView.fieldName, serviceName)];
};

const navigateWithPackages = async (
  embeddable: ReturnType<typeof useKibanaServices>['embeddable'],
  packages: EmbeddablePackageState[],
  dashboardId: string | null,
  timeRange: { from: string; to: string },
  pinnedPanels?: UxDashboardAppControlPanel[]
) => {
  const stateTransfer = embeddable.getStateTransfer();
  await stateTransfer.navigateToWithEmbeddablePackages('dashboards', {
    state: packages,
    path: dashboardPathForId(dashboardId, timeRange, pinnedPanels),
  });
};

export function ConvertToDashboardButton() {
  const { embeddable, notifications, dataViews } = useKibanaServices();
  const { pathname } = useLocation();
  const filters = useOverviewDashboardFilters();
  const [isOpen, setIsOpen] = useState(false);
  const onOverview = Boolean(filters.serviceName) && uxTabSuffix(pathname) === '';

  const handleSave: SaveModalDashboardProps['onSave'] = useCallback(
    async ({ dashboardId, newTitle, newDescription }) => {
      if (!embeddable) {
        notifications?.toasts.addDanger(SAVE_ERROR);
        return;
      }
      const [cover, ...panels] = buildOverviewConvertPackages(filters);
      const coverState = {
        ...cover.serializedState,
        ...(newTitle ? { title: newTitle } : {}),
        ...(newDescription ? { description: newDescription } : {}),
      };
      try {
        const pinnedPanels = await pinnedAppControlForNewDashboard(
          dataViews,
          dashboardId,
          filters.serviceName
        );
        await navigateWithPackages(
          embeddable,
          [{ ...cover, serializedState: coverState }, ...panels] as EmbeddablePackageState[],
          dashboardId,
          {
            from: filters.rangeFrom,
            to: filters.rangeTo,
          },
          pinnedPanels
        );
      } catch {
        notifications?.toasts.addDanger(SAVE_ERROR);
      }
    },
    [dataViews, embeddable, filters, notifications?.toasts]
  );

  if (!onOverview || !embeddable) {
    return null;
  }

  return (
    <>
      <EuiToolTip content={CONVERT_HELP} disableScreenReaderOutput>
        <EuiButton
          iconType="dashboardApp"
          color="text"
          size="s"
          data-test-subj="uxConvertToDashboard"
          onClick={() => setIsOpen(true)}
        >
          {CONVERT_LABEL}
        </EuiButton>
      </EuiToolTip>
      {isOpen ? (
        <SavedObjectSaveModalDashboard
          objectType={i18n.translate('xpack.ux.dashboard.convert.objectTypeLabel', {
            defaultMessage: 'UX overview',
          })}
          documentInfo={{ title: uxOverviewConvertTitle(filters.serviceName) }}
          canSaveByReference={false}
          onClose={() => setIsOpen(false)}
          onSave={handleSave}
        />
      ) : null}
    </>
  );
}

export function AddToDashboardButton({ panel }: { panel: UxOverviewPanelKind }) {
  const { embeddable, notifications, dataViews } = useKibanaServices();
  const filters = useOverviewDashboardFilters();
  const [isOpen, setIsOpen] = useState(false);
  const title = useMemo(() => uxOverviewPanelTitle(panel), [panel]);

  const handleSave: SaveModalDashboardProps['onSave'] = useCallback(
    async ({ dashboardId, newTitle, newDescription }) => {
      if (!embeddable) {
        notifications?.toasts.addDanger(SAVE_ERROR);
        return;
      }
      const pkg = buildOverviewPanelPackage(panel, filters, newTitle || title);
      if (newDescription) {
        pkg.serializedState = { ...pkg.serializedState, description: newDescription };
      }
      try {
        const pinnedPanels = await pinnedAppControlForNewDashboard(
          dataViews,
          dashboardId,
          filters.serviceName
        );
        await navigateWithPackages(
          embeddable,
          [pkg as EmbeddablePackageState],
          dashboardId,
          {
            from: filters.rangeFrom,
            to: filters.rangeTo,
          },
          pinnedPanels
        );
      } catch {
        notifications?.toasts.addDanger(SAVE_ERROR);
      }
    },
    [dataViews, embeddable, filters, notifications?.toasts, panel, title]
  );

  if (!embeddable) {
    return null;
  }

  return (
    <>
      <EuiToolTip content={ADD_HELP} disableScreenReaderOutput>
        <EuiButtonIcon
          display="empty"
          iconType="addToDashboard"
          color="text"
          size="s"
          iconSize="m"
          aria-label={ADD_LABEL}
          data-test-subj={`uxAddToDashboard-${panel}`}
          onClick={() => setIsOpen(true)}
        />
      </EuiToolTip>
      {isOpen ? (
        <SavedObjectSaveModalDashboard
          objectType={title}
          documentInfo={{ title }}
          canSaveByReference={false}
          onClose={() => setIsOpen(false)}
          onSave={handleSave}
        />
      ) : null}
    </>
  );
}
