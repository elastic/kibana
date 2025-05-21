---
title: "KNOTWEED Assessment Summary"
slug: "knotweed-assessment-summary"
date: "2022-11-30"
description: "KNOTWEED deploys the Subzero spyware through the use of 0-day exploits for Adobe Reader and the Windows operating system. Once initial access is gained, it uses different sections of Subzero to maintain persistence and perform actions on the host."
author:
  - slug: andrew-pease
image: "blog-thumb-blind-spots.png"
category:
  - slug: security-research
  - slug: vulnerability-updates
---

## Key Takeaways

- KNOTWEED is an activity group sponsored by the PSOA entity DSIRF

- KNOTWEED uses 0-day exploits to load custom malware and frameworks onto victim systems

- Elastic Endpoint Security prevents the execution chain of the VBA from infecting the host with spyware associated with KNOTWEED

## Summary

On July 27, 2022, Microsoft Threat Intelligence Center (MSTIC) [disclosed](https://www.microsoft.com/security/blog/2022/07/27/untangling-knotweed-european-private-sector-offensive-actor-using-0-day-exploits/) a private-sector offensive actor (PSOA) that is using 0-day exploits in targeted attacks against European and Central American victims. MSTIC and others are tracking this activity group as KNOTWEED.

PSOAs sell hacking tools, malware, exploits, and services. KNOTWEED is produced by the PSOA named [DSIRF](https://web.archive.org/web/20220713203741/https:/dsirf.eu/about/). DSIRF has been linked to the sale of a malicious toolset (among others) called Subzero which has been observed being deployed through the use of 0-day exploits targeting Adobe and the Windows operating system.

MSTIC has observed victims in the legal, financial, and NGO verticals in Europe and Latin America.

## Assessment

### Risk

KNOTWEED deploys the Subzero spyware through the use of 0-day exploits for Adobe Reader and the Windows operating system. Once initial access is gained, KNOTWEED uses different sections of Subzero to maintain persistence (Jumplump) and to perform actions on the infected host (Corelump).

Successful execution of the Subzero spyware allows for the clandestine collection of sensitive information such as credential pairs, system locations, internal reconnaissance, and other remote access capabilities common among spyware.

### Impact

PSOAs are commonly used by activity groups as a way to “leapfrog” capabilities in exploiting and attacking well-defended targets. These activity groups include national intelligence and law enforcement organizations performing sanctioned operations, as well as oppressive governments as a way to collect information on journalists, political dissidents, and activists.

Successful execution of the Subzero spyware payload could put targets in danger of physical harm or persecution from non-law enforcement organizations.

### Countermeasures

**Elastic Protections**  
Attempts to use a Visual Basic for Applications (VBA) script for initial execution generates a **Memory Threat Prevention Alert: Shellcode Injection** event. This would stop the execution chain from proceeding and prevent the Subzero spyware from infecting the host.

![](/assets/images/knotweed-assessment-summary/1.png)

![](/assets/images/knotweed-assessment-summary/2.png)

As of this writing, 4 of the indicators provided by MSTIC were detected by the Elastic malware scoring model as being malicious. The 4 files are used for initial execution (the VBA), credential theft (PassLib), a modular hacking tool (Mex), and the main malware (Corelump). Indicators that were undetected were variations of the persistence loader (Jumplump).

While the persistence loader is not detected as malicious, the initial execution prevention of the VBA stops the malware from getting to the persistence phase of the infection.

All files have been tagged as malicious and will be reflected in the next malware model.

**Elastic Detections**

The following existing public Detection Rules would have identified the main persistence method used by the JumpLump malware and other post-exploitation techniques :

- [Modification of WDigest Security Provider](https://github.com/elastic/detection-rules/blob/main/rules/windows/credential_access_mod_wdigest_security_provider.toml)
- [Potential Credential Access via Windows Utilities](https://github.com/elastic/detection-rules/blob/main/rules/windows/credential_access_cmdline_dump_tool.toml)
- [Component Object Model Hijacking](https://github.com/elastic/detection-rules/blob/main/rules/windows/persistence_suspicious_com_hijack_registry.toml)

![](/assets/images/knotweed-assessment-summary/3.png)

**Hunting Queries**

The following EQL queries can be used to hunt for additional behaviors related to JumpLump:

_Abnormally large JPEG dropped by Jumplump:_

```
file where event.action != "deletion" and
process.executable : "?:\\Windows\\System32\\*.exe" and
file.path : "?:\\Users\\*\\AppData\\Local\\Temp\\*.jpg" and file.name regex """[0-9]{17}\.jpg""" and file.size >= 1000000
```

![](/assets/images/knotweed-assessment-summary/4.png)

_Image load or PE file creation in the print spooler color directory:_

```
any where event.category in ("file", "library") and (file.path : "?:\\Windows\\system32\\spool\\drivers\\color\\*.dll" or dll.path : "?:\\Windows\\system32\\spool\\drivers\\color\\*.dll")
```

![](/assets/images/knotweed-assessment-summary/5.png)

**Observations**

While there have been no customer observations in Elastic telemetry, this is not unexpected as this activity group has been observed targeting particular victims and the attack pattern or intrusion set appears to be very niche and not widespread. Elastic Security will continue to observe the threat actor and update our readers accordingly.

## Terminology

- **0-day exploit** - vulnerability previously unknown to defenders and does not have a public patch
- **Activity Group** - individuals, groups, or organizations believed to be operating with malicious intent
- **Attack Pattern** - describe ways that adversaries attempt to compromise targets
- **Intrusion Set** - adversarial behaviors and resources with common properties that are believed to be orchestrated by a single organization

## References

- https://www.microsoft.com/security/blog/2022/07/27/untangling-knotweed-european-private-sector-offensive-actor-using-0-day-exploits/
