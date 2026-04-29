---
title: "Exploring Windows UAC Bypasses: Techniques and Detection Strategies"
slug: "exploring-windows-uac-bypasses-techniques-and-detection-strategies"
date: "2023-05-15"
description: "In this research article, we will take a look at a collection of UAC bypasses, investigate some of the key primitives they depend on, and explore detection opportunities."
author:
  - slug: samir-bousseaden
image: "llustration-desktop-security-webinar-1680x980.jpg"
category:
  - slug: security-operations
  - slug: detection-science
---

Malware often requires full administrative privileges on a machine to perform more impactful actions such as adding an antivirus exclusion, encrypting secured files, or injecting code into interesting system processes. Even if the targeted user has administrative privileges, the prevalence of [User Account Control](https://docs.microsoft.com/en-us/windows/security/identity-protection/user-account-control/how-user-account-control-works) (UAC) means that the malicious application will often default to Medium Integrity, preventing write access to resources with [higher integrity levels](https://docs.microsoft.com/en-us/windows/win32/secauthz/mandatory-integrity-control). To bypass this restriction, an attacker will need a way to elevate integrity level silently and with no user interaction (no [UAC prompt](https://docs.microsoft.com/en-us/windows/security/identity-protection/user-account-control/images/uacconsentprompt.gif)). This technique is known as a User Account Control [bypass](https://attack.mitre.org/techniques/T1548/002/) and relies on a variety of primitives and conditions, the majority of which are based on piggybacking elevated Windows features.

Example of cscript.exe running as Medium spawning a cmd.exe instance with High integrity via a UAC bypass:

![](/assets/images/exploring-windows-uac-bypasses-techniques-and-detection-strategies/exploring-windows-uac-bypasses-image12.jpg)

Most of UAC validation logic is implemented in the Application Information (AppInfo) service. A great primer about the elevation conditions and the different checks can be found [here](https://medium.com/tenable-techblog/uac-bypass-by-mocking-trusted-directories-24a96675f6e).

In this blog post, we will take a look at a collection of UAC bypasses, investigate some of the key primitives they depend on, and explore detection opportunities.

## UAC Bypass Methods

UAC bypass methods usually result in hijacking the normal execution flow of an elevated application by spawning a malicious child process or loading a malicious module inheriting the elevated integrity level of the targeted application.

There are some other edge cases but the most common hijack methods are:

![](/assets/images/exploring-windows-uac-bypasses-techniques-and-detection-strategies/exploring-windows-uac-bypasses-image16.png)

## Registry Key Manipulation

The goal of manipulating a registry key is to redirect the execution flow of an elevated program to a controlled command. The most abused key values are related to shell open commands for specific extensions (depending on the targeted program) or windir/systemroot[environment variables manipulation](https://www.tiraniddo.dev/2017/05/exploiting-environment-variables-in.html):

- HKCU\\Software\\Classes\\\<targeted_extension\\>\\shell\\open\command (Default or DelegateExecute values)
- HKCU\\Environment\\windir
- HKCU\\Environment\\systemroot

For instance, when fodhelper (a Windows binary that allows elevation without requiring a UAC prompt) is launched by malware as a Medium integrity process, Windows automatically elevates fodhelper from a Medium to a High integrity process. The High integrity fodhelper then attempts to open an ms-settings file using its default handler. Since the medium-integrity malware has hijacked this handler, the elevated fodhelper will execute a command of the attacker’s choosing as a high integrity process.

![](/assets/images/exploring-windows-uac-bypasses-techniques-and-detection-strategies/exploring-windows-uac-bypasses-image19.jpg)

![](/assets/images/exploring-windows-uac-bypasses-techniques-and-detection-strategies/exploring-windows-uac-bypasses-image13.jpg)

Below is an example of [Glupteba](https://malpedia.caad.fkie.fraunhofer.de/details/win.glupteba) malware leveraging this method to first elevate from a Medium to High integrity process, then from High to System integrity via Token Manipulation:

![](/assets/images/exploring-windows-uac-bypasses-techniques-and-detection-strategies/exploring-windows-uac-bypasses-image20.jpg)

An example of a UAC bypass that manipulates the Windows environment variables registry key is [byeintegrity5](https://github.com/AzAgarampur/byeintegrity5-uac). To illustrate this, this bypass uses this primitive to redirect the normal execution flow of the CDSSync scheduled task (set to **Run with highest privileges** ) and elevate the integrity level as shown below.

![](/assets/images/exploring-windows-uac-bypasses-techniques-and-detection-strategies/exploring-windows-uac-bypasses-image5.jpg)

When the CDSSync scheduled task is run, taskhostw.exe will try to load npmproxy.dll from the %windir%\System32 folder, but because the malware controls %windir%, it can redirect taskhostw.exe to load a DLL named npmproxy.dll from a path it controls as shown below.

![](/assets/images/exploring-windows-uac-bypasses-techniques-and-detection-strategies/exploring-windows-uac-bypasses-image2.jpg)

UAC bypasses based on environment variable manipulation often work when UAC is set to **Always Notify** (the maximum UAC level) as they often don’t involve writing files to secured paths or starting an autoElevated application. Changes to SystemRoot or Windir from the current user registry to non-expected values are very suspicious and should be a high-confidence signal for detection.

## DLL Hijack

The DLL hijack method usually consists of finding a missing DLL (often a missing dependency) or winning a DLL file write race by loading a malicious DLL into an elevated process. If UAC is enabled but not set to **Always Notify,** then malware can perform an elevated [IFileOperation](https://docs.microsoft.com/en-us/windows/win32/api/shobjidl_core/nn-shobjidl_core-ifileoperation) (no UAC prompt) to create/copy/rename or move a DLL file to a trusted path (i.e., System32), then trigger an elevated program to load the malicious DLL instead of the expected one.

The IFileOperation is performed by dllhost.exe (COM Surrogate) with process.command_line containing the classId \{3AD05575-8857-4850-9277-11B85BDB8E09\}.

![](/assets/images/exploring-windows-uac-bypasses-techniques-and-detection-strategies/exploring-windows-uac-bypasses-image23.jpg)

We can use the following [EQL correlation](https://www.elastic.co/guide/en/elasticsearch/reference/current/eql-syntax.html) to link any file operation by dllhost.exe followed by loading a non-Microsoft signed DLL into a process running with system integrity:

```
EQL search - UAC bypass via IFileOperation (Medium to System Integrity)

sequence by host.id
 [file where event.action in ("creation", "overwrite", "rename",
 "modification") and

  /* IFileOperation are performed by DllHost */
  process.name : "dllhost.exe" and user.id : "S-1-5-21-*" and

  /* executable file dropped via NewItem, Rename, Move or
  Copy IFileOperation */  (file.extension : "dll" or
  file.Ext.header_bytes : "4d5a*") and

  /* protected system paths usually abused via DLL search order hijack */
  file.path : ("?:\\Windows\\system32\\*",
               "?:\\Windows\\syswow64\\*",
               "?:\\Program Files (x86)\\Microsoft\\*",
               "?:\\Program Files\\Microsoft\\*"
               )] by file.path
 [library where
  /* non MS signed DLL loaded by a System Process */
  user.id : "S-1-5-18" and
  process.executable :
              ("?:\\Windows\\system32\\*",
               "?:\\Windows\\syswow64\\*",
               "?:\\Program Files (x86)\\Microsoft\\*",
               "?:\\Program Files\\Microsoft\\*") and
 not (dll.code_signature.subject_name : "Microsoft *" and
      dll.code_signature.trusted == true)] by dll.path
```

This is an example detection of [UACME 30](https://github.com/hfiref0x/UACME/tree/v3.2.x) sideloading [wow64log.dll](http://waleedassar.blogspot.com/2013/01/wow64logdll.html) into an instance of WerFault.exe running as System (which provides a good direct jump from Medium to System integrity) shown below.

![](/assets/images/exploring-windows-uac-bypasses-techniques-and-detection-strategies/exploring-windows-uac-bypasses-image8.jpg)

If UAC is set to **Always Notify,** then finding a missing DLL or winning a file write race condition into a path writable by a Medium integrity process is a valid option. This is an [example](https://enigma0x3.net/2016/07/22/bypassing-uac-on-windows-10-using-disk-cleanup/) of UAC bypass hijacking the SilentCleanup scheduled task (via a file write race condition) which spawns a high integrity descendant process DismHost.exe executing from an AppData subfolder (writable by Medium integrity) and this is [another variation](https://github.com/EncodeGroup/UAC-SilentClean) that abuses the same task but for a missing dependency. api-ms-win-core-kernel32-legacy-l1.dll.

![](/assets/images/exploring-windows-uac-bypasses-techniques-and-detection-strategies/exploring-windows-uac-bypasses-image22.jpg)

Another DLL Hijack primitive that can achieve the same goal is to use [DLL loading redirection](https://docs.microsoft.com/en-us/windows/win32/dlls/dynamic-link-library-redirection) via creating a folder within the same directory of the targeted elevated program (e.g. target_program.exe.local and dropping a DLL there that will be loaded instead of the expected one).

This technique can be also used as a primitive for local privilege escalation in the case of a vulnerability that allows the creation of a folder (with a permissive Access Control List) to a controlled location such as described by [Jonas Lykkegård](https://twitter.com/jonasLyk) in this blog [From directory deletion to SYSTEM shell](https://secret.club/2020/04/23/directory-deletion-shell.html).

```
EQL search - Potential Privilege Escalation via DLL Redirection

library where user.id : "S-1-5-18" and
  dll.path : ("?:\\Windows\\system32\\*.exe.local\\*",
              "?:\\Windows\\syswow64\\*.exe.local\\*",
              "?:\\Program Files (x86)\\Microsoft\\*.exe.local\\*",
              "?:\\Program Files\\Microsoft\\*.exe.local\\*") and
 not (dll.code_signature.subject_name : "Microsoft *" and
      dll.code_signature.trusted == true) and
 process.executable :
              ("?:\\Windows\\system32\\*",
               "?:\\Windows\\syswow64\\*",
               "?:\\Program Files (x86)\\Microsoft\\*",
               "?:\\Program Files\\Microsoft\\*")
```

This query matches on [UACME](https://github.com/hfiref0x/UACME/tree/v3.2.x) method 22, which targets consent.exe (executing as System), tricking it into loading comctl32.dll from the SxS DotLocal directory instead of System32:

![](/assets/images/exploring-windows-uac-bypasses-techniques-and-detection-strategies/exploring-windows-uac-bypasses-image14.jpg)

> It’s worth also mentioning that the majority of UAC bypasses via DLL hijack are also useful for persistence and may bypass detection based on [autoruns](https://docs.microsoft.com/en-us/sysinternals/downloads/autoruns) (known file and registry persistence locations).

## Elevated COM Interface

This method is a bit different from the previous ones, meaning no direct operation redirection is involved. Instead, it relies on finding an elevated COM interface that exposes some form of execution capabilities (i.e., CreateProcess / [ShellExec](https://gist.github.com/api0cradle/d4aaef39db0d845627d819b2b6b30512#file-akagi_41-c-L130) wrapper) that can be invoked to launch a privileged program passed via arguments from a medium integrity process.

From a behavior perspective, usually, those COM interfaces will be executed under the context of dllhost.exe (COM Surrogate) with process.command_line containing the classId of the targeted COM object, this will usually result in the creation of a high integrity child process.

Below are examples of different malware families adopting this method for UAC bypass (such as [DarkSide](https://malpedia.caad.fkie.fraunhofer.de/details/win.darkside) and [LockBit](https://malpedia.caad.fkie.fraunhofer.de/details/win.lockbit) ransomware families) to elevate integrity level before launching the encryption and evasion capabilities, which is good prevention choke point:

![](/assets/images/exploring-windows-uac-bypasses-techniques-and-detection-strategies/exploring-windows-uac-bypasses-image6.jpg)

## Token Security Attributes

An insightful [observation](https://twitter.com/tiraniddo/status/1192583900645732352?lang=fr) was made by [James Forshaw](https://twitter.com/tiraniddo) for the possibility of leveraging process [token security attributes](https://github.com/processhacker/processhacker/blob/76d00575597c9c6baabcf2cbb81e7e099ac31f8f/phnt/include/ntseapi.h#L194-L204) to identify processes launched as descendants of an auto-elevated application.

[ProcessHacker](https://github.com/processhacker/processhacker/blob/ac8578d86bbca9924e9cec2c09ec495d44a6f3fd/ProcessHacker/tokprp.c#L3118-L3171) also captures this type of information. Below is an example of Token Properties for a notepad.exe instance launched via the fodhelper UAC bypass.

![](/assets/images/exploring-windows-uac-bypasses-techniques-and-detection-strategies/exploring-windows-uac-bypasses-image21.jpg)

The LUA://HdAutoAp attribute means it’s an auto-elevated application (populated also for elevated COM objects and AppInfo hardcoded whitelisted processes). LUA://DecHdAutoAp means it’s a descendant of an auto elevated application, which is very useful when tracking the process tree generated via a UAC bypass.

[Elastic Endpoint security 7.16](https://www.elastic.co/blog/whats-new-elastic-security-7-16-0) and above capture this information with process execution events (process.Ext.token.security_attributes) which open up the opportunity to hunt and detect UAC bypasses hijacking the execution flow of an auto-elevated program or COM Interface with no prior knowledge of the bypass specifics (targeted binary, COM Interface, redirection method, and other important details):

Suspicious Auto Elevated Program Child Process:

```
EQL search - Detecting UAC bypass via Token Security Attributes

process where event.action == "start" and
   process.Ext.token.integrity_level_name : ("high", "system") and
   process.parent.command_line != null and
   /* descendant of an auto-elevated application or COM object */
   process.Ext.token.security_attributes : "LUA://DecHdAutoAp" and
    (
      /* common lolbins, evasion and proxy execution programs */
      process.pe.original_file_name :
                 ("rundll32.exe",
                  "cmd.exe",
                  "pwsh*",
                  "powershell.exe",
                  "mshta.exe",
                  "msbuild.exe",
                  "regsvr32.exe",
                  "powershell.exe",
                  "cscript.exe",
                  "wscript.exe",
                  "wmic.exe",
                  "installutil.exe",
                  "msxsl.exe",
                  "Microsoft.Workflow.Compiler.exe",
                  "ieexec.exe",
                  "iexpress.exe",
                  "RegAsm.exe",
                  "installutil.exe",
                  "RegSvcs.exe",
                  "RegAsm.exe",
                  "javaw.exe",
                  "reg.exe",
                  "schtasks.exe",
                  "sc.exe",
                  "net.exe",
                  "net1.exe",
                  "vssadmin.exe",
                  "bcdedit.exe",
                  "wbadmin.exe",
                  "msiexec.exe") or

       /* suspicious or unusual paths */
       process.executable : ("?:\\Windows\\Microsoft.NET\\*",
                             "?:\\Users\\Public\\*",
                             "?:\\Programdata\\*",
                             "?:\\Windows\\Temp\\*",
                             "?:\\Windows\\Tasks\\*",
                             "?:\\Windows\\System32\\Tasks\\*") or

       /* MS signed but from unusual paths */
       (process.code_signature.trusted == true and
        process.code_signature.subject_name : "Microsoft *" and
        not process.executable : ("?:\\Windows\\system32\\*.exe",
                                  "?:\\Windows\\SysWOW64\\*.exe",
                                  "?:\\Program Files\\*.exe",
                                  "?:\\Program Files (x86)\\*",
                                  "?:\\ProgramData\\Microsoft\\*",
                      "\\Device\\HarddiskVolume*\\Windows\\System32\\*.exe",
                      "\\Device\\HarddiskVolume*\\Windows\\SysWOW64\\*.exe") and

        /* runs from temp folder and invoked by different elevated processes */
        not process.pe.original_file_name == "DismHost.exe"
       ) or

    /* elevated and unsigned or untrusted programs excluding
      third party uninstallers executed via appwiz.cpl */
      ((process.code_signature.trusted == false or
      process.code_signature.exists == false) and
        not (process.parent.name : "dllhost.exe" and
          process.parent.command_line :
          "*FCC74B77-EC3E-4DD8-A80B-008A702075A9*"))) and

  /* Rundll32 FPs */
  not (process.name : "rundll32.exe" and
       process.args :
         ("devmgr.dll,DeviceProperties_RunDLL",
         "?:\\Windows\\system32\\iesetup.dll,IEShowHardeningDialog") and
       process.parent.name : ("dllhost.exe", "ServerManager.exe")) and

  /* uninstallers executed via appwiz.cpl */
  not (process.args : "/uninstall" and
       process.parent.name : "dllhost.exe" and
       process.parent.command_line : "*FCC74B77-EC3E-4DD8-A80B-008A702075A9*")
       and

  /* server manager may spawn interactive powershell commands */
  not (process.name : "powershell.exe" and
       process.parent.executable : "?:\\Windows\\System32\\ServerManager.exe")
       and

 /* Windows Installer service descendants */
 not (process.parent.executable : "?:\\Windows\\System32\\msiexec.exe" and
      process.parent.args : "/V")
```

The above query also matches on all the descendants of a UAC bypass and not only the direct child process.

Here we can see this approach detecting the fodhelper execution flow hijacking via registry key manipulation:

![](/assets/images/exploring-windows-uac-bypasses-techniques-and-detection-strategies/exploring-windows-uac-bypasses-image10.jpg)

Here is an example of this matching UAC Bypass by [Mocking Trusted Directories](https://medium.com/tenable-techblog/uac-bypass-by-mocking-trusted-directories-24a96675f6e).

![](/assets/images/exploring-windows-uac-bypasses-techniques-and-detection-strategies/exploring-windows-uac-bypasses-image15.jpg)

Below are examples of matches for 3 different UAC bypasses via Elevated COM Interface:

![](/assets/images/exploring-windows-uac-bypasses-techniques-and-detection-strategies/exploring-windows-uac-bypasses-image17.jpg)

## Detection Evasion

A good number of evasion techniques that are not limited to UAC bypass were discussed in [this](https://swapcontext.blogspot.com/2020/10/uacme-35-wd-and-ways-of-mitigation.html) blog post by [hFireF0X](https://twitter.com/hFireF0X) such as renaming a folder or registry key, registry symbolic links to break detection logic based on specific file path/registry key changes or correlation of different events by the same process. Although the majority of malware families don’t bother to modify and tune those techniques, accounting for those evasion opportunities is a must for more resilience.

Below is an example of file monitoring evasion via directory rename ([UACME 22](https://github.com/hfiref0x/UACME/tree/v3.2.x)).

![](/assets/images/exploring-windows-uac-bypasses-techniques-and-detection-strategies/exploring-windows-uac-bypasses-image11.jpg)

Here is an example of registry key path monitoring evasion via key rename ([byeintegrity8](https://github.com/AzAgarampur/byeintegrity8-uac)).

![](/assets/images/exploring-windows-uac-bypasses-techniques-and-detection-strategies/exploring-windows-uac-bypasses-image7.jpg)

Another interesting evasion trick that was added recently to [UACME v.3.5.7](https://github.com/hfiref0x/UACME/commit/75b39e214ef6c2e37f04463f89aa0433afb2b08a#diff-b88fec8a22ebca61cc2ebfb4b0e1549b50fd179f262228e018ab2463cb4efc56R567) is the [CurVer](https://docs.microsoft.com/en-us/windows/win32/shell/fa-progids) subkey, which can be used to redirect the shell Default handler. This effectively bypasses detections looking for hardcoded suspicious registry path/values:

![](/assets/images/exploring-windows-uac-bypasses-techniques-and-detection-strategies/exploring-windows-uac-bypasses-image9.jpg)

For file-based detection related to DLL hijacking, it is better to use DLL load events ([Elastic Endpoint Security 7.16](https://www.elastic.co/blog/whats-new-elastic-security-7-16-0) logs non-Microsoft signed DLLs). For registry ones, a mix of registry.data.strings, and value names should be a bit more resilient than the full key path.

The example [EQL correlation](https://www.elastic.co/guide/en/elasticsearch/reference/current/eql-syntax.html) below shows how to detect DLL loading from a directory masquerading as System32 (i.e as a result of windir/systemroot environment variable modification):

```
EQL search - Detect redirection via rogue Windir/SystemRoot

sequence by process.entity_id with maxspan=1m
  [process where event.action == "start" and
    /* any process running as high or system integrity */
    process.Ext.token.integrity_level_name : ("high", "system")]
  [library where dll.path :
    /* masquerading as windir/system root */
    ("?:\\*\\System32\\*.dll", "?:\\*\\SysWOW64\\*.dll") and
    not dll.path :
           ("?:\\Windows\\System32\\*.dll","?:\\Windows\\Syswow64\\*.dll") and
    not (dll.code_signature.subject_name : "Microsoft *" and
         dll.code_signature.trusted == true)]

```

This example shows matches for 2 different techniques (registry key manipulation and DLL hijack via fake Windir):

![](/assets/images/exploring-windows-uac-bypasses-techniques-and-detection-strategies/exploring-windows-uac-bypasses-image18.jpg)

The next example combines a [registry symbolic link](https://scorpiosoftware.net/2020/07/17/creating-registry-links/) and registry key rename to evade fodhelper UAC bypass detection based on registry key changes monitoring (ms-settings or shell\open\command):

![](/assets/images/exploring-windows-uac-bypasses-techniques-and-detection-strategies/exploring-windows-uac-bypasses-image3.jpg)

[UACME v.3.5](https://github.com/hfiref0x/UACME) and above [implements](https://github.com/hfiref0x/UACME/commit/e9495cfd2ff074ca8d4a3722428212e09c981817#diff-b88fec8a22ebca61cc2ebfb4b0e1549b50fd179f262228e018ab2463cb4efc56R163) this evasion for methods involving registry key manipulation.

You can hunt using Elastic Endpoint or Sysmon logs registry symbolic link creation by looking for registry modification with value name equal to SymbolicLinkValue.

An example KQL query to detect this evasion is: registry.value :"SymbolicLinkValue" and registry.key :S-1-5-21-15_Classes\_\*`:

![](/assets/images/exploring-windows-uac-bypasses-techniques-and-detection-strategies/exploring-windows-uac-bypasses-image1.jpg)

## Most Common UAC Bypasses

Malware families in use in the wild constantly shift and change. Below you can see a quick overview of the top commonly observed UAC bypass methods used by malware families:

| Method                                                | Malware Family              |
| ----------------------------------------------------- | --------------------------- |
| UAC Bypass via ICMLuaUtil Elevated COM Interface      | DarkSide, LockBit, TrickBot |
| UAC Bypass via ComputerDefaults Execution Hijack      | ClipBanker, Quasar RAT      |
| UAC Bypass via Control Panel Execution Hijack         | AveMaria, Trojan.Mardom     |
| UAC Bypass via DiskCleanup Scheduled Task Hijack      | RedLine Stealer, Glupteba   |
| UAC Bypass via FodHelper Execution Hijack             | Glupteba, BitAT dropper     |
| UAC Bypass Attempt via Windows Directory Masquerading | Remcos RAT                  |

![](/assets/images/exploring-windows-uac-bypasses-techniques-and-detection-strategies/exploring-windows-uac-bypasses-image4.jpg)

Most common executed commands via a UAC bypass are either the malware re-execute itself as high integrity or defense evasions techniques such as:

- Tamper with AV exclusions or state
- Writing to HKLM protected registry keys
- Tamper with system recovery settings

## Conclusion

Designing detections by focusing on key building blocks of an offensive technique is much more cost-effective than trying to cover the endless variety of implementations and potential evasion tunings. In this post, we covered the main methods used for UAC bypass and how to detect them as well as how enriching process execution events with token security attributes enabled us to create a broader detection logic that may match unknown bypasses.

In addition to the broader detections highlighted in this blog post, Elastic Endpoint Security comes with 26 prebuilt endpoint behavior protections for UAC bypasses.

## References

- [https://github.com/hfiref0x/UACME](https://github.com/hfiref0x/UACME) (and its sub references)
- [https://swapcontext.blogspot.com/2020/10/uacme-35-wd-and-ways-of-mitigation.html](https://swapcontext.blogspot.com/2020/10/uacme-35-wd-and-ways-of-mitigation.html)
- [https://tyranidslair.blogspot.no/2017/05/reading-your-way-around-uac-part-1.html](https://tyranidslair.blogspot.no/2017/05/reading-your-way-around-uac-part-1.html)
- [https://tyranidslair.blogspot.no/2017/05/reading-your-way-around-uac-part-2.html](https://tyranidslair.blogspot.no/2017/05/reading-your-way-around-uac-part-2.html)
- [https://tyranidslair.blogspot.no/2017/05/reading-your-way-around-uac-part-3.html](https://tyranidslair.blogspot.no/2017/05/reading-your-way-around-uac-part-3.html)
- [https://www.tiraniddo.dev/2017/05/exploiting-environment-variables-in.html](https://www.tiraniddo.dev/2017/05/exploiting-environment-variables-in.html)
- [https://medium.com/tenable-techblog/uac-bypass-by-mocking-trusted-directories-24a96675f6e](https://medium.com/tenable-techblog/uac-bypass-by-mocking-trusted-directories-24a96675f6e)
- [https://github.com/AzAgarampur/byeintegrity5-uac](https://github.com/AzAgarampur/byeintegrity5-uac)
- [https://github.com/AzAgarampur/byeintegrity8-uac](https://github.com/AzAgarampur/byeintegrity8-uac)
- [https://enigma0x3.net/2016/07/22/bypassing-uac-on-windows-10-using-disk-cleanup/](https://enigma0x3.net/2016/07/22/bypassing-uac-on-windows-10-using-disk-cleanup/)
- [https://docs.microsoft.com/en-us/windows/win32/secauthz/mandatory-integrity-control](https://docs.microsoft.com/en-us/windows/win32/secauthz/mandatory-integrity-control)
- [https://docs.microsoft.com/en-us/windows/security/identity-protection/user-account-control/how-user-account-control-works](https://docs.microsoft.com/en-us/windows/security/identity-protection/user-account-control/how-user-account-control-works)
- [https://googleprojectzero.blogspot.com/2019/12/calling-local-windows-rpc-servers-from.html](https://googleprojectzero.blogspot.com/2019/12/calling-local-windows-rpc-servers-from.html)
