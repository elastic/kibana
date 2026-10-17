# tp-chains corpus

- **Sources:** 3 Elastic Security Labs Threat Command emulation/analysis writeups:
  - MIMICRAT — https://www.elastic.co/security-labs/threat-command/mimicrat-custom-rat-mimics-c2-frameworks
  - RONINGLOADER — https://www.elastic.co/security-labs/threat-command/roningloader
  - KREMLIN — https://www.elastic.co/security-labs/threat-command/malicious-browser-extension-kremlin-banking-malware
- **Cases:** 3 (one per chain). `label=true_positive`, `label_provenance=replay`.
- Each case renders the writeup's documented multi-stage chain as an ECS-shaped
  event sequence (process tree, network, dns, file). `payload.documented_stages`
  lists the writeup stages; `payload.events` are grouped per stage; each event
  group's `gold_rationale` maps the group to the documented stage it evidences.

## Honesty rules

- Only facts documented in the writeups are rendered: named domains
  (xMRi.network / 45.13.212.250, d15mawx0xveem1.cloudfront.net, qaqkongtiao[.]com,
  connection[.]upgradeonline.site, granderevolucao[.]store, ia601808.us.archive.org),
  binaries/paths (tp.png, Snieoatwtregoable.dll, zbuild.exe, goldendays.dll,
  trustinstaller.bin, Enpug.bin, 6uf9i.exe, ollama.sys, C:\ProgramData\Roning,
  ComprovanteSafra_03-08-2026.js, MicrosoftNodeRuntimeUpdater task,
  SentinelMemoryScanner.exe), and documented stage behaviors.
- Where the writeup lacks detail (exact IPs for some CDN fronts, exact command
  lines, host names, timings), placeholder-but-plausible renderer values are used
  and flagged; nothing contradictory to the writeup is invented. Structural
  omissions (e.g. RONINGLOADER's full stage-3 loader sequence and KREMLIN's
  browser-extension stage are only partially rendered) are noted per case in
  `payload.omissions` / `gold_rationale`.
- No gold label is derived from any model output.

## Hosts/users are synthetic renderer values

Host names (WS-FIN-214, WS-ENG-077, WS-FIN-118) and user names are invented
rendering context, not writeup facts — they exist only so ECS event sequences are
well-formed. All detection-relevant attributes come from the writeups.
