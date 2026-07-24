# Recording video evidence for a finding

Used from `phases/2-explore.md` → "Confirm before logging" step 2, for a Level 1 or Level 2 finding that has already reproduced.

**Requires:** the `browser_run_code_unsafe` tool and a working `ffmpeg` install (`which ffmpeg`). If either is missing, skip recording — do not install `ffmpeg` or otherwise change the environment without asking the user first; just note `- Video: unavailable (<reason>)` in the finding and move on.

## Why two contexts, not one

`recordVideo` only captures a page's own rendered pixels — it cannot draw extra content beside them. Embedding the real product in an iframe to get a true side-by-side (so an evidence overlay never has to sit on top of the product) does not work here: it gets blocked by third-party-cookie restrictions, which breaks login before it ever gets started. Overlaying a log panel directly on top of the product page also risks covering the exact UI it's supposed to be evidencing (e.g. a flyout that docks to the true right edge of the viewport).

The reliable approach: two separate browser contexts recorded at the same time, driven by one script —
- **Context K** — the real product, completely untouched, no injected DOM.
- **Context L** — a small synthetic HTML page you control, showing a live log.

Both run in real time from the same script, so their videos are naturally time-aligned. Playwright's own `page.on('response')` / `page.on('console')` listeners on Context K's page — not in-page JS injected into the product — populate Context L's log. This means the product page never gets modified, and the evidence is genuinely captured from the real requests/console output as they happen, not narrated after the fact.

## Template

Fill in the marked sections; everything else is boilerplate that stays the same across findings.

```js
async (page) => {
  const baseUrl = "<BASE_URL>";                       // e.g. https://<deployment>.kb.<region>.elastic-cloud.com
  const dir = ".exploratory-session/videos";
  // Add every endpoint whose calls/status are relevant evidence for this finding:
  const watchPattern = /anomaly_overview|check_privileges|<ADD_ENDPOINT_FRAGMENTS_HERE>/;

  const browser = page.context().browser();
  const kCtx = await browser.newContext({ recordVideo: { dir, size: { width: 950, height: 800 } }, viewport: { width: 950, height: 800 } });
  const lCtx = await browser.newContext({ recordVideo: { dir, size: { width: 480, height: 800 } }, viewport: { width: 480, height: 800 } });
  const kp = await kCtx.newPage();   // Kibana — untouched
  const lp = await lCtx.newPage();   // evidence log panel

  await lp.setContent(`<!DOCTYPE html><html><head><style>
    html,body{margin:0;height:100%;background:#0a0a0a;color:#7CFC00;font:13px/1.5 Menlo,monospace;}
    #hdr{background:#141414;color:#fff;padding:10px 12px;font-weight:600;border-bottom:1px solid #333;}
    #log{padding:10px 12px;white-space:pre-wrap;overflow:auto;height:calc(100% - 42px);box-sizing:border-box;}
    .err{color:#ff5f56;} .info{color:#7CFC00;} .label{color:#5fb3ff;font-weight:700;margin-top:8px;}
  </style></head><body><div id="hdr">API &amp; Console Evidence</div><div id="log"></div></body></html>`);
  await lp.evaluate(() => {
    window.__append = (line, cls) => {
      const log = document.getElementById('log');
      const row = document.createElement('div');
      if (cls) row.className = cls;
      row.textContent = line;
      log.appendChild(row);
      log.scrollTop = log.scrollHeight;
    };
  });
  const appendLog = async (line, cls) => { await lp.evaluate(({ line, cls }) => window.__append(line, cls), { line, cls }).catch(() => {}); };

  // Live capture from the REAL page — not injected into it.
  kp.on('response', async (res) => {
    try {
      const url = res.url();
      if (!watchPattern.test(url)) return;
      const short = url.replace(baseUrl, '');
      const status = res.status();
      const isErr = status >= 400;
      await appendLog(`${res.request().method()} ${short}\n  -> HTTP ${status}`, isErr ? 'err' : 'info');
      const text = await res.text().catch(() => null);
      if (text) await appendLog('   ' + text.slice(0, 220), isErr ? 'err' : 'info');
    } catch (e) {}
  });
  kp.on('console', (msg) => {
    if (msg.type() === 'error') appendLog('[console] ' + msg.text().slice(0, 250), 'err');
  });

  await appendLog('=== <FINDING_TITLE> ===', 'label');

  // --- Fill in: login as the role/user this finding requires ---
  await kp.goto(baseUrl + "/login");
  await kp.getByRole('button', { name: 'Log in with Elasticsearch' }).click();
  await kp.getByRole('textbox', { name: 'Username' }).fill("<USERNAME>");
  await kp.getByRole('textbox', { name: 'Password' }).fill("<PASSWORD>");
  await kp.getByRole('button', { name: 'Log in' }).click();
  await kp.waitForTimeout(2000);

  // --- Fill in: the exact repro steps for this finding, with an appendLog() narration
  //     before each meaningful action so a viewer can follow along. Use waitForTimeout
  //     (2000-3500ms) after each step so the recording holds long enough to read. ---
  await appendLog('<narration of what you are about to do>', 'label');
  // ... real kp.goto / kp.click / kp.evaluate(fetch...) actions ...
  await appendLog('<narration of the observed result>', 'err'); // 'err' renders red, 'info' green

  const kVideo = kp.video();
  const lVideo = lp.video();
  await kp.close();
  await lp.close();
  await kCtx.close();
  await lCtx.close();
  return JSON.stringify({ kPath: kVideo ? await kVideo.path() : null, lPath: lVideo ? await lVideo.path() : null });
}
```

Run this via `browser_run_code_unsafe`. It returns `{ kPath, lPath }` — two `.webm` files.

## Compositing

```bash
ffmpeg -y -i "<kPath>" -i "<lPath>" \
  -filter_complex "[0:v]scale=950:800[k];[1:v]scale=480:800[l];[k][l]hstack=inputs=2[v]" \
  -map "[v]" -c:v libx264 -crf 20 -preset veryfast -pix_fmt yuv420p \
  .exploratory-session/videos/findings-flow-<N>.mp4

rm "<kPath>" "<lPath>"   # delete the raw intermediates — keep only the composited .mp4
```

## Notes

- Triggering a bug's own API call directly via `kp.evaluate(() => fetch(...))` is appropriate when the finding's UI never calls the endpoint itself (e.g. the frontend pre-gates on a privileges check) — this is not "cheating," it mirrors how the finding was originally confirmed via direct API testing.
- When a finding needs a temporary resource (a Kibana space, a saved object) to demonstrate it, create it via the same `kp.evaluate(() => fetch(...))` pattern and delete it again before closing the contexts — narrate the cleanup step too (`appendLog('(temporary space deleted for cleanup)', 'info')`) so the recording shows the environment was left clean.
- Keep total recording length short (15-45s) — narrate the essential steps only, not every intermediate click.
