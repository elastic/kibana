/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useValues, useActions } from 'kea';

import { EuiButton, EuiCallOut, EuiSpacer, EuiText } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { AnalyticsCollection } from '../../../../../../common/types/analytics';

import { generateEncodedPath } from '../../../../shared/encode_path_params';

import { KibanaLogic } from '../../../../shared/kibana';
import { COLLECTION_INTEGRATE_PATH } from '../../../routes';

import { AnalyticsCollectionNoEventsCalloutLogic } from './analytics_collection_no_events_callout_logic';

interface AnalyticsCollectionNoEventsCalloutProps {
  analyticsCollection: AnalyticsCollection;
}

export const AnalyticsCollectionNoEventsCallout: React.FC<
  AnalyticsCollectionNoEventsCalloutProps
> = ({ analyticsCollection }) => {
  const { navigateToUrl } = useValues(KibanaLogic);
  const { analyticsEventsExist } = useActions(AnalyticsCollectionNoEventsCalloutLogic);
  const { hasEvents, isLoading } = useValues(AnalyticsCollectionNoEventsCalloutLogic);

  useEffect(() => {
    analyticsEventsExist(analyticsCollection.events_datastream);
  }, []);

  return hasEvents || isLoading ? null : (
    <EuiCallOut
      color="primary"
      iconType="download"
      title={i18n.translate(
        'xpack.enterpriseSearch.analytics.collectionsView.noEventsCallout.title',
        {
          defaultMessage: 'Install our tracker',
        }
      )}
    >
      <EuiText>
        {i18n.translate(
          'xpack.enterpriseSearch.analytics.collectionsView.noEventsCallout.description',
          {
            defaultMessage:
              'Start receiving metric data in this Collection by installing our tracker in your search application.',
          }
        )}
      </EuiText>
      <EuiSpacer />
      <EuiButton
        fill
        type="submit"
        onClick={() =>
          navigateToUrl(
            generateEncodedPath(COLLECTION_INTEGRATE_PATH, {
              name: analyticsCollection.name,
            })
          )
        }
      >
        {i18n.translate('xpack.enterpriseSearch.analytics.collectionsView.noEventsCallout.button', {
          defaultMessage: 'Learn how',
        })}
      </EuiButton>
    </EuiCallOut>
  );
};
