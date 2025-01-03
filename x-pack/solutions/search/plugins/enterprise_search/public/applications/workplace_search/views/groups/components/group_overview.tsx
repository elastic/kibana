/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiConfirmModal,
  EuiEmptyPrompt,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
  EuiHorizontalRule,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { EuiButtonTo } from '../../../../shared/react_router_helpers';
import { TruncatedContent } from '../../../../shared/truncate';
import noOrgSourcesIcon from '../../../assets/share_circle.svg';
import { WorkplaceSearchPageTemplate } from '../../../components/layout';
import { ContentSection } from '../../../components/shared/content_section';
import { SourcesTable } from '../../../components/shared/sources_table';
import { NAV, CANCEL_BUTTON } from '../../../constants';
import { USERS_AND_ROLES_PATH } from '../../../routes';
import { GroupLogic, MAX_NAME_LENGTH } from '../group_logic';

export const EMPTY_SOURCES_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.groups.overview.emptySourcesDescription',
  {
    defaultMessage: 'No content sources are shared with this group.',
  }
);
const USERS_SECTION_TITLE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.groups.overview.usersSectionTitle',
  {
    defaultMessage: 'Group users',
  }
);
const GROUP_USERS_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.groups.overview.groupUsersDescription',
  {
    defaultMessage:
      "Users assigned to this group gain access to the sources' data and content defined above. User assignments for this group can be managed in the Users and Roles area.",
  }
);
const MANAGE_SOURCES_BUTTON_TEXT = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.groups.overview.manageSourcesButtonText',
  {
    defaultMessage: 'Manage organizational content sources',
  }
);
const MANAGE_USERS_BUTTON_TEXT = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.groups.overview.manageUsersButtonText',
  {
    defaultMessage: 'Manage users and roles',
  }
);
const NAME_SECTION_TITLE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.groups.overview.nameSectionTitle',
  {
    defaultMessage: 'Group name',
  }
);
const NAME_SECTION_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.groups.overview.nameSectionDescription',
  {
    defaultMessage: 'Customize the name of this group.',
  }
);
const SAVE_NAME_BUTTON_TEXT = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.groups.overview.saveNameButtonText',
  {
    defaultMessage: 'Save name',
  }
);
const REMOVE_SECTION_TITLE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.groups.overview.removeSectionTitle',
  {
    defaultMessage: 'Remove this group',
  }
);
const REMOVE_SECTION_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.groups.overview.removeSectionDescription',
  {
    defaultMessage: 'This action cannot be undone.',
  }
);
const REMOVE_BUTTON_TEXT = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.groups.overview.removeButtonText',
  {
    defaultMessage: 'Remove group',
  }
);
const CONFIRM_TITLE_TEXT = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.groups.overview.confirmTitleText',
  {
    defaultMessage: 'Confirm',
  }
);

