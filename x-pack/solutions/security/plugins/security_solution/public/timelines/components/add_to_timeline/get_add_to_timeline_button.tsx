/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import React from 'react';
import { Provider } from 'react-redux-v7';
import type { AddToTimelineButtonProps } from '@kbn/timelines-plugin/public';
import { getStore } from '../../../common/store';

const AddToTimelineButtonLazy = React.lazy(
  () => import('@kbn/timelines-plugin/public/components/hover_actions/actions/add_to_timeline')
);

/**
 * Lazily renders the "add to timeline" hover-action button wrapped in the Security Solution
 * redux store so that it can dispatch data providers into the active timeline.
 */
export const getAddToTimelineButton = (props: AddToTimelineButtonProps) => {
  const store = getStore();

  return (
    <React.Suspense fallback={<EuiLoadingSpinner />}>
      {store && (
        <Provider store={store}>
          <I18nProvider>
            <AddToTimelineButtonLazy {...props} />
          </I18nProvider>
        </Provider>
      )}
    </React.Suspense>
  );
};
