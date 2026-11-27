/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from '@kbn/safer-lodash-set';
import type { Capabilities, IUiSettingsClient } from '@kbn/core/public';
import type { ILicense } from '@kbn/licensing-types';
import type { UpsellingService } from '@kbn/security-solution-upselling/service';
import {
  RULES_UI_READ_PRIVILEGE,
  SECURITY_UI_SHOW_PRIVILEGE,
  SIEM_MIGRATIONS_FEATURE_ID,
} from '@kbn/security-solution-features/constants';
import { WORKFLOWS_UI_SETTING_ID } from '@kbn/workflows';
import { SecurityPageName } from '../../common/constants';
import type { ExperimentalFeatures } from '../../common';
import {
  applicationLinksUpdater,
  type ApplicationLinksUpdateParams,
} from '../app/links/application_links_updater';
import type { AppLinkItems, LinkItem } from '../common/links/types';
import { links } from './links';

// Allow access to the private method, as the application links updater tests do
const processAppLinks = (params: ApplicationLinksUpdateParams) =>
  (
    applicationLinksUpdater as unknown as {
      processAppLinks: (items: AppLinkItems, p: ApplicationLinksUpdateParams) => LinkItem[];
    }
  ).processAppLinks([links], params);

const findLink = (items: LinkItem[] | undefined, id: SecurityPageName): LinkItem | undefined => {
  for (const item of items ?? []) {
    if (item.id === id) {
      return item;
    }
    const found = findLink(item.links, id);
    if (found) {
      return found;
    }
  }
  return undefined;
};

interface ScenarioOptions {
  experimentalFeatures?: Partial<ExperimentalFeatures>;
  workflowsUiEnabled?: boolean;
  /** capability key -> granted, set on top of the SIEM migrations ones */
  capabilities?: Record<string, boolean>;
}

const buildParams = ({
  experimentalFeatures = {},
  workflowsUiEnabled = true,
  capabilities = {},
}: ScenarioOptions): ApplicationLinksUpdateParams => {
  const allCapabilities = {} as Record<string, unknown>;
  set(allCapabilities, SECURITY_UI_SHOW_PRIVILEGE, true);
  set(allCapabilities, `${SIEM_MIGRATIONS_FEATURE_ID}.all`, true);
  Object.entries(capabilities).forEach(([key, granted]) => set(allCapabilities, key, granted));

  return {
    capabilities: allCapabilities as unknown as Capabilities,
    experimentalFeatures: {
      siemMigrationsDisabled: false,
      automaticDashboardsMigration: true,
      tinesWorkflowsMigration: true,
      ...experimentalFeatures,
    } as ExperimentalFeatures,
    uiSettingsClient: {
      get: jest.fn((key: string) => (key === WORKFLOWS_UI_SETTING_ID ? workflowsUiEnabled : true)),
      isDeclared: jest.fn(() => true),
    } as unknown as IUiSettingsClient,
    license: { hasAtLeast: jest.fn().mockReturnValue(true) } as unknown as ILicense,
    upselling: {
      isPageUpsellable: jest.fn().mockReturnValue(false),
    } as unknown as UpsellingService,
  };
};

const workflowsAllowed = {
  'workflowsManagement.readWorkflow': true,
  'actions.execute': true,
};

describe('SIEM migrations links', () => {
  describe('Translated workflows link', () => {
    it('should be available when the flag, the ui setting and the privileges allow it', () => {
      const result = processAppLinks(buildParams({ capabilities: workflowsAllowed }));

      expect(findLink(result, SecurityPageName.siemMigrationsWorkflows)).toEqual(
        expect.objectContaining({ id: SecurityPageName.siemMigrationsWorkflows })
      );
      expect(findLink(result, SecurityPageName.siemMigrationsWorkflows)?.unauthorized).toBe(
        undefined
      );
    });

    it('should not be available when the tinesWorkflowsMigration flag is off', () => {
      const result = processAppLinks(
        buildParams({
          capabilities: workflowsAllowed,
          experimentalFeatures: { tinesWorkflowsMigration: false },
        })
      );

      expect(findLink(result, SecurityPageName.siemMigrationsWorkflows)).toBeUndefined();
    });

    it('should not be available when siem migrations are disabled', () => {
      const result = processAppLinks(
        buildParams({
          capabilities: workflowsAllowed,
          experimentalFeatures: { siemMigrationsDisabled: true },
        })
      );

      expect(findLink(result, SecurityPageName.siemMigrationsWorkflows)).toBeUndefined();
    });

    it('should not be available when the workflows ui setting is disabled', () => {
      const result = processAppLinks(
        buildParams({ capabilities: workflowsAllowed, workflowsUiEnabled: false })
      );

      expect(findLink(result, SecurityPageName.siemMigrationsWorkflows)).toBeUndefined();
    });

    it('should be unauthorized when the workflows read privilege is not granted', () => {
      const result = processAppLinks(
        buildParams({
          capabilities: { ...workflowsAllowed, 'workflowsManagement.readWorkflow': false },
        })
      );

      expect(findLink(result, SecurityPageName.siemMigrationsWorkflows)?.unauthorized).toBe(true);
    });

    it('should be unauthorized when the actions execute privilege is not granted', () => {
      const result = processAppLinks(
        buildParams({ capabilities: { ...workflowsAllowed, 'actions.execute': false } })
      );

      expect(findLink(result, SecurityPageName.siemMigrationsWorkflows)?.unauthorized).toBe(true);
    });

    it('should not be available when the workflows feature capabilities do not exist', () => {
      const result = processAppLinks(buildParams({ capabilities: { 'actions.execute': true } }));

      expect(findLink(result, SecurityPageName.siemMigrationsWorkflows)).toBeUndefined();
    });

    it('should not hide the other migration links when it is not available', () => {
      const result = processAppLinks(
        buildParams({
          capabilities: { ...workflowsAllowed, [RULES_UI_READ_PRIVILEGE]: true },
          experimentalFeatures: { tinesWorkflowsMigration: false },
        })
      );

      expect(findLink(result, SecurityPageName.siemMigrationsManage)).toBeDefined();
    });
  });

  describe('Manage automatic migrations link', () => {
    it('should be authorized for a user with only the siem migrations and workflows read privileges', () => {
      const result = processAppLinks(
        buildParams({ capabilities: { 'workflowsManagement.readWorkflow': true } })
      );

      const manageLink = findLink(result, SecurityPageName.siemMigrationsManage);
      expect(manageLink).toBeDefined();
      expect(manageLink?.unauthorized).toBe(undefined);
    });
  });
});
