/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityPageName } from '@kbn/deeplinks-security';
import { encode, safeDecode } from '@kbn/rison';
import {
  getRuleDetailsUrl,
  useGetSecuritySolutionUrl,
} from '../../../../common/components/link_to';
import { URL_PARAM_KEY } from '../../../../common/hooks/use_url_state';
import type { TimelineUrl } from '../../../../timelines/store/model';

export interface UseRuleDetailsLinkParams {
  /**
   * Id of the rule to navigate to
   */
  ruleId: string | null;
}

/**
 * Hook that returns the url to navigate to the rule details page.
 * If the timeline is open from where the hook is being called, set the state to closed.
 */
export const useRuleDetailsLink = ({ ruleId }: UseRuleDetailsLinkParams): string | null => {
  const getSecuritySolutionUrl = useGetSecuritySolutionUrl();

  if (!ruleId) return null;

  const path = getRuleDetailsUrl(ruleId);
  let href = getSecuritySolutionUrl({ deepLinkId: SecurityPageName.rules, path });

  const timelineState = new URLSearchParams(href).get(URL_PARAM_KEY.timeline);
  if (timelineState) {
    const parsedState = safeDecode(timelineState) as TimelineUrl | null;

    if (parsedState && parsedState.isOpen) {
      const encodedState = encode({ ...parsedState, isOpen: false });
      href = href.replace(timelineState, encodedState);
    }
  }

  return href;
};
