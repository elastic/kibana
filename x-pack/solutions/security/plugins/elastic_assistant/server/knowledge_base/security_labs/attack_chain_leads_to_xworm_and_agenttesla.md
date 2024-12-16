---
title: "Attack chain leads to XWORM and AGENTTESLA"
slug: "attack-chain-leads-to-xworm-and-agenttesla"
date: "2023-04-10"
description: "Our team has recently observed a new malware campaign that employs a well-developed process with multiple stages. The campaign is designed to trick unsuspecting users into clicking on the documents, which appear to be legitimate."
author:
  - slug: salim-bitam
image: "blog-thumb-coin-stacks.jpg"
category:
  - slug: attack-pattern
  - slug: malware-analysis
tags:
  - xworm
  - agenttesla
---

## Key Takeaways

- Threat actors are deploying known malware using their own custom .NET loaders
- The threat actors employ simple and well-known tactics such as bypassing AMSI through patching and a basic custom .NET loader
- The threat actors are abusing legitimate free file hosting services

## Preamble

Our team has recently observed a new malware campaign that employs a well-developed process with multiple stages. The campaign is designed to trick unsuspecting users into clicking on the documents, which appear to be legitimate, but are in fact fake, the adversary leverages weaponized word documents to execute malicious PowerShell scripts, and also utilizes a custom obfuscated .NET loader to load various malware strains, including XWORM and AGENTTESLA.

## RTF loader code analysis

### Overview

During a recent investigation, we discovered a malicious word document named `Card & Booking Details.docx`. This document has been designed with the intent to deceive the victim and includes two falsified scanned documents, namely a credit card and a passport.

Upon opening the document, an RTF object hosted at `www.mediafire[.]com/file/79jzbqigitjp2v2/p2.rtf` is fetched.

This RTF object contains a macro-enabled Excel object. When opened, this macro downloads an obfuscated powerShell script which in turn deploys different malware families.

At the time of this writing, we have observed two distinct malware families, namely XWORM and AGENTTESLA, have been deployed through this execution chain. Both malware families mentioned above are loaded into the compromised system's memory by the same custom .NET loader. Once loaded, the malicious payload can carry out a range of functions, such as stealing sensitive data and executing commands on the compromised system.

![Execution flow diagram](/assets/images/attack-chain-leads-to-xworm-and-agenttesla/image8.png)

In this research post, we will walk through the initial execution of the malware and detail the capabilities we discovered.

### Extracting the malicious VBA

The RTF document contains multiple embedded objects, including an interesting one that caught our attention: `Excel.SheetMacroEnabled`.

![Listing objects embedded in the RTF document](/assets/images/attack-chain-leads-to-xworm-and-agenttesla/image1.jpg)

