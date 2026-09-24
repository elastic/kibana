# Vector Database solution telemetry

The Vector Database solution reports product telemetry through a single channel: `data-telemetry-id` attributes on interactive elements, which the platform's click-tracking picks up automatically. There are no custom EBT events, `performance_metric` events, or `trackUiMetric` UI counters in this solution.

IDs are dash-separated and follow the pattern `<prefix>-<surface>-<element>`. Two prefixes are used:

| Prefix                | Module                                                              | Description                                     |
| --------------------- | ------------------------------------------------------------------- | ----------------------------------------------- |
| `serverlessVectordb-` | `plugins/serverless_vectordb`                                       | The serverless home page.                       |
| `vectordbOnboarding-` | `packages/kbn-vectordb-onboarding` (`@kbn/vectordb-onboarding`)     | Onboarding path selection, wizard, and the shared connection-details controls. |

## Home page

Rendered by `plugins/serverless_vectordb/public/home/`. All IDs use the `serverlessVectordb-home-` prefix except the connection-details controls, which come from the onboarding package with `telemetryPage="homePage"`.

### Header and footer

| Telemetry ID                                        | Attached to                                              | Description                                         |
| --------------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------- |
| `serverlessVectordb-home-documentationLink`         | `EuiLink` "Learn more about Elasticsearch Vector Database" | Opens the vector database docs.                     |
| `vectordbOnboarding-homePage-copyEndpointUrl`       | `EuiButtonIcon` (copy) beside the endpoint URL           | Copies the Elasticsearch URL.                       |
| `vectordbOnboarding-homePage-apiKeys-btn`           | `EuiButton` "Generate API key" (`xl` breakpoint only)    | Opens the connection-details flyout, API keys tab.  |
| `vectordbOnboarding-homePage-connectionDetails-btn` | `EuiButtonIcon` (plugs) "Connection details"             | Opens the connection-details flyout.                |

### Getting-started banner

Shown only when the project has no data and the banner has not been dismissed.

| Telemetry ID                              | Attached to                                    | Description                                 |
| ----------------------------------------- | ---------------------------------------------- | ------------------------------------------- |
| `serverlessVectordb-home-getStartedBtn`   | `AnnouncementBanner` primary action "Get started" | Navigates to onboarding path selection.  |
| `serverlessVectordb-home-banner-dismiss`  | `AnnouncementBanner` dismiss button            | Hides the banner and persists the dismissal. |

### Data card

| Telemetry ID                                       | Attached to                                                   | Description                                    |
| -------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------- |
| `serverlessVectordb-home-dataCard-dataManagement`  | `EuiButton` "Manage data" (only when Index Management is visible) | Navigates to Index Management.             |

### New index callout (inside the Data card)

In the wide layout, Open and Dismiss render as buttons alongside an ellipsis menu containing "View in Discover". In the compact layout all three move into the menu. The Open and Dismiss IDs are shared between the button and the menu-item rendering.

| Telemetry ID                                    | Attached to                                                | Description                                  |
| ----------------------------------------------- | ---------------------------------------------------------- | -------------------------------------------- |
| `serverlessVectordb-home-newIndex-open`         | `EuiButton` "Open index" / `EuiContextMenuItem` "Open index" | Opens the new index in Index Management.  |
| `serverlessVectordb-home-newIndex-dismiss`      | `EuiButtonEmpty` "Dismiss" / `EuiContextMenuItem` "Dismiss" | Dismisses the new-index callout.            |
| `serverlessVectordb-home-newIndex-discover`     | `EuiContextMenuItem` "View in Discover"                    | Opens the index in Discover.                 |
| `serverlessVectordb-home-newIndex-actionsMenu`  | `EuiButtonIcon` (ellipsis)                                 | Toggles the new-index actions menu.          |

### Dashboards card

| Telemetry ID                                              | Attached to                              | Description                        |
| --------------------------------------------------------- | ---------------------------------------- | ---------------------------------- |
| `serverlessVectordb-home-dashboardsCard-actionsMenu`      | `EuiButtonIcon` (ellipsis)               | Toggles the card actions menu.     |
| `serverlessVectordb-home-dashboardsCard-createDashboard`  | `EuiContextMenuItem` "Create a dashboard" | Navigates to `dashboards#/create`. |
| `serverlessVectordb-home-dashboardsCard-manageDashboards` | `EuiContextMenuItem` "Manage dashboards" | Navigates to `dashboards#/list`.   |

### Workflows card

| Telemetry ID                                            | Attached to                              | Description                       |
| ------------------------------------------------------- | ---------------------------------------- | --------------------------------- |
| `serverlessVectordb-home-workflowsCard-actionsMenu`     | `EuiButtonIcon` (ellipsis)               | Toggles the card actions menu.    |
| `serverlessVectordb-home-workflowsCard-createWorkflow`  | `EuiContextMenuItem` "Create a workflow" | Navigates to `workflows/create`.  |
| `serverlessVectordb-home-workflowsCard-manageWorkflows` | `EuiContextMenuItem` "Manage workflows"  | Navigates to `workflows`.         |