export const GroupOverview: React.FC = () => {
  const {
    deleteGroup,
    showOrgSourcesModal,
    showConfirmDeleteModal,
    hideConfirmDeleteModal,
    updateGroupName,
    onGroupNameInputChange,
  } = useActions(GroupLogic);
  const {
    group: { name, contentSources, canDeleteGroup },
    groupNameInputValue,
    dataLoading,
    confirmDeleteModalVisible,
  } = useValues(GroupLogic);

  const truncatedName = name && (
    <TruncatedContent tooltipType="title" content={name} length={MAX_NAME_LENGTH} />
  );

  const CONFIRM_REMOVE_BUTTON_TEXT = i18n.translate(
    'xpack.enterpriseSearch.workplaceSearch.groups.overview.confirmRemoveButtonText',
    {
      defaultMessage: 'Delete {name}',
      values: { name },
    }
  );
  const CONFIRM_REMOVE_DESCRIPTION = i18n.translate(
    'xpack.enterpriseSearch.workplaceSearch.groups.overview.confirmRemoveDescription',
    {
      defaultMessage:
        'Your group will be deleted from Workplace Search. Are you sure you want to remove {name}?',
      values: { name },
    }
  );
  const GROUP_SOURCES_TITLE = i18n.translate(
    'xpack.enterpriseSearch.workplaceSearch.groups.overview.groupSourcesTitle',
    {
      defaultMessage: 'Group content sources',
    }
  );
  const GROUP_SOURCES_DESCRIPTION = i18n.translate(
    'xpack.enterpriseSearch.workplaceSearch.groups.overview.groupSourcesDescription',
    {
      defaultMessage: 'Searchable by all users in the "{name}" group.',
      values: { name },
    }
  );

  const hasContentSources = contentSources?.length > 0;

  const manageSourcesButton = (
    <EuiButton color="primary" onClick={showOrgSourcesModal}>
      {MANAGE_SOURCES_BUTTON_TEXT}
    </EuiButton>
  );
  const manageUsersButton = (
    <EuiButtonTo color="primary" to={USERS_AND_ROLES_PATH}>
      {MANAGE_USERS_BUTTON_TEXT}
    </EuiButtonTo>
  );
  const sourcesTable = <SourcesTable sources={contentSources} />;

  const sourcesSection = (
    <ContentSection
      title={GROUP_SOURCES_TITLE}
      description={GROUP_SOURCES_DESCRIPTION}
      action={manageSourcesButton}
      data-test-subj="GroupContentSourcesSection"
    >
      {sourcesTable}
    </ContentSection>
  );

  const sourcesEmptyState = (
    <>
      <EuiPanel paddingSize="none" color="subdued">
        <EuiEmptyPrompt
          iconType={noOrgSourcesIcon}
          title={<h2>{GROUP_SOURCES_TITLE}</h2>}
          body={<p>{EMPTY_SOURCES_DESCRIPTION}</p>}
          actions={manageSourcesButton}
        />
      </EuiPanel>
      <EuiSpacer />
    </>
  );

  const usersSection = (
    <ContentSection
      title={USERS_SECTION_TITLE}
      description={GROUP_USERS_DESCRIPTION}
      data-test-subj="GroupUsersSection"
    >
      {manageUsersButton}
    </ContentSection>
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateGroupName();
  };

  const nameSection = (
    <ContentSection title={NAME_SECTION_TITLE} description={NAME_SECTION_DESCRIPTION}>
      <form onSubmit={handleSubmit}>
        <EuiFormRow isInvalid={false}>
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiFieldText
                isInvalid={false}
                value={groupNameInputValue}
                onChange={(e) => onGroupNameInputChange(e.target.value)}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton disabled={!groupNameInputValue} onClick={updateGroupName}>
                {SAVE_NAME_BUTTON_TEXT}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>
      </form>
    </ContentSection>
  );

  const deleteSection = (
    <>
      <EuiSpacer size="xs" />
      <EuiHorizontalRule />
      <EuiSpacer size="xxl" />
      <ContentSection title={REMOVE_SECTION_TITLE} description={REMOVE_SECTION_DESCRIPTION}>
        {confirmDeleteModalVisible && (
          <EuiConfirmModal
            onCancel={hideConfirmDeleteModal}
            onConfirm={deleteGroup}
            confirmButtonText={CONFIRM_REMOVE_BUTTON_TEXT}
            title={CONFIRM_TITLE_TEXT}
            cancelButtonText={CANCEL_BUTTON}
            defaultFocusedButton="confirm"
          >
            {CONFIRM_REMOVE_DESCRIPTION}
          </EuiConfirmModal>
        )}
        <EuiButton
          color="danger"
          data-test-subj="DeleteGroup"
          fill
          onClick={showConfirmDeleteModal}
        >
          {REMOVE_BUTTON_TEXT}
        </EuiButton>
      </ContentSection>
    </>
  );

  return (
    <WorkplaceSearchPageTemplate
      pageChrome={[NAV.GROUPS, name || '...']}
      pageViewTelemetry="group_overview"
      pageHeader={{ pageTitle: truncatedName }}
      isLoading={dataLoading}
    >
      {hasContentSources ? sourcesSection : sourcesEmptyState}
      {usersSection}
      {nameSection}
      {canDeleteGroup && deleteSection}
    </WorkplaceSearchPageTemplate>
  );
};
