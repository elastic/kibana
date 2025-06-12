/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useCallback } from 'react';
import {
  EuiEmptyPrompt,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import styled from 'styled-components';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useBreadcrumbs, useEnablement, useLocations } from '../../hooks';
import { usePrivateLocationsAPI } from '../settings/private_locations/hooks/use_locations_api';
import { LoadingState } from '../monitors_page/overview/overview/monitor_detail_flyout';
import { getServiceLocations, cleanMonitorListState } from '../../state';
import { MONITOR_ADD_ROUTE } from '../../../../../common/constants/ui';
import { SimpleMonitorForm } from './simple_monitor_form';
import { AddLocationFlyout, NewLocation } from '../settings/private_locations/add_location_flyout';
import type { ClientPluginsStart } from '../../../../plugin';
import { getAgentPoliciesAction, selectAgentPolicies } from '../../state/agent_policies';
import { selectAddingNewPrivateLocation } from '../../state/settings/selectors';
import { setIsCreatePrivateLocationFlyoutVisible } from '../../state/private_locations/actions';

export const GettingStartedPage = () => {
  const dispatch = useDispatch();
  const history = useHistory();

  const { observabilityAIAssistant } = useKibana<ClientPluginsStart>().services;
  const setScreenContext = observabilityAIAssistant?.service.setScreenContext;

  useEnablement();

  useEffect(() => {
    dispatch(getServiceLocations());
    dispatch(getAgentPoliciesAction.get());

    return () => {
      dispatch(cleanMonitorListState());
    };
  }, [dispatch]);

  useBreadcrumbs([{ text: MONITORING_OVERVIEW_LABEL }]); // No extra breadcrumbs on overview

  const { locations, loading: allLocationsLoading } = useLocations();
  const { loading: agentPoliciesLoading } = useSelector(selectAgentPolicies);
  const loading = allLocationsLoading || agentPoliciesLoading;

  const hasNoLocations = !allLocationsLoading && locations.length === 0;

  useEffect(() => {
    return setScreenContext?.({
      screenDescription: hasNoLocations
        ? 'The user has no locations configured.'
        : `The user has ${locations.length} locations configured: ${JSON.stringify(locations)}`,
      starterPrompts: [
        ...(hasNoLocations
          ? [
              {
                title: i18n.translate(
                  'xpack.synthetics.aiAssistant.starterPrompts.explainNoData.title',
                  { defaultMessage: 'Explain' }
                ),
                prompt: i18n.translate(
                  'xpack.synthetics.aiAssistant.starterPrompts.explainNoData.prompt',
                  { defaultMessage: "Why don't I see any monitors?" }
                ),
                icon: 'sparkles',
              },
            ]
          : []),
      ],
    });
  }, [setScreenContext, hasNoLocations, locations]);

  return !loading ? (
    <Wrapper>
      {hasNoLocations ? (
        <GettingStartedOnPrem />
      ) : (
        <EuiEmptyPrompt
          title={<h2>{CREATE_SINGLE_PAGE_LABEL}</h2>}
          layout="horizontal"
          color="plain"
          body={
            <>
              <EuiText size="s">
                {OR_LABEL}{' '}
                <EuiLink
                  data-test-subj="syntheticsGettingStartedPageLink"
                  href={history.createHref({
                    pathname: MONITOR_ADD_ROUTE,
                  })}
                >
                  {SELECT_DIFFERENT_MONITOR}
                </EuiLink>
                {i18n.translate('xpack.synthetics.gettingStarted.createSingle.description', {
                  defaultMessage: ' to get started with Elastic Synthetics Monitoring.',
                })}
              </EuiText>
              <EuiSpacer />
              <SimpleMonitorForm />
            </>
          }
          footer={<GettingStartedLink />}
        />
      )}
    </Wrapper>
  ) : (
    <LoadingState />
  );
};