### API Keys card

| Telemetry ID                                        | Attached to                              | Description                                          |
| --------------------------------------------------- | ---------------------------------------- | ---------------------------------------------------- |
| `serverlessVectordb-home-apiKeysCard-actionsMenu`   | `EuiButtonIcon` (ellipsis)               | Toggles the card actions menu.                       |
| `serverlessVectordb-home-apiKeysCard-createApiKey`  | `EuiContextMenuItem` "Create an API key" | Navigates to `management/security/api_keys/create`. |
| `serverlessVectordb-home-apiKeysCard-manageApiKeys` | `EuiContextMenuItem` "Manage API keys"   | Navigates to `management/security/api_keys`.        |

### Add data section

Each row is a clickable `EuiPanel`.

| Telemetry ID                                  | Attached to                                | Description                                          |
| --------------------------------------------- | ------------------------------------------ | ---------------------------------------------------- |
| `serverlessVectordb-home-addData-embeddings`  | `EuiPanel` "Generate or store embeddings"  | Navigates to the onboarding getting-started path.    |
| `serverlessVectordb-home-addData-devTools`    | `EuiPanel` "Query your data in Console"    | Navigates to Dev Tools.                              |
| `serverlessVectordb-home-addData-sampleData`  | `EuiPanel` "Browse sample data sets"       | Navigates to `home#/tutorial_directory/sampleData`.  |
| `serverlessVectordb-home-addData-uploadFile`  | `EuiPanel` "Upload a file"                 | Navigates to `home#/tutorial_directory/fileDataViz`. |

### Chat with your data section

| Telemetry ID                                      | Attached to                                  | Description                                            |
| ------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------ |
| `serverlessVectordb-home-chat-viewPrompt`         | `EuiButton` "View prompt"                    | Opens the skills prompt modal.                         |
| `serverlessVectordb-home-chat-openElasticAgent`   | `AiButton` "Chat with AI Agent"              | Opens Agent Builder chat with `sessionTag: vectordb-home`. |
| `serverlessVectordb-home-chat-closePrompt`        | `EuiButtonEmpty` "Close" (modal footer)      | Closes the prompt modal.                               |
| `serverlessVectordb-home-chat-copyPrompt`         | `EuiButton` "Copy to clipboard" (modal footer) | Copies the prompt text.                              |

## Onboarding: path selection

Rendered by `onboarding_landing_page.tsx` in the onboarding package with `telemetryPage="pathSelection"`. All IDs use the `vectordbOnboarding-pathSelection-` prefix.

### Path cards

| Telemetry ID                                          | Attached to                                                    | Description                                           |
| ----------------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------- |
| `vectordbOnboarding-pathSelection-generateVectors`    | `EuiSplitPanel.Outer` "Generate embeddings from your content"  | Chooses the `generate-vectors` path.                  |
| `vectordbOnboarding-pathSelection-haveVectors`        | `EuiSplitPanel.Outer` "Store your existing embeddings"         | Chooses the `have-vectors` path.                      |

### Footer

| Telemetry ID                                       | Attached to                                              | Description                              |
| -------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------- |
| `vectordbOnboarding-pathSelection-documentation`   | `EuiLink` "Learn more about Elasticsearch Vector Database" | Opens the vector database docs.        |
| `vectordbOnboarding-pathSelection-skip`            | `EuiButtonEmpty` "Skip the setup guide"                  | Returns to the home page.                |

### Connect to your project

`ConnectToProject` is rendered here with `showConnectionTypeSelector` and the full API key split button.

| Telemetry ID                                                        | Attached to                                                       | Description                                            |
| ------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------ |
| `vectordbOnboarding-pathSelection-copyEndpointUrl`                  | `EuiButtonIcon` (copy) beside the endpoint URL                    | Copies the Elasticsearch or MCP URL.                   |
| `vectordbOnboarding-pathSelection-connectionType-openPopover`       | `EuiButtonEmpty` connection-type dropdown trigger                 | Toggles the connection-type menu.                      |
| `vectordbOnboarding-pathSelection-connectionType-elasticsearch`     | `EuiContextMenuItem` "Elasticsearch"                              | Switches the endpoint to the Elasticsearch URL.        |
| `vectordbOnboarding-pathSelection-connectionType-mcpServer`         | `EuiContextMenuItem` "Agent Builder MCP"                          | Switches the endpoint to the MCP server URL.           |
| `vectordbOnboarding-pathSelection-copyApiKey`                       | `EuiSplitButton.ActionPrimary` "Copy your API key" (key exists)   | Copies the API key.                                    |
| `vectordbOnboarding-pathSelection-generateApiKey`                   | `EuiSplitButton.ActionPrimary` "Generate API key" (no key yet)    | Opens the connection-details flyout, API keys tab.     |
| `vectordbOnboarding-pathSelection-apiKeys-openPopover`              | `EuiSplitButton.ActionSecondary` (chevron)                        | Toggles the API key options menu.                      |
| `vectordbOnboarding-pathSelection-manageApiKeys-popoverItem`        | `EuiContextMenuItem` "Manage API keys"                            | Navigates to `management/security/api_keys`.          |
| `vectordbOnboarding-pathSelection-connectionDetails-popoverItem`    | `EuiContextMenuItem` "Connection details"                         | Opens the connection-details flyout, endpoints tab.    |

