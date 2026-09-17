/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiPopover,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { ProjectPickerContent, useFetchProjects } from '@kbn/cps-utils';
import { getEbtProps } from '@kbn/ebt-click';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React, { useState } from 'react';
import { toEsProjectRouting } from '../../../../../common/project_routings';
import { SLO_DETAILS_EBT_ACTIONS, SLO_DETAILS_EBT_ELEMENTS } from '../../ebt_constants';
import type { CpsProjectScope } from '../../../../hooks/use_cps_project_scope';
import { useCpsProjectScope } from '../../../../hooks/use_cps_project_scope';
import {
  getProjectCountLabel,
  getStaticProjectScopeLabel,
  PROJECT_SCOPE_LABEL,
  PROJECT_SCOPE_LOADING_LABEL,
  PROJECT_SCOPE_UNAVAILABLE_LABEL,
} from '../../../../utils/slo/project_scope';

interface ResolvedProjectScopeLabelProps {
  fetchProjects: CpsProjectScope['fetchProjects'];
  projectRouting: string;
  totalProjectCount: number;
}

/**
 * Resolves the routing server-side rather than decoding it locally, so tag-filter routings
 * that only the server can expand still report an accurate project count.
 */
function ResolvedProjectScopeLabel({
  fetchProjects,
  projectRouting,
  totalProjectCount,
}: ResolvedProjectScopeLabelProps) {
  const { originProject, linkedProjects, isLoading, error } = useFetchProjects(
    fetchProjects,
    projectRouting
  );

  if (isLoading) {
    return <>{PROJECT_SCOPE_LOADING_LABEL}</>;
  }

  if (error) {
    return <>{PROJECT_SCOPE_UNAVAILABLE_LABEL}</>;
  }

  const matchedCount = (originProject ? 1 : 0) + linkedProjects.length;

  return <>{getProjectCountLabel(matchedCount, totalProjectCount)}</>;
}

export interface Props {
  slo: SLOWithSummaryResponse;
}

export function ProjectScopeRow({ slo }: Props) {
  const { showProjectScopeUI, cpsManager, fetchProjects } = useCpsProjectScope();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const popoverTitleId = useGeneratedHtmlId();

  const { projectRoutings, preventCrossProjectSearch } = slo.settings;
  const projectRouting = toEsProjectRouting(projectRoutings, preventCrossProjectSearch);

  if (!showProjectScopeUI || !cpsManager) {
    return null;
  }

  const totalProjectCount = cpsManager.getTotalProjectCount();
  const label = getStaticProjectScopeLabel(projectRouting) ?? (
    <ResolvedProjectScopeLabel
      fetchProjects={fetchProjects}
      projectRouting={projectRouting}
      totalProjectCount={totalProjectCount}
    />
  );

  return (
    <>
      <EuiDescriptionListTitle>{PROJECT_SCOPE_LABEL}</EuiDescriptionListTitle>
      <EuiDescriptionListDescription>
        {totalProjectCount <= 1 ? (
          <EuiText size="s" data-test-subj="sloDetailsProjectScope">
            {label}
          </EuiText>
        ) : (
          <EuiPopover
            aria-labelledby={popoverTitleId}
            anchorPosition="downLeft"
            button={
              <EuiButtonEmpty
                data-test-subj="sloDetailsProjectScopeButton"
                flush="both"
                onClick={() => setIsPopoverOpen((isOpen) => !isOpen)}
                size="s"
                {...getEbtProps({
                  action: SLO_DETAILS_EBT_ACTIONS.VIEW_PROJECT_SCOPE,
                  element: SLO_DETAILS_EBT_ELEMENTS.PROJECT_SCOPE_ROW,
                })}
              >
                {label}
              </EuiButtonEmpty>
            }
            closePopover={() => setIsPopoverOpen(false)}
            isOpen={isPopoverOpen}
            panelPaddingSize="none"
            repositionOnScroll
          >
            <ProjectPickerContent
              controlsState="hidden"
              customHeaderText={
                <EuiText size="s">
                  <p id={popoverTitleId}>{PROJECT_SCOPE_LABEL}</p>
                </EuiText>
              }
              fetchProjectsByRouting={fetchProjects}
              projectRouting={projectRouting}
            />
          </EuiPopover>
        )}
      </EuiDescriptionListDescription>
    </>
  );
}
