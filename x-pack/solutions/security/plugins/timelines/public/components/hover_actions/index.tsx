/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiLoadingSpinner } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { ReactElement } from 'react';
import React from 'react';
import { Provider } from 'react-redux-v7';
import type { Store } from 'redux-v4';
import {
  getCopyButton,
  getFilterForValueButton,
  getFilterOutValueButton,
} from '@kbn/securitysolution-timeline-components';
import type {
  CopyProps,
  FilterValueFnArgs,
  HoverActionComponentProps,
} from '@kbn/securitysolution-timeline-components';
import type { AddToTimelineButtonProps } from './actions/add_to_timeline';

export interface HoverActionsConfig {
  getAddToTimelineButton: (
    props: AddToTimelineButtonProps
  ) => ReactElement<AddToTimelineButtonProps>;
  getCopyButton: (props: CopyProps) => ReactElement<CopyProps>;
  getFilterForValueButton: (
    props: HoverActionComponentProps & FilterValueFnArgs
  ) => ReactElement<HoverActionComponentProps & FilterValueFnArgs>;
  getFilterOutValueButton: (
    props: HoverActionComponentProps & FilterValueFnArgs
  ) => ReactElement<HoverActionComponentProps & FilterValueFnArgs>;
}

const AddToTimelineButtonLazy = React.lazy(() => import('./actions/add_to_timeline'));
const getAddToTimelineButtonLazy = (store: Store, props: AddToTimelineButtonProps) => {
  return (
    <React.Suspense fallback={<EuiLoadingSpinner />}>
      <Provider store={store}>
        <I18nProvider>
          <AddToTimelineButtonLazy {...props} />
        </I18nProvider>
      </Provider>
    </React.Suspense>
  );
};

export const getHoverActions = (store?: Store): HoverActionsConfig => ({
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  getAddToTimelineButton: getAddToTimelineButtonLazy.bind(null, store!),
  getCopyButton,
  getFilterForValueButton,
  getFilterOutValueButton,
});
