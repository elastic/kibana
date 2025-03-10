---
title: "Thawing the permafrost of ICEDID Summary"
slug: "thawing-the-permafrost-of-icedid-summary"
date: "2023-03-21"
subtitle: "Elastic Security Labs details a recent ICEDID GZip variant"
description: "Elastic Security Labs analyzed a recent ICEDID variant consisting of a loader and bot payload. By providing this research to the community end-to-end, we hope to raise awareness of the ICEDID execution chain, capabilities, and design."
author:
  - slug: cyril-francois
  - slug: daniel-stepanic
image: "blog-thumb-tree-icicles.jpg"
category:
  - slug: malware-analysis
tags:
  - malware analysis
  - icedid
---

ICEDID is a malware family first [described](https://securityintelligence.com/new-banking-trojan-icedid-discovered-by-ibm-x-force-research/) in 2017 by IBM X-force researchers and is associated with the theft of login credentials, banking information, and other personal information. ICEDID has always been a prevalent family, but has achieved even more growth since EMOTET’s temporary [disruption](https://www.justice.gov/opa/pr/emotet-botnet-disrupted-international-cyber-operation) in early 2021. ICEDID has been linked to the distribution of other distinct malware families including [DarkVNC](https://malpedia.caad.fkie.fraunhofer.de/details/win.darkvnc) and [COBALT STRIKE](https://www.cybereason.com/blog/threat-analysis-report-all-paths-lead-to-cobalt-strike-icedid-emotet-and-qbot). Regular industry reporting, including research publications like this one, help mitigate this threat.

Elastic Security Labs analyzed a recent ICEDID variant consisting of a loader and bot payload. By providing this research to the community end-to-end, we hope to raise awareness of the ICEDID execution chain, highlight its capabilities, and deliver insights about how it is designed.

### Execution Chain

ICEDID employs multiple stages before establishing persistence via a scheduled task and may retrieve components from C2 dynamically. The following diagram illustrates major phases of the ICEDID execution chain.

![ICEDID attack chain](/assets/images/thawing-the-permafrost-of-icedid-summary/image1.jpg)

### Research Paper Overview

Elastic Security Labs described the full execution chain of a recent ICEDID sample in a detailed research [paper](https://www.elastic.co/pdf/elastic-security-labs-thawing-the-permafrost-of-icedid.pdf) hosted at Elastic Security Labs. In addition, we provide a comprehensive analysis of this malware sample and capabilities, including: - Virtualization detection and anti-analysis - C2 polling operations - Shellcode execution methods - Credential access mechanisms - Websocket connections - Installing a web browser proxy to capture all user traffic - Reverse shell and VNC server installation - Certificate pinning - Data validation - ICEDID observable TTPs - Links to useful resources from Elastic

### Detections and preventions

#### Detection logic

- [Enumeration of Administrator Accounts](https://www.elastic.co/guide/en/security/current/enumeration-of-administrator-accounts.html)
- [Command Shell Activity Started via RunDLL32](https://www.elastic.co/guide/en/security/current/command-shell-activity-started-via-rundll32.html)
- [Security Software Discovery using WMIC](https://www.elastic.co/guide/en/security/current/security-software-discovery-using-wmic.html)
- [Suspicious Execution from a Mounted Device](https://www.elastic.co/guide/en/security/current/suspicious-execution-from-a-mounted-device.html)
- [Windows Network Enumeration](https://www.elastic.co/guide/en/security/current/windows-network-enumeration.html)
- [Unusual DLL Extension Loaded by Rundll32 or Regsvr32](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/defense_evasion_unusual_dll_extension_loaded_by_rundll32_or_regsvr32.toml)
- [Suspicious Windows Script Interpreter Child Process](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/execution_suspicious_windows_script_interpreter_child_process.toml)
- [RunDLL32 with Unusual Arguments](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/defense_evasion_rundll32_with_unusual_arguments.toml)

#### Preventions (source: [https://github.com/elastic/protections-artifacts/](https://github.com/elastic/protections-artifacts/))

- Malicious Behavior Detection Alert: Command Shell Activity
- Memory Threat Detection Alert: Shellcode Injection
- Malicious Behavior Detection Alert: Unusual DLL Extension Loaded by Rundll32 or Regsvr32
- Malicious Behavior Detection Alert: Suspicious Windows Script Interpreter Child Process
- Malicious Behavior Detection Alert: RunDLL32 with Unusual Arguments
- Malicious Behavior Detection Alert: Windows Script Execution from Archive File

#### YARA

Elastic Security has created multiple YARA rules related to the different stages/components within ICEDID infection, these can be found in the signature linked below: - [Windows.Trojan.ICEDID](https://github.com/elastic/protections-artifacts/blob/main/yara/rules/Windows_Trojan_IcedID.yar)

---

Elastic Security Labs is a team of dedicated researchers and security engineers focused on disrupting adversaries though the publication of detailed detection logic, protections, and applied threat research.

Follow us on @elasticseclabs or visit our research portal for more resources and research.