We can use [`rtfdumpy.py`](https://github.com/DidierStevens/DidierStevensSuite/blob/master/rtfdump.py), a script developed by Didier Stevens to analyze RTF files, to dump the object and [`olevba.py`](https://www.decalage.info/python/olevba), a script developed by Philippe Lagadec, to extract any embedded VBA scripts from an [OLE](https://en.wikipedia.org/wiki/Object_Linking_and_Embedding) object. The extracted VBA script shown below downloads and executes a malicious powershell script from `https://www.mediafire[.]com/file/xnqxmqlcj51501d/7000m.txt/file`.

![Extracting the VBA script from the Excel sheet object](/assets/images/attack-chain-leads-to-xworm-and-agenttesla/image2.png)

### Powershell script analysis

The malicious PowerShell script is obfuscated using string substitution to evade detection and make analysis more difficult.

![Powershell script obfuscated using string substitution](/assets/images/attack-chain-leads-to-xworm-and-agenttesla/image13.png)

It contains additional powershell script blocks in hex format that will be deployed in the infected machine designed to prepare the environment by setting up persistence, bypassing AMSI, disabling Windows defender and creating a mechanism to update the malware. The ultimate objective is to install two .NET binaries, namely a loader and a payload (XWORM / AGENTTESLA).

### Deleting the malicious document

The malware starts by deleting the original Word document, first killing the process `Winword.exe` and then deleting all .DOCX files located in the default `Downloads` and `Desktop` folders of every user. This initial step shows the malware's destructive nature and how it can potentially harm the user's data.

![Powershell command to delete the malicious word document](/assets/images/attack-chain-leads-to-xworm-and-agenttesla/image5.jpg)

### Persistence

The malware creates a directory in the path `C:\ProgramData\MinMinons` , which is used to store other Powershell scripts and binaries. The currently running Powershell script is then copied to `C:\ProgramData\MinMinons\Candlegraphy.\_\_\_`.

Next, the malware deobfuscates the first embedded Powershell script which is used to create persistence. It first writes a JScript file that invokes the original Powershell script saved in `C:\ProgramData\MinMinons\Candlegraphy.\_\_\_` through the activeXObject shell, then a scheduled task named “MOperaChrome” is created to run the JScript file using the Microsoft signed [Windows Script Host (WSH) utility](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/wscript), `wscript.exe`.

![Persistence through task scheduling](/assets/images/attack-chain-leads-to-xworm-and-agenttesla/image10.jpg)

### AMSI bypass

The second embedded powershell script is responsible for bypassing AMSI by patching the `amsiInitFailed` flag. In doing so, the initialization of AMSI fails, leading to the prevention of any scan being initiated for the ongoing process. Furthermore, the PowerShell script proceeds to disable the Microsoft Windows Defender service.

![Disabling WinDefend service](/assets/images/attack-chain-leads-to-xworm-and-agenttesla/image5.jpg)

### User creation

The script creates a local administrator account named “System32” and adds it to the Remote Desktop Users group. This enables the attacker to log in via Remote Desktop Protocol (RDP). Next, the script disables the machine's firewall to allow inbound RDP connection attempts which aren’t filtered by edge controls.

![Creating a backdoor user](/assets/images/attack-chain-leads-to-xworm-and-agenttesla/image9.jpg)

### Malware update persistence

The third embedded script stores a secondary JScript file, whose purpose is downloading a revised or updated version of the malware. This file is saved to a predetermined location at `C:\ProgramData\MinMinons\miguan.js`. Furthermore, a scheduled task with the name (“miguaned”) is created to execute the JScript file through `wscript.exe` , similar to the previously described task.

The JScript creates an instance of `WScript.Shell` object by calling ActiveXObject with the following CLSID `{F935DC22-1CF0-11D0-ADB9-00C04FD58A0B}` which corresponds to Shell Object, then downloads from the URL `https://billielishhui.blogspot[.]com/atom.xml` the update powershell malware.

![JScript script used for updating the malware](/assets/images/attack-chain-leads-to-xworm-and-agenttesla/image4.jpg)

### .NET loader

The custom DOTNET loader employs the [P/INVOKE technique](https://learn.microsoft.com/en-us/dotnet/standard/native-interop/pinvoke) to call the native Windows API and inject a payload into a signed microsoft binary via [process hollowing](https://attack.mitre.org/techniques/T1055/012/).

The loader’s code employs various obfuscation techniques to hinder analysis, including the use of dead instruction, renamed symbols to make the code less readable and more confusion and encoded strings. Fortunately a tool like [de4dot](https://github.com/de4dot/de4dot) can be used to output a human-readable version of it.

![.NET loader code obfuscation](/assets/images/attack-chain-leads-to-xworm-and-agenttesla/image12.jpg)

The malware leverages the `LoadLibrary` and `GetProcAddress` APIs to access the required Windows APIs. To obscure the names of these APIs, the loader stores them in an encoded format within the binary file, utilizing a sequence of substitution and string reversal methods.

![.NET loader string obfuscation](/assets/images/attack-chain-leads-to-xworm-and-agenttesla/image3.jpg)

The loader then starts a process in a suspended state using `CreateProcessA` API. The following is the list of executables it uses as a host for it’s malicious code:

- `C:\Windows\Microsoft.NET\Framework\v4.0.30319\RegSvcs.exe`
- `C:\Windows\Microsoft.NET\Framework\v2.0.50727\RegSvcs.exe`
- `C:\Windows\Microsoft.NET\Framework\v3.5\Msbuild.exe`

These binaries are signed and trusted by the system and can evade detection by security software that relies on whitelisting system processes. It then uses `Zwunmapviewofsection` to unmap the memory of the target process, writes the payload to the suspended process and then resume the thread using `ResumeThread` API.

### Final payload

During our research we discovered that the threat actor has been deploying different payloads. Namely, we observed 2 families: XWORM and AGENTTESLA.

XWORM has gained notoriety in the underground criminal marketplace due to its ability to employ sophisticated capabilities like virtualization and sandbox detection, used to avoid detection and support persistence within an infected system.

Of particular concern is the fact that XWORM is readily available on the internet as a cracked version, with version 2.1 being especially prevalent. This highlights the dangers of underground cybercrime markets and the ease with which malicious actors can access and utilize powerful tools.

Two different versions of the XWORM family were observed versions 2.2 and 3.1. The following is the configuration of a XWORM sample in plain text.

![XWorm configuration](/assets/images/attack-chain-leads-to-xworm-and-agenttesla/image14.jpg)

AGENTTESLA is a trojan and credential stealer written in .NET. While it first emerged in 2014, it is now among the most active and malicious software. AGENTTESLA is affordably priced and includes support from the developers, making it easily accessible to cybercriminals with limited technical skills.

The sample we analyzed was heavily obfuscated, masqueraded as an AVG installer,and leverages discord for C2. It uploads stolen information to the attacker’s Discord channel via the following webhook: `https://discord[.]com/api/webhooks/1089956337733087274/uYNA_D8Ns1z9NZ3B1mGp0XXyGq-785KLGIfEAZsrz3TJd5fvOjXA927F7bUTTzbNT6Zk`.

![Agent Tesla masquerading as an AVG installer](/assets/images/attack-chain-leads-to-xworm-and-agenttesla/image6.jpg)

![The discord webhook extracted dynamically](/assets/images/attack-chain-leads-to-xworm-and-agenttesla/image7.png)

## Observed adversary tactics and techniques

Elastic uses the MITRE ATT&CK framework to document common tactics, techniques, and procedures that threats use.

## Tactics

Tactics represent the “why” of a technique or sub-technique. They represent the adversary’s tactical goals: the reason for performing an action.

- [Initial access](https://attack.mitre.org/tactics/TA0001)
- [Execution](https://attack.mitre.org/tactics/TA0002)
- [Persistence](https://attack.mitre.org/tactics/TA0003)
- [Command and control](https://attack.mitre.org/tactics/TA0011)
- [Defense evasion](https://attack.mitre.org/tactics/TA0005)

## Techniques/subtechniques

Techniques and Subtechniques represent how an adversary achieves a tactical goal by performing an action.

- [Process injection](https://attack.mitre.org/techniques/T1055/)
- [Indicator removal: File deletion](https://attack.mitre.org/techniques/T1070/004/)
- [Scheduled task/job: Scheduled task](https://attack.mitre.org/techniques/T1053/005/)
- [User Execution: Malicious File](https://attack.mitre.org/techniques/T1204/002/)
- [Phishing: Spearphishing Attachment](https://attack.mitre.org/techniques/T1566/001/)
- [Command and Scripting Interpreter: Powershell](https://attack.mitre.org/techniques/T1059/003/)
- [Obfuscated Files or Information](https://attack.mitre.org/techniques/T1027/)
- [Impair Defenses: Disable or Modify Tools](https://attack.mitre.org/techniques/T1629/003/)
- [Create Account](https://attack.mitre.org/techniques/T1136/)

## Detection logic

### YARA

Elastic Security has created YARA rules to identify this activity. Below are YARA rules to identify XWORM and [AGENTTESLA](https://github.com/elastic/protections-artifacts/blob/main/yara/rules/Windows_Trojan_AgentTesla.yar) malware families.

```
rule Windows_Trojan_Xworm_732e6c12 {
meta:
    author = "Elastic Security"
    id = "732e6c12-9ee0-4d04-a6e4-9eef874e2716"
    fingerprint = "afbef8e590105e16bbd87bd726f4a3391cd6a4489f7a4255ba78a3af761ad2f0"
    creation_date = "2023-04-03"
    last_modified = "2023-04-03"
    os = "Windows"
    arch = "x86"
    category_type = "Trojan"
    family = "Xworm"
    threat_name = "Windows.Trojan.Xworm"
    source = "Manual"
    maturity = "Diagnostic"
    reference_sample = "bf5ea8d5fd573abb86de0f27e64df194e7f9efbaadd5063dee8ff9c5c3baeaa2"
    scan_type = "File, Memory"
    severity = 100

strings:
    $str1 = "startsp" ascii wide fullword
    $str2 = "injRun" ascii wide fullword
    $str3 = "getinfo" ascii wide fullword
    $str4 = "Xinfo" ascii wide fullword
    $str5 = "openhide" ascii wide fullword
    $str6 = "WScript.Shell" ascii wide fullword
    $str7 = "hidefolderfile" ascii wide fullword
condition:
    all of them}

rule Windows_Trojan_AgentTesla_d3ac2b2f {
meta:
    author = "Elastic Security"
    id = "d3ac2b2f-14fc-4851-8a57-41032e386aeb"
    fingerprint = "cbbb56fe6cd7277ae9595a10e05e2ce535a4e6bf205810be0bbce3a883b6f8bc"
    creation_date = "2021-03-22"
    last_modified = "2022-06-20"
    os = "Windows"
    arch = "x86"
    category_type = "Trojan"
    family = "AgentTesla"
    threat_name = "Windows.Trojan.AgentTesla"
    source = "Manual"
    maturity = "Diagnostic, Production"
    reference_sample = "65463161760af7ab85f5c475a0f7b1581234a1e714a2c5a555783bdd203f85f4"
    scan_type = "File, Memory"
    severity = 100

strings:
    $a1 = "GetMozillaFromLogins" ascii fullword
    $a2 = "AccountConfiguration+username" wide fullword
    $a3 = "MailAccountConfiguration" ascii fullword
    $a4 = "KillTorProcess" ascii fullword
    $a5 = "SmtpAccountConfiguration" ascii fullword
    $a6 = "GetMozillaFromSQLite" ascii fullword
```
