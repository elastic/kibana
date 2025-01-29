/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon, EuiSpacer, EuiText, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';
import useInterval from 'react-use/lib/useInterval';
import { unionBy } from 'lodash';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { ObservabilityOnboardingAppServices } from '../../..';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { AccordionWithIcon } from '../shared/accordion_with_icon';
import { GetStartedPanel } from '../shared/get_started_panel';
import {
  type AWSServiceGetStartedConfig,
  useAWSServiceGetStartedList,
} from './use_aws_service_get_started_list';
import { AutoRefreshCallout } from './auto_refresh_callout';
import { ProgressCallout } from './progress_callout';
import { HAS_DATA_FETCH_INTERVAL } from './utils';
import { CreateStackOption } from './types';
import { usePopulatedAWSIndexList } from './use_populated_aws_index_list';

const REQUEST_PENDING_STATUS_LIST = [FETCH_STATUS.LOADING, FETCH_STATUS.NOT_INITIATED];

interface Props {
  onboardingId: string;
  selectedCreateStackOption: CreateStackOption;
  hasExistingData: boolean;
}

export function VisualizeData({ onboardingId, selectedCreateStackOption, hasExistingData }: Props) {
  const accordionId = useGeneratedHtmlId({ prefix: 'accordion' });
  const [orderedVisibleAWSServiceList, setOrderedVisibleAWSServiceList] = useState<
    AWSServiceGetStartedConfig[]
  >([]);
  const [shouldShowDataReceivedToast, setShouldShowDataReceivedToast] = useState<boolean>(
    !hasExistingData
  );
  const { data: populatedAWSIndexList, status, refetch } = usePopulatedAWSIndexList();
  const {
    services: {
      notifications,
      context: { cloudServiceProvider },
    },
  } = useKibana<ObservabilityOnboardingAppServices>();
  const awsServiceGetStartedConfigList = useAWSServiceGetStartedList();

  useEffect(() => {
    if (
      shouldShowDataReceivedToast &&
      Array.isArray(populatedAWSIndexList) &&
      populatedAWSIndexList.length > 0
    ) {
      notifications?.toasts.addSuccess(
        {
          title: i18n.translate(
            'xpack.observability_onboarding.firehosePanel.dataReceivedToastTitle',
            {
              defaultMessage: 'Your data is on its way',
            }
          ),
          text: i18n.translate(
            'xpack.observability_onboarding.firehosePanel.dataReceivedToastText',
            {
              defaultMessage:
                'We’ve begun processing your data. In the background, we automatically refresh every few seconds to capture more incoming data.',
            }
          ),
        },
        {
          toastLifeTimeMs: 10000,
        }
      );
      setShouldShowDataReceivedToast(false);
    }

    setOrderedVisibleAWSServiceList((currentList) =>
      /**
       * unionBy() ensures uniqueness of the resulting list
       * and preserves the order of the first list passed to it,
       * which in turn keeps already visible services in the UI
       * in place and new services are only appended to the end.
       */
      unionBy(
        currentList,
        awsServiceGetStartedConfigList.filter(({ indexNameList }) =>
          indexNameList.some((indexName) => populatedAWSIndexList?.includes(indexName))
        ),
        'id'
      )
    );
  }, [
    awsServiceGetStartedConfigList,
    notifications?.toasts,
    populatedAWSIndexList,
    shouldShowDataReceivedToast,
  ]);

  useInterval(() => {
    if (REQUEST_PENDING_STATUS_LIST.includes(status)) {
      return;
    }

    refetch();
  }, HAS_DATA_FETCH_INTERVAL);

  if (populatedAWSIndexList === undefined) {
    return null;
  }

  return (
    <>
      <EuiText>
        <p>
          <FormattedMessage
            id="xpack.observability_onboarding.firehosePanel.visualizeDataDescription"
            defaultMessage="Once the Firehose stream is created, data capture will begin automatically, and the incoming data will be displayed below."
          />
        </p>
      </EuiText>

      <EuiSpacer size="m" />

      {orderedVisibleAWSServiceList.length === 0 && <ProgressCallout />}
      {orderedVisibleAWSServiceList.length > 0 && <AutoRefreshCallout />}

      <EuiSpacer size="m" />

      <div data-test-subj="observabilityOnboardingAWSServiceList">
        {orderedVisibleAWSServiceList.map(
          ({ id, actionLinks, title, logoURL, previewImage }, index) => {
            return (
              <AccordionWithIcon
                data-test-subj={`observabilityOnboardingAWSService-${id}`}
                key={id}
                id={`${accordionId}_${id}`}
                icon={<EuiIcon type={logoURL} size="l" />}
                title={title}
                initialIsOpen={true}
                borders={
                  index === 0 || index === orderedVisibleAWSServiceList.length - 1
                    ? 'none'
                    : 'horizontal'
                }
              >
                <GetStartedPanel
                  onboardingFlowType="firehose"
                  dataset={id}
                  telemetryEventContext={{
                    firehose: {
                      selectedCreateStackOption,
                      cloudServiceProvider,
                    },
                  }}
                  integration="aws"
                  newTab
                  isLoading={false}
                  actionLinks={actionLinks}
                  previewImage={previewImage}
                  onboardingId={onboardingId}
                />
              </AccordionWithIcon>
            );
          }
        )}
      </div>
    </>
  );
}