## Onboarding: wizard steps

The Ingest and Search steps share a templated prefix built by `getWizardTelemetryPrefix(path, step)` in `packages/kbn-vectordb-onboarding/src/onboarding/utils/wizard_telemetry_prefix.ts`:

```
vectordbOnboarding-<pathKey>-<step>-<element>
```

| Segment   | Values                                                                    |
| --------- | ------------------------------------------------------------------------- |
| `pathKey` | `generateVectors` (for the `generate-vectors` path), `haveVectors` (for `have-vectors`) |
| `step`    | `ingest`, `search`                                                        |

The path is mapped to camelCase because the raw route values contain hyphens, which collide with the segment separator. The mapping matches the path-selection IDs above.

### Step chrome

| Telemetry ID suffix     | Attached to                                | Description                                        | Source            |
| ----------------------- | ------------------------------------------ | -------------------------------------------------- | ----------------- |
| `backBtn`               | `EuiButtonEmpty` "Back"                    | Returns to path selection.                         | `step_layout.tsx` |
| `connectionDetailsBtn`  | `EuiButton` "Connection details" (header)  | Opens the connection-details flyout, API keys tab. | `step_layout.tsx` |
| `continueToSearch`      | `EuiButton` "Continue" (step rail)         | Advances to the Search step. Ingest step only.     | `step_rail.tsx`   |
| `completeSetup`         | `EuiButton` "Complete setup" (step rail)   | Completes onboarding. Search step only.            | `step_rail.tsx`   |

### API snippet panel

| Telemetry ID suffix         | Attached to                                    | Description                                              | Source                     |
| --------------------------- | ---------------------------------------------- | -------------------------------------------------------- | -------------------------- |
| `openLanguagePicker`        | `EuiButtonEmpty` language dropdown trigger     | Toggles the language menu.                               | `api_step.tsx`             |
| `selectLanguage-<lang>`     | `EuiContextMenuItem` per language              | Switches the snippet language. See values below.         | `api_step.tsx`             |
| `selectTab-<tab>`           | `EuiTab` per snippet example                   | Switches the snippet example. Only when a step has more than one tab. | `api_step.tsx`  |
| `copyCode`                  | `EuiButton` "Copy"                             | Copies the rendered snippet.                             | `api_step.tsx`             |
| `runInConsole`              | `TryInConsoleButton` (via `telemetryId` prop)  | Opens the request in Console.                            | `api_step.tsx`             |
| `pill-<pillId>`             | `EuiBadge` info pill                           | Toggles the pill's info popover.                         | `onboarding_pills.tsx`     |
| `docsPanelLink-<docId>`     | `EuiLink` in the documentation panel           | Opens the linked documentation.                          | `onboarding_doc_panel.tsx` |

`<lang>` is one of `python`, `javascript`, `java`, `go`, `rust`, `csharp`, `ruby`.

Per-step values for `<tab>`, `<pillId>`, and `<docId>` come from `onboarding_data.tsx`:

| Path / step                 | Tabs                  | Pills                                                          | Docs                                           |
| --------------------------- | --------------------- | -------------------------------------------------------------- | ---------------------------------------------- |
| `generateVectors` / `ingest` | `ingest` (single, no tab IDs emitted) | `freeTrialEmbeddings` (trial only), `jinaModels`, `semanticTextField` | `setUpSemanticText`, `ingestForSearch` |
| `generateVectors` / `search` | `semantic`, `hybrid` | `semanticSearch`, `hybridSearch`                               | `searchSemanticText`, `hybridSearchSemanticText` |
| `haveVectors` / `ingest`     | `ingest` (single, no tab IDs emitted) | `storageOptimization`, `generateWithJina`         | `denseVectorSearch`, `bringYourOwnDenseVectors` |
| `haveVectors` / `search`     | `knn`, `hybrid`      | `knnSearch`, `whyKnn`                                          | `knnSearchElasticsearch`                       |

Example: the Copy button on the Ingest step of the generate-vectors path emits `vectordbOnboarding-generateVectors-ingest-copyCode`.

## Changes

### Wizard prefix unified (September 2026)

The wizard components previously disagreed on segment order: `step_layout.tsx` built `vectordbOnboarding-<path>-<step>` while `step_rail.tsx` and `api_step.tsx` built `vectordbOnboarding-<step>-<path>`, and all three used the raw hyphenated route value for `<path>`. All three now use `getWizardTelemetryPrefix(path, step)` and emit `vectordbOnboarding-<pathKey>-<step>-<element>` as documented above.

Every wizard ID changed as a result; the previous IDs are no longer emitted. Home page and path selection IDs are unchanged.
