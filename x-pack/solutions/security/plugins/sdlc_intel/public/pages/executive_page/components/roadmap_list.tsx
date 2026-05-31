/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiEmptyPrompt, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { SdlcRoadmapGroup } from '../../../../common/api/types';
import { groupRoadmapsByOrgTeamSubteam } from '../lib/executive_filters';
import { OrgTeamGroup } from './org_team_group';

export const RoadmapList = ({
  roadmaps,
  expandAll,
}: {
  roadmaps: readonly SdlcRoadmapGroup[];
  expandAll: boolean;
}) => {
  const orgTeamGroups = useMemo(() => groupRoadmapsByOrgTeamSubteam(roadmaps), [roadmaps]);

  if (orgTeamGroups.length === 0) {
    return (
      <EuiEmptyPrompt
        iconType="search"
        title={
          <FormattedMessage
            id="xpack.sdlcIntel.executive.empty.title"
            defaultMessage="No epics match the current filters"
          />
        }
        body={
          <EuiText color="subdued">
            <FormattedMessage
              id="xpack.sdlcIntel.executive.empty.body"
              defaultMessage="Try clearing search or coverage filters. This view shows Security org teams only."
            />
          </EuiText>
        }
      />
    );
  }

  return (
    <>
      {orgTeamGroups.map((orgTeam) => (
        <OrgTeamGroup key={orgTeam.orgTeamKey} orgTeam={orgTeam} expandAll={expandAll} />
      ))}
      <EuiSpacer size="l" />
    </>
  );
};
