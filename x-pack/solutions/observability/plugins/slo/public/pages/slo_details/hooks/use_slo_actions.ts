/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesLocatorID, RulesParams } from '@kbn/observability-plugin/public';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import path from 'path';
import { paths } from '../../../../common/locators/paths';
import { useSpace } from '../../../hooks/use_space';
import { BurnRateRuleParams } from '../../../typings';
import { useKibana } from '../../../hooks/use_kibana';
import {
  createRemoteSloDeleteUrl,
  createRemoteSloDisableUrl,
  createRemoteSloEditUrl,
  createRemoteSloEnableUrl,
  createRemoteSloResetUrl,
} from '../../../utils/slo/remote_slo_urls';

interface Props {
  slo?: SLOWithSummaryResponse;
  rules?: Array<Rule<BurnRateRuleParams>>;
  setIsEditRuleFlyoutOpen: (val: boolean) => void;
  setIsActionsPopoverOpen: (val: boolean) => void;
}

export const useSloActions = ({
  slo,
  rules,
  setIsEditRuleFlyoutOpen,
  setIsActionsPopoverOpen,
}: Props) => {
  const {
    share: {
      url: { locators },
    },
    http,
  } = useKibana().services;
  const spaceId = useSpace();

  if (!slo) {
    return {
      sloEditUrl: '',
      handleNavigateToRules: () => {},
      remoteDeleteUrl: undefined,
      remoteResetUrl: undefined,
      remoteEnableUrl: undefined,
      remoteDisableUrl: undefined,
      sloDetailsUrl: '',
    };
  }

  const handleNavigateToRules = async () => {
    if (rules?.length === 1) {
      // if there is only one rule we can edit inline in flyout
      setIsEditRuleFlyoutOpen(true);
      setIsActionsPopoverOpen(false);
    } else {
      const locator = locators.get<RulesParams>(rulesLocatorID);
      if (!locator) return undefined;

      if (slo.remote && slo.remote.kibanaUrl !== '') {
        const basePath = http.basePath.get(); // "/kibana/s/my-space"
        const url = await locator.getUrl({ params: { sloId: slo.id } }); // "/kibana/s/my-space/app/rules/123"
        // since basePath is already included in the locatorUrl, we need to remove it from the start of url
        const urlWithoutBasePath = url?.replace(basePath, ''); // "/app/rules/123"
        const spacePath = spaceId !== 'default' ? `/s/${spaceId}` : '';
        const remoteUrl = new URL(path.join(spacePath, urlWithoutBasePath), slo.remote.kibanaUrl); // "kibanaUrl/s/my-space/app/rules/123"
        window.open(remoteUrl, '_blank');
      } else {
        locator.navigate({ params: { sloId: slo.id } }, { replace: false });
      }
    }
  };

  const detailsUrl = paths.sloDetails(slo.id, slo.instanceId, slo.remote?.remoteName);

  const remoteDeleteUrl = createRemoteSloDeleteUrl(slo, spaceId);
  const remoteResetUrl = createRemoteSloResetUrl(slo, spaceId);
  const remoteEnableUrl = createRemoteSloEnableUrl(slo, spaceId);
  const remoteDisableUrl = createRemoteSloDisableUrl(slo, spaceId);

  const sloEditUrl = slo.remote
    ? createRemoteSloEditUrl(slo, spaceId)
    : http.basePath.prepend(paths.sloEdit(slo.id));

  return {
    sloEditUrl,
    handleNavigateToRules,
    remoteDeleteUrl,
    remoteResetUrl,
    remoteEnableUrl,
    remoteDisableUrl,
    sloDetailsUrl: http.basePath.prepend(detailsUrl),
  };
};
