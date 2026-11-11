# Capturing before/after screenshots (Nightshift)

Use a scratch Scout spec that is never committed. It reproduces the state from the user's screenshot, takes a screenshot, and measures the thing that is wrong.

## Setup

1. Start the stack once and reuse it between "before" and "after":
   `node scripts/scout start-server --arch stateful --domain classic`. Run it in the background and wait until `curl -u elastic:changeme http://localhost:<kibana port>/api/status` reports `available`. The port is in `.scout/servers/local.json`. Kibana runs in dev mode, so a code change shows up after a short rebuild. The first start downloads an Elasticsearch snapshot and builds the browser bundle, which takes several minutes.
2. Put the scratch spec in `x-pack/solutions/observability/plugins/nightshift/test/scout/ui/tests/papercut_scratch.spec.ts`, next to `nightshift.spec.ts`. It then uses the plugin's fixtures and Playwright config. Delete it when done.
3. Write screenshots to a temp directory outside the repo, for example `$(mktemp -d)`, and pass the path in an environment variable.

## Spec

This is the spec that was run for the Detections overview papercut. Change the mocks, route, test subjects and viewport to match the screenshot you are reproducing. The scratch spec is never committed or linted.

```ts
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { NIGHTSHIFT_ENABLED_FLAG } from '@kbn/nightshift-shared';
import { mockNightshiftSetUp, test } from '../fixtures';

const outDir = process.env.PAPERCUT_OUT_DIR ?? '';
const label = process.env.PAPERCUT_LABEL ?? 'before'; // 'before' or 'after'
const width = 1100;

test.describe('papercut scratch', { tag: [...tags.stateful.classic] }, () => {
  test.beforeAll(async ({ apiServices }) => {
    await apiServices.core.settings({
      'feature_flags.overrides': { [NIGHTSHIFT_ENABLED_FLAG]: true },
    });
  });

  test(`capture ${label}`, async ({ page, browserAuth }) => {
    // Reports the space as set up, so the app renders instead of the "Enable Elastic Nightshift" step.
    await mockNightshiftSetUp(page);
    // Mock the data the screenshot shows. Find the endpoint in the hook that feeds the component
    // (for the overview: public/data/detection_overview/use_detection_overview.ts).
    await page.route('**/internal/significant_events/detection/_overview*', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          knowledge_indicators: 618,
          entities: 114,
          active_rules: 169,
          detections: 87,
          significant_events: 52,
        },
      });
    });
    await browserAuth.loginAsAdmin();
    await page.setViewportSize({ width, height: 800 });
    await page.gotoApp('nightshift/detections');

    const overview = page.getByTestId('nightshiftDetectionOverview');
    await expect(overview).toBeVisible({ timeout: 60_000 });
    const first = page.getByTestId('nightshiftDetectionOverviewKnowledgeIndicators');
    const last = page.getByTestId('nightshiftDetectionOverviewSignificantEvents');
    await expect(last).toBeVisible();

    // Measure what is wrong so the PR can quote numbers.
    const firstBox = await first.boundingBox();
    const lastBox = await last.boundingBox();
    console.log(
      `PAPERCUT_MEASURE ${JSON.stringify({
        label,
        width,
        firstX: firstBox?.x,
        firstY: firstBox?.y,
        lastX: lastBox?.x,
        lastY: lastBox?.y,
      })}`
    );

    await overview.screenshot({ path: `${outDir}/${label}-overview-${width}.png` });
  });
});
```

Nightshift specifics:

- **Feature flag.** The app is gated behind `nightshift.enabled`. The `beforeAll` above sets it through `/internal/core/_settings`, which only exists on local stacks. That is fine for this skill, because it only runs locally.
- **Developer mode.** The Signals tab is hidden unless the `OBSERVABILITY_NIGHTSHIFT_DEVELOPER_MODE` setting (`@kbn/management-settings-ids`) is on. To capture it, add `await kbnClient.uiSettings.update({ [OBSERVABILITY_NIGHTSHIFT_DEVELOPER_MODE]: true })` before navigating, and unset it in an `afterAll` as `nightshift.spec.ts` does.
- **Routes and test subjects.** Navigate with `page.gotoApp('nightshift/<path>')`. The routes are defined in `public/nightshift_page.tsx`; find test subjects by searching `public/` for `data-test-subj`, and see `nightshift.spec.ts` for working examples.
- **Mocks.** Mock every request the screenshot depends on with `page.route`, and use made-up numbers and names. Never point the capture at real data.

## Running it

Run it against the stack you already started with Playwright directly:

```bash
PAPERCUT_OUT_DIR="$TMP" PAPERCUT_LABEL=before \
  node scripts/playwright test \
  --config x-pack/solutions/observability/plugins/nightshift/test/scout/ui/playwright.config.ts \
  --project=local papercut_scratch
# apply the fix, wait about 20 seconds for the dev rebuild, then
PAPERCUT_OUT_DIR="$TMP" PAPERCUT_LABEL=after \
  node scripts/playwright test \
  --config x-pack/solutions/observability/plugins/nightshift/test/scout/ui/playwright.config.ts \
  --project=local papercut_scratch
```

- Write `--project=local` with an equals sign. `--project local <file>` makes Playwright read the file as a second project name.
- Do **not** call `node scripts/scout run-tests` while the server is running. It starts its own Elasticsearch and Kibana on the same data directory and damages the running stack (shard path errors, Kibana "degraded"). If that happens, stop both and restart `start-server`.
- The `PAPERCUT_MEASURE` line is in the Playwright output. Grep for it.

## Guidance

- Match the viewport to the user's screenshot. If it is unknown, capture 1100px and 1472px wide; layout papercuts usually show up at one breakpoint.
- Capture only what a reviewer needs: the broken area, not a full page, unless context matters. A second full-page shot is fine when the fix could affect the surrounding layout.
- If the problem cannot be reproduced on current `main`, stop. Tell the user, because it may already be fixed.
- To show a layout change in numbers, log `boundingBox()` of the first and last item and also compare their `y` values. A fix that aligns the columns can change the row spacing too, and that belongs in the PR's design-change line.
