#!/bin/bash

# Script to apply all dashboard changes from git history
# This script applies the uncommitted changes to integrate onechat into the dashboard plugin

set -e

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "Error: Not in a git repository"
    exit 1
fi

# Create a temporary patch file
PATCH_FILE=$(mktemp)
trap "rm -f $PATCH_FILE" EXIT

# Generate the patch from current uncommitted changes
cat > "$PATCH_FILE" << 'PATCH_EOF'
diff --git a/src/platform/plugins/shared/dashboard/kibana.jsonc b/src/platform/plugins/shared/dashboard/kibana.jsonc
index 9c04035d12e..cba90dc5baa 100644
--- a/src/platform/plugins/shared/dashboard/kibana.jsonc
+++ b/src/platform/plugins/shared/dashboard/kibana.jsonc
@@ -40,6 +40,7 @@
       "noDataPage",
       "observabilityAIAssistant",
       "lens",
+      "onechat",
       "cps"
     ],
     "requiredBundles": [
diff --git a/src/platform/plugins/shared/dashboard/public/dashboard_app/_dashboard_app_strings.ts b/src/platform/plugins/shared/dashboard/public/dashboard_app/_dashboard_app_strings.ts
index 0caf254d815..78067e1f5f2 100644
--- a/src/platform/plugins/shared/dashboard/public/dashboard_app/_dashboard_app_strings.ts
+++ b/src/platform/plugins/shared/dashboard/public/dashboard_app/_dashboard_app_strings.ts
@@ -157,6 +157,14 @@ export const getDashboardBreadcrumb = () =>
   });

 export const topNavStrings = {
+  chat: {
+    label: i18n.translate('dashboard.topNave.chatButtonAriaLabel', {
+      defaultMessage: 'chat',
+    }),
+    description: i18n.translate('dashboard.topNave.chatConfigDescription', {
+      defaultMessage: 'Open chat',
+    }),
+  },
   fullScreen: {
     label: i18n.translate('dashboard.topNave.fullScreenButtonAriaLabel', {
       defaultMessage: 'full screen',
diff --git a/src/platform/plugins/shared/dashboard/public/dashboard_app/top_nav/use_dashboard_menu_items.tsx b/src/platform/plugins/shared/dashboard/public/dashboard_app/top_nav/use_dashboard_menu_items.tsx
index 6c2a9635909..c1a07b26b21 100644
--- a/src/platform/plugins/shared/dashboard/public/dashboard_app/top_nav/use_dashboard_menu_items.tsx
+++ b/src/platform/plugins/shared/dashboard/public/dashboard_app/top_nav/use_dashboard_menu_items.tsx
@@ -21,7 +21,12 @@ import { confirmDiscardUnsavedChanges } from '../../dashboard_listing/confirm_ov
 import { openSettingsFlyout } from '../../dashboard_renderer/settings/open_settings_flyout';
 import { getDashboardBackupService } from '../../services/dashboard_backup_service';
 import type { SaveDashboardReturn } from '../../dashboard_api/save_modal/types';
-import { coreServices, shareService, dataService } from '../../services/kibana_services';
+import {
+  coreServices,
+  shareService,
+  dataService,
+  onechatService,
+} from '../../services/kibana_services';
 import { getDashboardCapabilities } from '../../utils/get_dashboard_capabilities';
 import { topNavStrings } from '../_dashboard_app_strings';
 import { showAddMenu } from './add_menu/show_add_menu';
@@ -125,6 +130,22 @@ export const useDashboardMenuItems = ({

   const menuItems = useMemo(() => {
     return {
+      chat: {
+        ...topNavStrings.chat,
+        id: 'chat',
+        iconType: 'discuss',
+        iconOnly: true,
+        testId: 'dashboardChatButton',
+        disableButton:
+          disableTopNav ||
+          !onechatService ||
+          typeof onechatService?.openConversationFlyout !== 'function',
+        run: () =>
+          onechatService?.openConversationFlyout({
+            onClose: () => console.log('onClose'),
+          }),
+      } as TopNavMenuData,
+
       fullScreen: {
         ...topNavStrings.fullScreen,
         id: 'full-screen',
@@ -322,6 +343,10 @@ export const useDashboardMenuItems = ({
     const { showWriteControls, storeSearchSession } = getDashboardCapabilities();

     const labsMenuItem = isLabsEnabled ? [menuItems.labs] : [];
+    const chatMenuItem =
+      onechatService && typeof onechatService.openConversationFlyout === 'function'
+        ? [menuItems.chat]
+        : [];
     const shareMenuItem = shareService
       ? ([
           // Only show the export button if the current user meets the requirements for at least one registered export integration
@@ -339,6 +364,7 @@ export const useDashboardMenuItems = ({

     return [
       ...labsMenuItem,
+      ...chatMenuItem,
       menuItems.fullScreen,
       ...duplicateMenuItem,
       ...mayberesetChangesMenuItem,
@@ -349,12 +375,13 @@ export const useDashboardMenuItems = ({
   }, [
     isLabsEnabled,
     menuItems.labs,
+    menuItems.chat,
     menuItems.export,
     menuItems.share,
     menuItems.interactiveSave,
     menuItems.edit,
-    menuItems.fullScreen,
     menuItems.backgroundSearch,
+    menuItems.fullScreen,
     hasExportIntegration,
     dashboardApi.isManaged,
     showResetChange,
diff --git a/src/platform/plugins/shared/dashboard/public/dashboard_renderer/dashboard_renderer.tsx b/src/platform/plugins/shared/dashboard/public/dashboard_renderer/dashboard_renderer.tsx
index 2b77eded553..13dc5074d4b 100644
--- a/src/platform/plugins/shared/dashboard/public/dashboard_renderer/dashboard_renderer.tsx
+++ b/src/platform/plugins/shared/dashboard/public/dashboard_renderer/dashboard_renderer.tsx
@@ -10,7 +10,7 @@
 import classNames from 'classnames';
 import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

-import { EuiEmptyPrompt, EuiLoadingElastic, EuiLoadingSpinner } from '@elastic/eui';
+import { EuiButton, EuiEmptyPrompt, EuiLoadingElastic, EuiLoadingSpinner } from '@elastic/eui';
 import { css } from '@emotion/react';
 import { i18n } from '@kbn/i18n';
 import { SavedObjectNotFound } from '@kbn/kibana-utils-plugin/common';
@@ -25,11 +25,12 @@ import { loadDashboardApi } from '../dashboard_api/load_dashboard_api';
 import { DashboardContext } from '../dashboard_api/use_dashboard_api';
 import { DashboardInternalContext } from '../dashboard_api/use_dashboard_internal_api';
 import type { DashboardRedirect } from '../dashboard_app/types';
-import { coreServices, screenshotModeService } from '../services/kibana_services';
+import { coreServices, onechatService, screenshotModeService } from '../services/kibana_services';

 import { Dashboard404Page } from './dashboard_404';
 import { DashboardViewport } from './viewport/dashboard_viewport';
 import { GlobalPrintStyles } from './print_styles';
+import { AttachmentInput } from '@kbn/onechat-common/attachments';

 export interface DashboardRendererProps {
   locator?: Pick<LocatorPublic<DashboardLocatorParams>, 'navigate' | 'getRedirectUrl'>;
@@ -116,51 +117,50 @@ export function DashboardRenderer({
     <EuiLoadingElastic size="xxl" />
   );

+  const openOneChat = ({
+    newConversation = false,
+    initialMessage = undefined,
+    agentId = 'elastic-ai-agent',
+    attachments = [],
+  }: {
+    newConversation?: boolean;
+    initialMessage?: string;
+    agentId?: string;
+    attachments?: AttachmentInput[];
+  }) => {
+    onechatService?.openConversationFlyout({
+      onClose: () => console.log('onClose'),
+      newConversation,
+      initialMessage,
+      agentId,
+      attachments,
+    });
+  };
+
   const renderDashboardContents = () => {
-    if (error) {
-      return error instanceof SavedObjectNotFound ? (
-        <Dashboard404Page dashboardRedirect={dashboardRedirect} />
-      ) : (
-        <EuiEmptyPrompt
-          iconType="error"
-          iconColor="danger"
-          title={
-            <h2>
-              {i18n.translate('dashboard.dashboardRenderer.loadDashboardErrorTitle', {
-                defaultMessage: 'Unable to load dashboard',
-              })}
-            </h2>
+    return (
+      <div>
+        <EuiButton
+          iconType="plusInCircle"
+          onClick={() =>
+            openOneChat({
+              attachments: [{ type: 'text', data: { content: 'Test attachment 1, hello world!' } }],
+            })
           }
-          body={<p>{error.message}</p>}
-        />
-      );
-    }
-
-    return dashboardApi && dashboardInternalApi ? (
-      <div
-        className="dashboardContainer"
-        data-test-subj="dashboardContainer"
-        css={styles.renderer}
-        ref={(e) => {
-          if (dashboardInternalApi && dashboardInternalApi.dashboardContainerRef$.value !== e) {
-            dashboardInternalApi.setDashboardContainerRef(e);
+        >
+          Add attachement 1
+        </EuiButton>
+        <EuiButton
+          iconType="plusInCircle"
+          onClick={() =>
+            openOneChat({
+              attachments: [{ type: 'text', data: { content: 'Test attachment 2, hello world!' } }],
+            })
           }
-          dashboardContainerRef.current = e;
-        }}
-      >
-        <GlobalPrintStyles />
-        <ExitFullScreenButtonKibanaProvider
-          coreStart={{ chrome: coreServices.chrome, customBranding: coreServices.customBranding }}
         >
-          <DashboardContext.Provider value={dashboardApi}>
-            <DashboardInternalContext.Provider value={dashboardInternalApi}>
-              <DashboardViewport />
-            </DashboardInternalContext.Provider>
-          </DashboardContext.Provider>
-        </ExitFullScreenButtonKibanaProvider>
+          Add attachement 2
+        </EuiButton>
       </div>
-    ) : (
-      loadingSpinner
     );
   };

diff --git a/src/platform/plugins/shared/dashboard/public/plugin.tsx b/src/platform/plugins/shared/dashboard/public/plugin.tsx
index 680566da00d..6b5780274f9 100644
--- a/src/platform/plugins/shared/dashboard/public/plugin.tsx
+++ b/src/platform/plugins/shared/dashboard/public/plugin.tsx
@@ -63,6 +63,7 @@ import type {
 } from '@kbn/usage-collection-plugin/public';
 import type { CPSPluginStart } from '@kbn/cps/public';

+import type { OnechatPluginStart } from '@kbn/onechat-plugin/public';
 import { DashboardAppLocatorDefinition } from '../common/locator/locator';
 import type { DashboardMountContextProps } from './dashboard_app/types';
 import {
@@ -118,6 +119,7 @@ export interface DashboardStartDependencies {
   lens?: LensPublicStart;
   observabilityAIAssistant?: ObservabilityAIAssistantPublicStart;
   cps?: CPSPluginStart;
+  onechat?: OnechatPluginStart;
 }

 // eslint-disable-next-line @typescript-eslint/no-empty-interface
diff --git a/src/platform/plugins/shared/dashboard/public/services/kibana_services.ts b/src/platform/plugins/shared/dashboard/public/services/kibana_services.ts
index 9a8a5be26ac..790232c28b6 100644
--- a/src/platform/plugins/shared/dashboard/public/services/kibana_services.ts
+++ b/src/platform/plugins/shared/dashboard/public/services/kibana_services.ts
@@ -30,6 +30,7 @@ import type { UrlForwardingStart } from '@kbn/url-forwarding-plugin/public';
 import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
 import type { CPSPluginStart } from '@kbn/cps/public';

+import type { OnechatPluginStart } from '@kbn/onechat-plugin/public';
 import type { DashboardStartDependencies } from '../plugin';

 export let coreServices: CoreStart;
@@ -43,6 +44,7 @@ export let navigationService: NavigationPublicPluginStart;
 export let noDataPageService: NoDataPagePluginStart | undefined;
 export let observabilityAssistantService: ObservabilityAIAssistantPublicStart | undefined;
 export let lensService: LensPublicStart | undefined;
+export let onechatService: OnechatPluginStart | undefined;
 export let presentationUtilService: PresentationUtilPluginStart;
 export let savedObjectsTaggingService: SavedObjectTaggingOssPluginStart | undefined;
 export let screenshotModeService: ScreenshotModePluginStart;
@@ -67,6 +69,7 @@ export const setKibanaServices = (kibanaCore: CoreStart, deps: DashboardStartDep
   noDataPageService = deps.noDataPage;
   observabilityAssistantService = deps.observabilityAIAssistant;
   lensService = deps.lens;
+  onechatService = deps.onechat;
   presentationUtilService = deps.presentationUtil;
   savedObjectsTaggingService = deps.savedObjectsTaggingOss;
   serverlessService = deps.serverless;
PATCH_EOF

# Apply the patch
echo "Applying dashboard changes..."
if git apply --check "$PATCH_FILE" 2>/dev/null; then
    git apply "$PATCH_FILE"
    echo "✓ Successfully applied all changes!"
else
    echo "Warning: Patch may have conflicts or changes already applied."
    echo "Attempting to apply with 3-way merge..."
    if git apply --3way "$PATCH_FILE" 2>/dev/null; then
        echo "✓ Successfully applied all changes with 3-way merge!"
    else
        echo "✗ Failed to apply patch. Please review manually."
        echo "Patch file saved at: $PATCH_FILE"
        exit 1
    fi
fi

echo ""
echo "Changes applied to the following files:"
echo "  - src/platform/plugins/shared/dashboard/kibana.jsonc"
echo "  - src/platform/plugins/shared/dashboard/public/dashboard_app/_dashboard_app_strings.ts"
echo "  - src/platform/plugins/shared/dashboard/public/dashboard_app/top_nav/use_dashboard_menu_items.tsx"
echo "  - src/platform/plugins/shared/dashboard/public/dashboard_renderer/dashboard_renderer.tsx"
echo "  - src/platform/plugins/shared/dashboard/public/plugin.tsx"
echo "  - src/platform/plugins/shared/dashboard/public/services/kibana_services.ts"