export const GettingStartedOnPrem = () => {
  const dispatch = useDispatch();

  useBreadcrumbs([{ text: MONITORING_OVERVIEW_LABEL }]); // No extra breadcrumbs on overview

  const isAddingNewLocation = useSelector(selectAddingNewPrivateLocation);

  const setIsAddingNewLocation = useCallback(
    (val: boolean) => dispatch(setIsCreatePrivateLocationFlyoutVisible(val)),
    [dispatch]
  );

  const { onSubmit, privateLocations } = usePrivateLocationsAPI();

  const handleSubmit = (formData: NewLocation) => {
    onSubmit(formData);
  };

  // make sure flyout is closed when first visiting the page
  useEffect(() => {
    setIsAddingNewLocation(false);
  }, [setIsAddingNewLocation]);

  return (
    <>
      <EuiEmptyPrompt
        title={<h2>{GET_STARTED_LABEL}</h2>}
        layout="horizontal"
        color="plain"
        body={
          <EuiFlexGroup direction="column">
            <EuiFlexItem>
              <EuiText>{CREATE_LOCATION_DESCRIPTION}</EuiText>
              <EuiSpacer />
              <EuiText>{PUBLIC_LOCATION_DESCRIPTION}</EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiButton
                fill
                iconType="plusInCircleFilled"
                data-test-subj="gettingStartedAddLocationButton"
                onClick={() => setIsAddingNewLocation(true)}
              >
                {CREATE_LOCATION_LABEL}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        footer={<GettingStartedLink />}
      />

      {isAddingNewLocation ? (
        <AddLocationFlyout
          setIsOpen={setIsAddingNewLocation}
          onSubmit={handleSubmit}
          privateLocations={privateLocations}
        />
      ) : null}
    </>
  );
};

export const GettingStartedLink = () => (
  <>
    <EuiText size="s" color="subdued" className="eui-displayInlineBlock">
      {FOR_MORE_INFO_LABEL}
    </EuiText>{' '}
    <EuiLink
      data-test-subj="syntheticsGettingStartedOnPremLink"
      href="https://www.elastic.co/guide/en/observability/current/synthetics-get-started.html"
      target="_blank"
      className="eui-displayInline"
    >
      {GETTING_STARTED_LABEL}
    </EuiLink>
  </>
);

const Wrapper = styled.div`
  &&& {
    .euiEmptyPrompt__content {
      max-width: 40em;
      padding: 0;
    }
  }
`;

const FOR_MORE_INFO_LABEL = i18n.translate('xpack.synthetics.gettingStarted.forMoreInfo', {
  defaultMessage: 'For more information, read our',
});

const GETTING_STARTED_LABEL = i18n.translate(
  'xpack.synthetics.gettingStarted.gettingStartedLabel',
  {
    defaultMessage: 'Getting Started Guide',
  }
);

const CREATE_SINGLE_PAGE_LABEL = i18n.translate(
  'xpack.synthetics.gettingStarted.createSinglePageLabel',
  {
    defaultMessage: 'Create a single page browser monitor',
  }
);

const GET_STARTED_LABEL = i18n.translate('xpack.synthetics.gettingStarted.createLocationHeading', {
  defaultMessage: 'Get started with synthetic monitoring',
});

const PRIVATE_LOCATION_LABEL = i18n.translate(
  'xpack.synthetics.gettingStarted.privateLocationLabel',
  {
    defaultMessage: 'private location',
  }
);

const CREATE_LOCATION_LABEL = i18n.translate(
  'xpack.synthetics.gettingStarted.createLocationLabel',
  {
    defaultMessage: 'Create location',
  }
);

const CREATE_LOCATION_DESCRIPTION = (
  <FormattedMessage
    id="xpack.synthetics.gettingStarted.createLocationDescription"
    defaultMessage="To start creating monitors, you first need to create a {link}. Private locations allow you to run monitors from your own premises. They require an Elastic agent and Agent policy which you can control and maintain via Fleet."
    values={{
      link: (
        <EuiLink
          data-test-subj="syntheticsLink"
          href="https://www.elastic.co/guide/en/observability/current/synthetics-private-location.html"
          target="_blank"
        >
          {PRIVATE_LOCATION_LABEL}
        </EuiLink>
      ),
    }}
  />
);

const PUBLIC_LOCATION_DESCRIPTION = (
  <FormattedMessage
    id="xpack.synthetics.gettingStarted.publicLocationDescription"
    defaultMessage="In {link} you can also use {elasticManagedLink}. With it, you can create and run monitors in multiple locations without having to manage your own infrastructure. Elastic takes care of software updates and capacity planning for you."
    values={{
      elasticManagedLink: (
        <strong>
          {i18n.translate(
            'xpack.synthetics.gettingStarted.gettingStartedLabel.elasticManagedLink',
            {
              defaultMessage: 'Elastic’s global managed testing infrastructure',
            }
          )}
        </strong>
      ),
      link: (
        <EuiLink
          data-test-subj="syntheticsElasticCloudLink"
          href="https://www.elastic.co/cloud/"
          target="_blank"
        >
          {i18n.translate(
            'xpack.synthetics.gettingStarted.gettingStartedLabel.elasticCloudDeployments',
            {
              defaultMessage: 'Elastic Cloud',
            }
          )}
        </EuiLink>
      ),
    }}
  />
);

const SELECT_DIFFERENT_MONITOR = i18n.translate(
  'xpack.synthetics.gettingStarted.gettingStartedLabel.selectDifferentMonitor',
  {
    defaultMessage: 'select a different monitor type',
  }
);

const OR_LABEL = i18n.translate('xpack.synthetics.gettingStarted.orLabel', {
  defaultMessage: 'Or',
});

const MONITORING_OVERVIEW_LABEL = i18n.translate('xpack.synthetics.overview.heading', {
  defaultMessage: 'Monitors',
});
