/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { Action, ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import { createExploratoryViewRoutePath } from '../configurations/utils';
import { createExploratoryViewUrl } from '../configurations/exploratory_view_url';
import type { ReportViewType } from '../types';
import type { AllSeries } from '../hooks/use_series_storage';

const saveLabel = i18n.translate('xpack.exploratoryView.expView.save', {
  defaultMessage: 'Save visualization',
});

export type ActionTypes = 'explore' | 'save' | 'addToCase' | 'openInLens';

export function useActions({
  withActions,
  attributes,
  reportType,
  setAddToCaseOpen,
  title,
  lens,
}: {
  withActions?: boolean | ActionTypes[];
  reportType: ReportViewType;
  attributes: AllSeries;
  setAddToCaseOpen: (val: boolean) => void;
  /** Title of the chart, which the embedded chart hides */
  title?: string;
  /** The Lens service of the embeddable, which the Kibana context of the host app may not have */
  lens: LensPublicStart;
}) {
  const [defaultActions, setDefaultActions] = useState(['explore', 'save', 'addToCase']);

  useEffect(() => {
    if (withActions === false) {
      setDefaultActions([]);
    }
    if (Array.isArray(withActions)) {
      setDefaultActions(withActions);
    }
  }, [withActions]);

  const { http, application } = useKibana().services;

  const href = createExploratoryViewUrl(
    { reportType, allSeries: attributes },
    http?.basePath.get()
  );

  const routePath = createExploratoryViewRoutePath({ reportType, allSeries: attributes });

  const openInLensAction = useMemo(
    () => lens.actions.createOpenInLensAction({ openInNewTab: true, title }),
    [lens, title]
  );

  const saveAction = useMemo(
    () => ({
      ...lens.actions.createSaveToDashboardAction({
        isSaveable: true,
        displayName: saveLabel,
        title,
      }),
      // the id and the order are relied on by the menu and the tests
      id: 'expViewSave',
      order: 49,
    }),
    [lens, title]
  );

  const exploreCallback = useCallback(() => {
    application?.navigateToApp('exploratory-view', { path: routePath });
  }, [application, routePath]);

  const addToCaseCallback = useCallback(() => {
    setAddToCaseOpen(true);
  }, [setAddToCaseOpen]);

  return defaultActions.map<Action>((action) => {
    if (action === 'save') {
      return saveAction;
    }
    if (action === 'addToCase') {
      return getAddToCaseAction({ callback: addToCaseCallback });
    }
    if (action === 'openInLens') {
      return openInLensAction;
    }
    return getExploreAction({ href, callback: exploreCallback });
  });
}

const getExploreAction = ({ href, callback }: { href: string; callback: () => void }): Action => {
  return {
    id: 'expViewExplore',
    getDisplayName(context: ActionExecutionContext<object>): string {
      return i18n.translate('xpack.exploratoryView.expView.explore', {
        defaultMessage: 'Explore',
      });
    },
    getIconType(context: ActionExecutionContext<object>): string | undefined {
      return 'chartArea';
    },
    type: 'link',
    async isCompatible(context: ActionExecutionContext<object>): Promise<boolean> {
      return true;
    },
    async getHref(context: ActionExecutionContext<object>): Promise<string | undefined> {
      return href;
    },
    async execute(context: ActionExecutionContext<object>): Promise<void> {
      callback();
      return;
    },
    order: 50,
  };
};

const getAddToCaseAction = ({ callback }: { callback: () => void }): Action => {
  return {
    id: 'expViewAddToCase',
    getDisplayName(context: ActionExecutionContext<object>): string {
      return i18n.translate('xpack.exploratoryView.expView.addToCase', {
        defaultMessage: 'Add to case',
      });
    },
    getIconType(context: ActionExecutionContext<object>): string | undefined {
      return 'link';
    },
    type: 'actionButton',
    async isCompatible(context: ActionExecutionContext<object>): Promise<boolean> {
      return true;
    },
    async execute(context: ActionExecutionContext<object>): Promise<void> {
      callback();
      return;
    },
    order: 48,
    grouping: [{ id: 'observability', order: 5 }],
  };
};
