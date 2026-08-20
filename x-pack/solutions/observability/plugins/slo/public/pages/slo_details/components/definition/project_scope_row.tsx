/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiLink,
  EuiPopover,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { ICPSManager } from '@kbn/cps-utils';
import { ProjectPickerContent, useFetchProjects } from '@kbn/cps-utils';
import type { ProjectRouting } from '@kbn/es-query';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React, { useCallback, useMemo, useState } from 'react';
import {
  LOCAL_PROJECT_ROUTING,
  toPickerProjectRouting,
} from '../../../../../common/project_routings';
import { useKibana } from '../../../../hooks/use_kibana';
import { usePluginContext } from '../../../../hooks/use_plugin_context';
import {
  getProjectCountLabel,
  getStaticProjectScopeLabel,
  PROJECT_SCOPE_LABEL,
  PROJECT_SCOPE_LOADING_LABEL,
  PROJECT_SCOPE_UNAVAILABLE_LABEL,
} from '../../../../utils/slo/project_scope';

interface ProjectScopeLabelProps {
  cpsManager: ICPSManager;
  projectRouting: string;
}

/**
 * Resolves the routing server-side rather than decoding it locally, so tag-filter routings
 * that only the server can expand still report an accurate project count.
 */
function ResolvedProjectScopeLabel({ cpsManager, projectRouting }: ProjectScopeLabelProps) {
  const fetchProjects = useCallback(
    (routing?: ProjectRouting) => cpsManager.fetchProjects(routing),
    [cpsManager]
  );
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

  return <>{getProjectCountLabel(matchedCount, cpsManager.getTotalProjectCount())}</>;
}

function ProjectScopeLabel({ cpsManager, projectRouting }: ProjectScopeLabelProps) {
  const staticLabel = getStaticProjectScopeLabel(projectRouting);

  if (staticLabel) {
    return <>{staticLabel}</>;
  }

  return <ResolvedProjectScopeLabel cpsManager={cpsManager} projectRouting={projectRouting} />;
}

export interface ProjectScopeRowProps {
  slo: SLOWithSummaryResponse;
}

export function ProjectScopeRow({ slo }: ProjectScopeRowProps) {
  const { isServerless } = usePluginContext();
  const { cps } = useKibana().services;
  const cpsManager = cps?.cpsManager;
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const popoverTitleId = useGeneratedHtmlId();

  const { projectRoutings, preventCrossProjectSearch } = slo.settings;
  // An unset routing means origin-only, which is the same display bucket as `_alias:_origin`.
  const projectRouting =
    toPickerProjectRouting(projectRoutings, preventCrossProjectSearch) ?? LOCAL_PROJECT_ROUTING;

  const fetchProjects = useCallback(
    (routing?: ProjectRouting) => {
      if (!cpsManager) {
        return Promise.resolve(null);
      }
      return cpsManager.fetchProjects(routing);
    },
    [cpsManager]
  );

  const popoverTitle = useMemo(
    () => (
      <EuiText size="s">
        <p id={popoverTitleId}>{PROJECT_SCOPE_LABEL}</p>
      </EuiText>
    ),
    [popoverTitleId]
  );

  if (!isServerless || !cps?.isTierEligible || !cpsManager) {
    return null;
  }

  const label = <ProjectScopeLabel cpsManager={cpsManager} projectRouting={projectRouting} />;

  return (
    <>
      <EuiDescriptionListTitle>{PROJECT_SCOPE_LABEL}</EuiDescriptionListTitle>
      <EuiDescriptionListDescription>
        {cpsManager.getTotalProjectCount() <= 1 ? (
          <EuiText size="s" data-test-subj="sloDetailsProjectScope">
            {label}
          </EuiText>
        ) : (
          <EuiPopover
            aria-labelledby={popoverTitleId}
            anchorPosition="downLeft"
            button={
              <EuiLink
                data-test-subj="sloDetailsProjectScopeButton"
                onClick={() => setIsPopoverOpen((isOpen) => !isOpen)}
              >
                {label}
              </EuiLink>
            }
            closePopover={() => setIsPopoverOpen(false)}
            isOpen={isPopoverOpen}
            panelPaddingSize="none"
            repositionOnScroll
          >
            <ProjectPickerContent
              controlsState="hidden"
              customHeaderText={popoverTitle}
              fetchProjectsByRouting={fetchProjects}
              projectRouting={projectRouting}
            />
          </EuiPopover>
        )}
      </EuiDescriptionListDescription>
    </>
  );
}
