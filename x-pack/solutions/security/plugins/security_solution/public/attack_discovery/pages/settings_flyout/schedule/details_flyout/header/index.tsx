/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiSpacer, EuiTitle } from '@elastic/eui';
import type { AttackDiscoverySchedule } from '@kbn/elastic-assistant-common';

import * as i18n from './translations';
import { CreatedBy } from './created_info';
import { UpdatedBy } from './updated_info';
import { Status } from './status';
import { Subtitle } from '../../../../../../common/components/subtitle';

interface Props {
  isEditing: boolean;
  isLoading: boolean;
  schedule?: AttackDiscoverySchedule;
  titleId: string;
}

export const Header: React.FC<Props> = React.memo(({ isEditing, isLoading, schedule, titleId }) => {
  const title = useMemo(() => {
    const scheduleName = schedule?.name ?? '';
    return isEditing
      ? i18n.SCHEDULE_UPDATE_TITLE(scheduleName)
      : i18n.SCHEDULE_DETAILS_TITLE(scheduleName);
  }, [isEditing, schedule]);

  const infoSubtitle = useMemo(
    () =>
      schedule ? (
        [
          <CreatedBy createdBy={schedule.createdBy} createdAt={schedule.createdAt} />,
          <UpdatedBy updatedBy={schedule.updatedBy} updatedAt={schedule.updatedAt} />,
        ]
      ) : isLoading ? (
        <EuiLoadingSpinner size="m" data-test-subj="spinner" />
      ) : null,
    [isLoading, schedule]
  );

  const statusSubtitle = useMemo(() => {
    return (
      <EuiFlexGroup alignItems="center" gutterSize="xs">
        <EuiFlexItem grow={false}>
          <strong>
            {i18n.STATUS}
            {':'}
          </strong>
        </EuiFlexItem>
        {isLoading ? (
          <EuiFlexItem>
            <EuiLoadingSpinner size="m" data-test-subj="spinner" />
          </EuiFlexItem>
        ) : (
          <Status schedule={schedule} />
        )}
      </EuiFlexGroup>
    );
  }, [isLoading, schedule]);

  return (
    <>
      <EuiSpacer size="s" />
      <EuiTitle data-test-subj="scheduleDetailsTitle" size="m">
        <h2 id={titleId}>{title}</h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <div data-test-subj="header-subtitle">
        <Subtitle items={infoSubtitle} />
      </div>
      <EuiSpacer size="xs" />
      <div data-test-subj="header-subtitle-2">
        <Subtitle items={statusSubtitle} />
      </div>
    </>
  );
});
Header.displayName = 'Header';
