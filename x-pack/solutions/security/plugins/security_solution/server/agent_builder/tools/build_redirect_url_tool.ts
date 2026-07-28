/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { encode } from '@kbn/rison';
import { addSpaceIdToPath } from '@kbn/core-spaces-common';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { ENABLE_NEW_FLYOUT_SETTING } from '../../../common/constants';
import { translateLegacyStateToDescriptors } from '../../../common/flyout_v2';
import type { ExperimentalFeatures } from '../../../common';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';
import { securityTool } from './constants';

const FLYOUT_PARAM = 'flyout' as const;
const FLYOUT_V2_PARAM = 'flyoutV2' as const;

export const SECURITY_BUILD_REDIRECT_URL_TOOL_ID = securityTool('build_redirect_url');

// Flyout panel parameters use v1 values, but the tool translates this to v2 descriptors when the new flyout is enabled
const flyoutPanelSchema = z.object({
  id: z.string().describe('The id of the panel to open in this slot.'),
  params: z
    .record(z.string(), z.unknown())
    .optional()
    .describe(
      "The panel's parameters. Substitute only the runtime values you were told to; omit when there are none."
    ),
});

export const buildRedirectUrlSchema = z.object({
  path: z
    .string()
    .describe(
      `The destination as an app-relative Kibana path, starting with a single "/" — e.g. "/app/security/entity_analytics_management/risk_score". Use a path the calling skill's instructions give you; do NOT invent or guess one. Do NOT include the deployment base path or the "/s/<space>" segment (the tool adds them), and do NOT pass an absolute URL (no "http://", "https://", or "//host"). May include its own query string; when it does and a flyout param is also provided, the flyout is appended with "&".`
    ),
  flyout: z
    .object({
      left: flyoutPanelSchema.optional(),
      right: flyoutPanelSchema.optional(),
      preview: z.array(flyoutPanelSchema).optional(),
    })
    .optional()
    .describe(
      "A flyout to open on the destination page, given as `left` / `right` / `preview` panels. Only include this when the calling skill's instructions provide a flyout object, and copy its panels exactly. Leave unset otherwise."
    ),
});

/**
 * Serializes an expandable-flyout state object into a `flyout=<rison>` query param value.
 *
 * Two encodings are applied and they reverse cleanly on read:
 * 1. **Rison** (`encode`) → the compact wire format `@kbn/expandable-flyout` rison-decodes.
 * 2. **Percent-encoding** to make it a valid URL query value. We additionally escape the
 *    characters `encodeURIComponent` leaves raw (`! ' ( ) *`): the returned `url` is meant to be
 *    rendered inside a markdown link `[title](url)`, where literal parentheses/quotes break the
 *    link parser. Rison quotes any value containing `: @ .` with single quotes, so ids routinely
 *    produce `'`, `(`, and `)` here.
 *
 * On read, `new URLSearchParams(search).get('flyout')` percent-decodes, then the flyout code
 * rison-decodes — so both encodings reverse.
 */
const encodeFlyoutQueryValue = (value: unknown): string =>
  encodeURIComponent(encode(value)).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );

const appendQueryParam = (path: string, key: string, value: unknown): string => {
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}${key}=${encodeFlyoutQueryValue(value)}`;
};

/**
 * Turns an app-relative Security path (optionally with flyout state) into a fully-qualified
 * in-app URL, resolving the deployment base path and the active space segment.
 */
export const buildRedirectUrlTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  experimentalFeatures: ExperimentalFeatures
): BuiltinToolDefinition<typeof buildRedirectUrlSchema> => ({
  id: SECURITY_BUILD_REDIRECT_URL_TOOL_ID,
  type: ToolType.builtin,
  description: `Build a clickable in-app link that redirects the user to a specific Security Solution page — use it when an action can't (or shouldn't) be performed in chat and the user needs to complete it in the UI.

**Only call this tool when a skill's instructions explicitly tell you to redirect the user and give you the destination.** The \`path\` (and any \`flyout\`) must come from those instructions — never construct, guess, or infer a Kibana path yourself. If no skill provided a destination, do not call this tool; a made-up path leads to a broken link.

Returns a single \`url\`. Render it in your reply as a markdown link \`[title](url)\`, using the returned \`url\` as-is (do not edit it).

- \`path\`: the app-relative path (starting with "/"), without the base path or space segment — the tool adds those for the current deployment and space.
- \`flyout\` (optional): expandable \`{ left, right, preview }\` panels from the skill. When the new flyout is enabled, panels are translated to \`flyoutV2\` when a mapping exists.

This tool only builds a link; it performs no action.`,
  schema: buildRedirectUrlSchema,
  tags: ['security', 'navigation', 'ui'],
  handler: async ({ path, flyout }, { spaceId, logger, savedObjectsClient }) => {
    if (!path.startsWith('/') || path.startsWith('//')) {
      return {
        results: [
          {
            type: ToolResultType.error as const,
            data: {
              message: `'path' must be an app-relative path starting with a single "/" (got: ${path}). Absolute or protocol-relative URLs are not allowed.`,
            },
          },
        ],
      };
    }

    const [coreStart] = await core.getStartServices();
    let relativePath = path;

    if (flyout && Boolean(flyout.left || flyout.right || flyout.preview)) {
      const useNewFlyout = experimentalFeatures.newFlyoutSystemDisabled
        ? false
        : await coreStart.uiSettings
            .asScopedToClient(savedObjectsClient)
            .get<boolean>(ENABLE_NEW_FLYOUT_SETTING);

      if (useNewFlyout) {
        const translated = translateLegacyStateToDescriptors(flyout);
        if (translated?.length) {
          relativePath = appendQueryParam(relativePath, FLYOUT_V2_PARAM, translated);
        } else {
          // Unmigrated panels - keep the legacy expandable encoding.
          relativePath = appendQueryParam(relativePath, FLYOUT_PARAM, flyout);
        }
      } else {
        relativePath = appendQueryParam(relativePath, FLYOUT_PARAM, flyout);
      }
    }

    const url = addSpaceIdToPath(coreStart.http.basePath.serverBasePath, spaceId, relativePath);

    logger.debug(`${SECURITY_BUILD_REDIRECT_URL_TOOL_ID} built redirect url for path '${path}'`);

    return {
      results: [
        {
          type: ToolResultType.other,
          data: { url },
        },
      ],
    };
  },
});
