/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues, useActions } from 'kea';

import {
  EuiSpacer,
  EuiTitle,
  EuiPanel,
  EuiIcon,
  EuiFlexGrid,
  EuiFlexItem,
  EuiFlexGroup,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { EuiButtonTo } from '../../../shared/react_router_helpers';
import { TelemetryLogic } from '../../../shared/telemetry';
import { AppLogic } from '../../app_logic';
import orgSourcesIcon from '../../components/shared/assets/source_icons/share_circle.svg';
import { ContentSection } from '../../components/shared/content_section';
import { ADD_SOURCE_PATH, USERS_AND_ROLES_PATH, ORG_SETTINGS_PATH } from '../../routes';

import { OnboardingCard } from './onboarding_card';
import { OverviewLogic } from './overview_logic';

const SOURCES_TITLE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.overviewOnboardingSourcesCard.title',
  { defaultMessage: 'Organizational sources' }
);

const USERS_TITLE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.overviewOnboardingUsersCard.title',
  { defaultMessage: 'Users & invitations' }
);

const INVITE_FIRST_USERS_BUTTON = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.overviewOnboardingUsersCard.inviteFirstUsers.button',
  { defaultMessage: 'Invite users' }
);

const INVITE_MORE_USERS_BUTTON = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.overviewOnboardingUsersCard.inviteMoreUsers.button',
  { defaultMessage: 'Invite more users' }
);

const ONBOARDING_SOURCES_CARD_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.overviewOnboardingSourcesCard.description',
  { defaultMessage: 'Add organizational sources for your organization to start searching.' }
);

const ADD_FIRST_SOURCES_BUTTON = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.sourcesOnboardingCard.addFirstSources.button',
  { defaultMessage: 'Add sources' }
);

const ADD_MORE_SOURCES_BUTTON = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.sourcesOnboardingCard.addMoreSources.button',
  { defaultMessage: 'Add more sources' }
);

const USERS_CARD_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.overviewUsersCard.title',
  { defaultMessage: 'Nice, you’ve invited colleagues to search with you.' }
);

const ONBOARDING_USERS_CARD_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.overviewOnboardingUsersCard.description',
  { defaultMessage: 'Invite your colleagues into this organization to search with you.' }
);

export const OnboardingSteps: React.FC = () => {
  const {
    organization: { name, defaultOrgName },
  } = useValues(AppLogic);

  const { hasUsers, hasOrgSources, accountsCount, sourcesCount } = useValues(OverviewLogic);

  const SOURCES_CARD_DESCRIPTION = i18n.translate(
    'xpack.enterpriseSearch.workplaceSearch.sourcesOnboardingCard.description',
    {
      defaultMessage:
        'You have added {sourcesCount, number} organizational {sourcesCount, plural, one {source} other {sources}}. Happy searching.',
      values: { sourcesCount },
    }
  );

  return (
    <ContentSection>
      <EuiFlexGrid columns={2}>
        <OnboardingCard
          title={SOURCES_TITLE}
          testSubj="orgSourcesButton"
          icon={orgSourcesIcon}
          description={
            hasOrgSources ? SOURCES_CARD_DESCRIPTION : ONBOARDING_SOURCES_CARD_DESCRIPTION
          }
          actionTitle={sourcesCount > 0 ? ADD_MORE_SOURCES_BUTTON : ADD_FIRST_SOURCES_BUTTON}
          actionPath={ADD_SOURCE_PATH}
          complete={hasOrgSources}
        />
        <OnboardingCard
          title={USERS_TITLE}
          testSubj="usersButton"
          icon="user"
          description={hasUsers ? USERS_CARD_DESCRIPTION : ONBOARDING_USERS_CARD_DESCRIPTION}
          actionTitle={accountsCount > 0 ? INVITE_MORE_USERS_BUTTON : INVITE_FIRST_USERS_BUTTON}
          actionPath={USERS_AND_ROLES_PATH}
          complete={hasUsers}
        />
      </EuiFlexGrid>
      {name === defaultOrgName && (
        <>
          <EuiSpacer />
          <OrgNameOnboarding />
        </>
      )}
    </ContentSection>
  );
};

export const OrgNameOnboarding: React.FC = () => {
  const { sendWorkplaceSearchTelemetry } = useActions(TelemetryLogic);

  const onClick = () =>
    sendWorkplaceSearchTelemetry({
      action: 'clicked',
      metric: 'org_name_change_button',
    });

  return (
    <EuiPanel color="subdued" hasShadow={false} paddingSize="l">
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
        <EuiFlexItem className="eui-hideFor--xs eui-hideFor--s" grow={false}>
          <EuiIcon type="documentEdit" size="xl" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h3>
              <FormattedMessage
                id="xpack.enterpriseSearch.workplaceSearch.orgNameOnboarding.description"
                defaultMessage="Before inviting your colleagues, name your organization to improve recognition."
              />
            </h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonTo
            to={ORG_SETTINGS_PATH}
            onClick={onClick}
            data-test-subj="orgNameChangeButton"
            size="s"
          >
            <FormattedMessage
              id="xpack.enterpriseSearch.workplaceSearch.orgNameOnboarding.buttonLabel"
              defaultMessage="Name your organization"
            />
          </EuiButtonTo>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
