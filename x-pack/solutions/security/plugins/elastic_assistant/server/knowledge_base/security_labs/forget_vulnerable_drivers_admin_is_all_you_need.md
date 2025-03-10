---
title: "Forget vulnerable drivers - Admin is all you need"
slug: "forget-vulnerable-drivers-admin-is-all-you-need"
date: "2023-08-25"
description: "Bring Your Own Vulnerable Driver (BYOVD) is an increasingly popular attacker technique whereby a threat actor brings a known-vulnerable signed driver alongside their malware, loads it into the kernel, then exploits it to perform some action within the kernel that they would not otherwise be able to do. Employed by advanced threat actors for over a decade, BYOVD is becoming increasingly common in ransomware and commodity malware."
author:
  - slug: gabriel-landau
image: "photo-edited-09@2x.jpg"
category:
  - slug: perspectives
---

## Introduction
Bring Your Own Vulnerable Driver (BYOVD) is an increasingly popular attacker technique wherein a threat actor brings a known-vulnerable signed driver alongside their malware, loads it into the kernel, then exploits it to perform some action within the kernel that they would not otherwise be able to do. After achieving kernel access, they may tamper with or disable security software, dump otherwise inaccessible credentials, or modify operating system behavior to hide their presence. [Joe Desimone](https://twitter.com/dez_) and I covered this in-depth, among other [kernel mode threats](https://i.blackhat.com/us-18/Thu-August-9/us-18-Desimone-Kernel-Mode-Threats-and-Practical-Defenses.pdf), at Black Hat USA 2018. Employed by advanced threat actors for over a decade, BYOVD is becoming increasingly common in ransomware and commodity malware.

[Driver Signing Enforcement](https://learn.microsoft.com/en-us/windows-hardware/drivers/install/kernel-mode-code-signing-policy--windows-vista-and-later-) (DSE), first deployed in 2007 by Windows Vista x64, was the first time that Microsoft attempted to limit the power of admins. With DSE in place, admins could no longer instantly load any code into the kernel. Admin restrictions grew over time with the rollout of [Boot Guard](https://www.intel.com/content/dam/www/central-libraries/us/en/documents/below-the-os-security-white-paper.pdf), [Secure Boot](https://learn.microsoft.com/en-us/windows-hardware/design/device-experiences/oem-secure-boot), and [Trusted Boot](https://learn.microsoft.com/en-us/windows/security/operating-system-security/system-security/trusted-boot) to protect the boot chain from admin malware, which could previously install their own boot loaders / bootkits.

Further limiting admins' power, Microsoft recently deployed the [Vulnerable Driver Blocklist](https://learn.microsoft.com/en-us/windows/security/threat-protection/windows-defender-application-control/microsoft-recommended-driver-block-rules#microsoft-vulnerable-driver-blocklist) by default, starting in Windows 11 22H2. This is a move in the right direction, making Windows 11 more secure by default. Unfortunately, the blocklist's deployment model can be slow to adapt to new threats, with updates automatically deployed typically only once or twice a year. Users can manually update their blocklists, but such interventions bring us out of “secure by default” territory.

## Security boundaries
When determining which vulnerabilities to fix, the Microsoft Security Response Center ([MSRC](https://msrc.microsoft.com/)) uses the concept of a security boundary, which it [defines](https://web.archive.org/web/20230506125554/https://www.microsoft.com/en-us/msrc/windows-security-servicing-criteria) as follows:

> A security boundary provides a logical separation between the code and data of security domains with different levels of trust. For example, the separation between kernel mode and user mode is a classic and straightforward security boundary.

Based on this definition, one might be inclined to think that malware running in user mode should not be able to modify kernel memory. The boundary is “straightforward” after all. Logically, any violation of that boundary should be met with a remedial action such as a patch or blocklist update.

Unfortunately, the situation gets murkier from here. That document later states that administrator-to-kernel is not a security boundary, with the following explanation:

> Administrative processes and users are considered part of the Trusted Computing Base (TCB) for Windows and are therefore not strong [sic] isolated from the kernel boundary. 

At this point, we have two seemingly conflicting viewpoints. On one hand, MSRC states that admin-to-kernel is an indefensible boundary and not worth fixing. On the other hand, Microsoft is attempting to defend this boundary with mechanisms such as Driver Signing Enforcement, Secure Boot, and the Vulnerable Driver Blocklist. Because the defense is incomplete, MSRC instead calls them “defense-in-depth security features.”

MSRC similarly does not consider admin-to-[PPL](https://www.elastic.co/blog/protecting-windows-protected-processes) a security boundary, instead classifying it as a defense-in-depth security feature. More on this in the next section.

The rest of this article will refer to MSRC and Microsoft separately. While MSRC is part of Microsoft, Microsoft is a much larger entity than MSRC; they shouldn't be equated.

## Exploiting vulnerabilities
In September 2022, I filed VULN-074311 with MSRC, notifying them of two [zero-day](https://www.trendmicro.com/vinfo/us/security/definition/zero-day-vulnerability) vulnerabilities in Windows: one admin-to-PPL and one PPL-to-kernel. I provided source code for both exploits. The response concisely indicated that they understood the vulnerabilities and declined to take any further action, as stated below:

> The research describes a multi-step attack that leverages a PPL bypass to gain kernel code execution. Note that all of the proposed attacks do require administrative privileges to perform and thus the reported issue does not meet our bar for immediate servicing. We do not expect any further action and will proceed with closing out the case.

In this parlance, “servicing” means “patching.” Their response is consistent with the aforementioned policy and their [historical treatment](https://github.com/ionescu007/r0ak/tree/919338f4e88036c6a46a3a839f409efe38852415#faq) of the admin-to-kernel boundary. Their behavior is consistent too - it's been over 11 months and they still haven't patched either vulnerability. I find it fascinating that Microsoft is willing to block drivers that can modify kernel memory but MSRC is unwilling to service vulnerabilities that can do the same.

When I announced my Black Hat Asia 2023 talk, [PPLdump Is Dead. Long Live PPLdump](https://www.blackhat.com/asia-23/briefings/schedule/#ppldump-is-dead-long-live-ppldump-31052), on Twitter five months after the MSRC report, the Windows Defender team quickly reached out to learn more. It seems that MSRC closed the case without telling the Defender team, whose products rely on PPL to protect [hundreds of millions of Windows machines](https://www.ghacks.net/2019/08/03/windows-defender-has-a-market-share-of-50/), about a PPL bypass. This type of miscommunication mustn't be allowed to continue.

## Turnkey tooling
[EDRSandBlast](https://github.com/wavestone-cdt/EDRSandblast) is a tool that weaponizes vulnerable drivers to bypass AV & EDR software. It can modify kernel memory to remove hooks installed by AV & EDR, temporarily or permanently blinding them to malicious activity on the system.

As I discussed in my Black Hat Asia talk, MSRC has de-facto shown that they are unwilling to service admin-to-PPL and admin-to-kernel vulnerabilities and that it requires the existence of [turnkey tooling](https://twitter.com/tiraniddo/status/1551966781761146880?s=20) on GitHub to motivate Microsoft to action. This led me to release the admin-to-PPL exploit [PPLFault](https://github.com/gabriellandau/PPLFault) and admin-to-kernel exploit chain [GodFault](https://github.com/gabriellandau/PPLFault#godfault) as easy-to-use tools on GitHub. For brevity, below we'll call them “PPL vulnerability” and “kernel vulnerability”, respectively.

In this same “turnkey tooling” spirit, to highlight the inconsistency of blocking known-vulnerable drivers while simultaneously refusing to patch admin-to-kernel exploit chains, I am [releasing](https://github.com/gabriellandau/EDRSandblast-GodFault) a version of EDRSandBlast that integrates PPLFault to demonstrate the same result, sans vulnerable drivers. You can see it [here](https://gist.github.com/gabriellandau/418cde5d194a5e7adff641f2164cd1d7#file-edrsandblast-godfault-txt-L21-L27) disabling the Windows Defender driver. My goal in releasing this is to motivate MSRC to treat both PPL and kernel vulnerabilities with greater urgency.

## Mitigation
I released a small kernel driver alongside PPLFault and GodFault called [NoFault](https://github.com/gabriellandau/PPLFault/tree/7d5543eb6f9e4fd8d8380cbf358dab2f159703af/NoFault) which breaks the PPL exploit. Until Windows is fixed, anti-malware vendors can employ this code to mitigate the PPL vulnerability. We've incorporated NoFault's protection into the latest version of Elastic Endpoint/Defend - please update to 8.9.0+ if you haven't already. One comprehensive fix could be to have the memory manager enforce page hashes for all executable images loaded into PPL, a feature [already employed](https://twitter.com/DavidLinsley11/status/1190810926762450944?s=20) for full Protected Processes.

GodFault is not the first tool to exploit the kernel vulnerability. [ANGRYORCHARD](https://github.com/realoriginal/angryorchard) first used it with the now-patched [KnownDLLs PPL vulnerability](https://googleprojectzero.blogspot.com/2018/08/windows-exploitation-tricks-exploiting.html). The PPL vulnerability has since been fixed, but the kernel one was not.  I was able to easily reuse the kernel vulnerability in GodFault - it's only a [few lines of code](https://github.com/gabriellandau/PPLFault/blob/da270ab29d4f02e8bd2dd525f1c85979ded3df58/GMShellcode/GMShellcode.c#L177-L192). If this is not patched, then any future PPL exploits will immediately be chainable to the kernel. Note that NoFault breaks the kernel exploit chain by preventing its requisite PPL code execution, but does not fix the kernel vulnerability itself.

## Discussion
Making EDRSandBlast driverless is just one example of the things you can do with such exploits. Admin-to-kernel exploits enable a whole menu of malware capabilities that are normally impossible from user mode, including:

 - Disable kernel mode telemetry including process, thread, object manager, filesystem, and registry callbacks. EDRSandBlast does some of these.
 - Disable kernel ETW loggers
 - Terminate and/or inject malware into [PPL anti-malware processes](https://learn.microsoft.com/en-us/windows/win32/services/protecting-anti-malware-services-)
 - Bypass LSA RunAsPPL to dump credentials or tamper with Credential Guard
 - Read/write the memory of shielded VM worker processes, which [run as PPL](https://learn.microsoft.com/en-us/windows-server/security/guarded-fabric-shielded-vm/guarded-fabric-and-shielded-vms#what-are-the-types-of-virtual-machines-that-a-guarded-fabric-can-run)
 - Run malware with greater privilege than anti-malware, such that it can't be scanned or terminated from user mode
 - Implement rootkit behavior such as hiding processes, files, and registry keys
 - Gain full read-write access to physical memory

Such kernel-driven capabilities, often enabled by BYOVD, are [regularly](https://www.bleepingcomputer.com/news/security/blackbyte-ransomware-abuses-legit-driver-to-disable-security-products/) [used](https://www.trendmicro.com/en_us/research/23/e/blackcat-ransomware-deploys-new-signed-kernel-driver.html) [by](https://www.welivesecurity.com/2022/01/11/signed-kernel-drivers-unguarded-gateway-windows-core/) [criminals](https://media.kasperskycontenthub.com/wp-content/uploads/sites/43/2018/03/09133534/The-Slingshot-APT_report_ENG_final.pdf) [to](https://www.bleepingcomputer.com/news/security/ransomware-gangs-abuse-process-explorer-driver-to-kill-security-software/) [defeat](https://thehackernews.com/2023/04/ransomware-hackers-using-aukill-tool-to.html) [and](https://cybernews.com/security/bring-your-own-vulnerable-driver-attack/) [degrade](https://www.techspot.com/news/95781-hackers-use-genshin-impact-anti-cheat-software-ransomware.html) [security](https://arstechnica.com/information-technology/2020/02/hackable-code-trusted-by-windows-lets-ransomware-burrow-deep-into-targeted-machines/) [products](https://www.sentinelone.com/labs/malvirt-net-virtualization-thrives-in-malvertising-attacks/), empowering them to hurt people and businesses. PPL and kernel vulnerabilities enable these same capabilities, so MSRC needs to service them proactively before threat actors abuse them, not after.

I don't want to understate the difficulty of the problem - defending the kernel against admins is hard and will require continual effort as new bypasses are found. It will not be solved, but rather a difficult and ongoing arms race. Fortunately, Microsoft recently adopted a new philosophy of “[no longer avoiding the hard things](https://youtu.be/8T6ClX-y2AE?t=244)” (timestamped link). Addressing these types of vulnerabilities is a “hard thing” affecting Windows security today that Microsoft can do something about while simultaneously moving towards their vision of an [Adminless future](https://www.bigtechwire.com/2023/04/20/microsoft-admin-less-support-is-coming-in-a-future-windows-release/). They're a large well-funded company filled with smart people, capable of addressing multiple issues at once.

## Conclusion
Microsoft created the Vulnerable Driver Blocklist to stop admins from tampering with the kernel, but they've done nothing about an admin-to-kernel exploit chain that was reported over 11 months ago. By [removing the vulnerable driver requirement from EDRSandBlast](https://github.com/gabriellandau/EDRSandblast-GodFault) via [GodFault](https://github.com/gabriellandau/PPLFault#godfault), I hope to prove that admin-to-kernel exploits can be just as dangerous as vulnerable drivers and that MSRC needs to take them seriously. Given Windows 11's [goal of default security](https://www.youtube.com/watch?v=8T6ClX-y2AE) and the fact that the Vulnerable Driver Blocklist is now enabled by default, MSRC needs to reconsider its policy of indifference towards PPL and kernel exploits.
