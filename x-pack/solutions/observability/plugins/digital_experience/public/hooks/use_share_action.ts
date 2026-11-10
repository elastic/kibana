/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import qs from 'query-string';
import type { AppHeaderShareAction } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import {
  DIGITAL_EXPERIENCE_LOCATOR_ID,
  DIGITAL_EXPERIENCE_LOCATOR_QUERY_KEYS,
  type DigitalExperienceLocatorParams,
  type DigitalExperienceLocatorTab,
} from '../../common/locator';
import type { ApplicationSource } from '../../common/types/applications';
import { canCreateShortUrl } from '../capabilities';
import { useKibanaServices } from './use_kibana_services';

const SHARE_TITLE = i18n.translate('xpack.digitalExperience.share.modalTitle', {
  defaultMessage: 'Share this application',
});

const SHARE_TOOLTIP = i18n.translate('xpack.digitalExperience.share.tooltip', {
  defaultMessage: 'Share application',
});

/** An application's page as the locator names it: its tab and the state its URL holds. */
export const getShareParams = ({
  serviceName,
  source,
  tab,
  search,
}: {
  serviceName: string;
  source: ApplicationSource;
  tab: DigitalExperienceLocatorTab;
  search: string;
}): DigitalExperienceLocatorParams => {
  const query = qs.parse(search);
  const state = Object.fromEntries(
    DIGITAL_EXPERIENCE_LOCATOR_QUERY_KEYS.flatMap((key) => {
      const value = query[key];
      return typeof value === 'string' && value !== '' ? [[key, value]] : [];
    })
  );
  return { ...state, serviceName, tab, source };
};

/**
 * The Share action of an application's header. It opens Kibana's Share modal on the page the URL
 * shows, which copies its link and, with the privilege to create short URLs, a short one that can
 * also fix a relative time range. `undefined` without the locator, which the share plugin holds.
 */
export const useShareAction = ({
  serviceName,
  source,
  tab,
}: {
  serviceName: string;
  source: ApplicationSource;
  tab: DigitalExperienceLocatorTab;
}): AppHeaderShareAction | undefined => {
  const { share, application } = useKibanaServices();
  const { search } = useLocation();
  const locator = share.url.locators.get(DIGITAL_EXPERIENCE_LOCATOR_ID);
  const allowShortUrl = canCreateShortUrl(application.capabilities);

  const onClick = useCallback<AppHeaderShareAction['onClick']>(
    ({ returnFocus }) => {
      if (!locator) {
        return;
      }
      const params = getShareParams({ serviceName, source, tab, search });
      share.toggleShareContextMenu({
        isDirty: false,
        allowShortUrl,
        objectType: 'digitalExperienceApplication',
        // The app has no embeddable view, so only its link is shared.
        objectTypeMeta: { title: SHARE_TITLE, config: { embed: { disabled: true } } },
        shareableUrl: window.location.href,
        // The locator only makes short URLs and gives the modal its "Use absolute time range" switch.
        // A long link is copied as it is, so without short URLs the switch would promise fixed dates
        // that the link does not have.
        shareableUrlLocatorParams: allowShortUrl ? { locator, params } : undefined,
        sharingData: { title: serviceName, locatorParams: { id: locator.id, params } },
        onClose: returnFocus,
      });
    },
    [allowShortUrl, locator, search, serviceName, share, source, tab]
  );

  return useMemo(
    () => (locator ? { onClick, tooltip: { content: SHARE_TOOLTIP } } : undefined),
    [locator, onClick]
  );
};
