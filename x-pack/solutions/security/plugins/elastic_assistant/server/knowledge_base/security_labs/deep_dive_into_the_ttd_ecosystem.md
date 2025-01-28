---
title: "Deep dive into the TTD ecosystem"
slug: "deep-dive-into-the-ttd-ecosystem"
date: "2022-11-30"
description: "This is the first in a series focused on the Time Travel Debugging (TTD) technology developed by Microsoft that was explored in detail during a recent independent research period."
author:
  - slug: christophe-alladoum
image: "photo-edited-02-w.jpg"
category:
  - slug: security-research
tags:
  - windows
---

Several times a year, Elastic Security Labs researchers get the freedom to choose and dig into projects of their liking — either alone or as a team. This time is internally referred to as “On-Week” projects. This is the first in a series focused on the [Time Travel Debugging](https://docs.microsoft.com/en-us/windows-hardware/drivers/debugger/time-travel-debugging-overview) (TTD) technology developed by Microsoft that was explored in detail during a recent On-Week session.

Despite being made public for several years, awareness of TTD and its potential are greatly underrated within the infosec community. We hope this two-part series can help shed some light on how TTD can be useful for program debugging, vulnerability research and exploitation, and malware analysis.

This research involved first understanding the inner workings of TTD and then assessing some interesting applicable uses that can be made out of it. This post will focus on how researchers dive deep into TTD, sharing their methodology along with some interesting findings. The second part will detail the applicable use of TTD for the purpose of malware analysis and integration with Elastic Security.

# Background

[Time Travel Debugging](https://docs.microsoft.com/en-us/windows-hardware/drivers/debugger/time-travel-debugging-overview) is a tool developed by Microsoft Research that allows users to record execution and navigate freely into the user-mode runtime of a binary. TTD itself relies on two technologies: Nirvana for the binary translation, and iDNA for the trace reading/writing process. Available since Windows 7, TTD internals were first detailed [in a publicly available paper](https://www.usenix.org/legacy/events/vee06/full_papers/p154-bhansali.pdf). Since then, both [Microsoft](https://www.youtube.com/watch?v=l1YJTg_A914&) and [independent researchers](https://infocondb.org/con/recon/recon-2015/hooking-nirvana-stealthy-instrumentation-techniques-for-windows-10) have covered it in great detail. For this reason, we won’t explore the internals of both technologies in depth. Instead, Elastic researchers investigated the ecosystem — or the executables, DLLs, and drivers — that make the TTD implementation work. This led to some interesting findings about TTD, but also Windows itself, as TTD leverages some (undocumented) techniques to work as intended in special cases, such as [Protected Processes](https://docs.microsoft.com/en-us/windows/win32/services/protecting-anti-malware-services-#system-protected-process).

But why investigate TTD at all? Aside from pure curiosity, it is likely that one of the possible intended uses for the technology would be discovering bugs in production environments. When bugs are hard to trigger or reproduce, having a “record-once-replay-always” type of environment helps compensate for that difficulty, which is exactly what TTD implements when coupled with WinDbg.

Debugging tools such as [WinDbg](https://apps.microsoft.com/store/detail/9PGJGD53TN86) have always been an immense source of information when reversing Windows components, as they provide additional comprehensible information, usually in plain text. Debugging tools (especially debuggers) must cooperate with the underlying operating system, which could involve debugging interfaces and/or previously undisclosed capabilities from the OS. TTD conforms to that pattern.

# High-level overview

TTD works by first creating a recording that tracks every instruction executed by an application and stores it in a database (suffixed with .run). Recorded traces can be replayed at will using the WinDbg debugger, which on first access will index the .run file, allowing for faster navigation through the database. To be able to track execution of arbitrary processes, TTD injects a DLL responsible for recording activity on-demand which allows it to record processes by spawning them, but also may attach to an already-running process.

TTD is freely [downloadable](https://apps.microsoft.com/store/detail/9PGJGD53TN86) as part of the WinDbg Preview package in the MS Store. It can be used directly from WinDbg Preview (aka WinDbgX), but is a standalone component that is located in `C:\Program Files\WindowsApps\Microsoft.WinDbg_<version></version>_<arch>__8wekyb3d8bbwe\amd64\ttd` for the x64 architecture, which we will focus on in this post. x86 and arm64 versions are also available for download in the MS Store.

The package consists of two EXE files (TTD.exe and TTDInject.exe) and a handful of DLLs. This research focuses on the major DLL responsible for everything not related to Nirvana/iDNA (i.e. responsible for the session management, driver communication, DLL injection, and more): ttdrecord.dll

\_Note: Most of this research was made using two versions of the ttdrecord DLL: mostly on a 2018 version (1.9.106.0 SHA256=aca1786a1f9c96bbe1ea9cef0810c4d164abbf2c80c9ecaf0a1ab91600da6630), and early 2022 version (10.0.19041.1 SHA256=1FF7F54A4C865E4FBD63057D5127A73DA30248C1FF28B99FF1A43238071CBB5C). The older versions were found to have more symbols, which helped speed up the reverse engineering process. We then re-adapted structures and function names to the most recent version. Therefore, some of the structures explained here might not be the same if you’re trying to reproduce on more recent versions. \_

# Examining TTD features

## Command line parameters

Readers should note that TTD.exe acts essentially as a wrapper to ttdrecord!ExecuteTTTracerCommandLine:

```
HRESULT wmain()
{
v28 = 0xFFFFFFFFFFFFFFFEui64;
hRes = CoInitializeEx(0i64, 0);
if ( hRes >= 0 )
{
ModuleHandleW = GetModuleHandleW(L"TTDRecord.dll");
[...]
TTD::DiagnosticsSink::DiagnosticsSink(DiagnosticsSink, &v22);
CommandLineW = GetCommandLineW();
lpDiagnosticsSink = Microsoft::WRL::Details::Make<TTD::CppToComDiagnosticsSink,TTD::DiagnosticsSink>(&v31, DiagnosticsSink);
hRes = ExecuteTTTracerCommandLine(*lpDiagnosticsSink, CommandLineW, 2i64);
[...]
```

The final line of the code excerpt above shows a call to ExecuteTTTracerCommandLine , which takes an integer as the last argument. This argument corresponds to the desired tracing modes, which are: - 0 -\> FullTracingMode, - 1 -\> UnrestrictedTracing and - 2 -\> Standalone (the hardcoded mode for the public version of TTD.exe)

Forcing TTD to run in full-tracing mode reveals available options, which include some hidden capabilities such as process reparenting (-parent) and automatic tracing until reboot (-onLaunch) for programs and services.

[Dumping the complete option set](https://gist.github.com/calladoum-elastic/4666dafc789a273c35a4aedf2ed9cd9e) of TTDRecord.dll revealed interesting hidden command line options such as:

```
-persistent Trace programs or services each time they are started (forever). You must specify a full path to the output location with -out.
-delete Stop future tracing of a program previously specified with -onLaunch or -persistent. Does not stop current tracing. For -plm apps you can only specify the package (-delete <package>) and all apps within that package will be removed from future tracing
-initialize Manually initialize your system for tracing. You can trace without administrator privileges after the system is initialized.
```

The process of setting up Nirvana requires TTD to set up the InstrumentationCallback field in the target \_EPROCESS. This is achieved through the (undocumented but [known](https://www.codeproject.com/Articles/543542/Windows-x64-System-Service-Hooks-and-Advanced-Debu)) NtSetInformationProcess(ProcessInstrumentationCallback) syscall (ProcessInstrumentationCallback, which has a value of 40). Due to the potential security implication, invoking this syscall requires elevated privileges. Interestingly, the -initialize flag also hinted that TTD could be deployed as a Windows service. Such service would be responsible for proxying tracing requests to arbitrary processes. This can be confirmed by executing it and seeing the resulting error message:

![Deducing TTDService.exe](/assets/images/deep-dive-into-the-ttd-ecosystem/image13.jpg)

Even though it [is easy](https://www.virustotal.com/gui/search/TTDService.exe/files)to find evidence confirming the existence of TTDService.exe , the file was not provided as part of the public package, so aside from noting that TTD can run as a service, we will not cover it in this post.

## TTD process injection

As explained, a TTD trace file can either be created from the standalone binary TTD.exe or through a service TTDService.exe (private), both of which must be run in a privileged context. However, those are just launchers and injecting the recording DLL (named TTDRecordCPU.dll) is the job of another process: TTDInject.exe.

TTDInject.exe is another executable noticeably larger than TTD.exe, but with a pretty simple objective: prepare the tracing session. In an overly simplified view, TTD.exe will first start the process to be recorded in a suspended state. It will then spawn TTDInject.exe, passing it all the necessary arguments to prepare the session. Note that TTDInject can also spawn the process directly depending on the tracing mode we mentioned earlier — therefore, we are describing the most common behavior (i.e. when spawned from TTD.exe).

![TTD.exe process metadata](/assets/images/deep-dive-into-the-ttd-ecosystem/image17.jpg)

TTDInject will create a thread to execute TTDLoader!InjectThread in the recorded process, which after various validations will in turn load the library responsible for recording all process activity, TTDRecordCPU.dll.

![Using TTD to trace Notepad.exe](/assets/images/deep-dive-into-the-ttd-ecosystem/image6.jpg)

From that point onward, all instructions, memory accesses, exceptions triggered, or CPU states encountered during the execution will be recorded.

Once the general workflow of TTD was understood, it became clear that little to no manipulation is possible after the session initialization. Thus, further attention was paid to the arguments supported by ttdrecord.dll. Thanks to the C++ mangling function format, a lot of critical information can be retrieved from the function names themselves, which makes analyzing the command line argument parser relatively simple. One interesting flag that was discovered was PplDebuggingToken. That flag is hidden and only available in Unrestricted Mode.

![Discovering PplDebuggingToken method](/assets/images/deep-dive-into-the-ttd-ecosystem/image19.jpg)

The existence of this flag immediately raised questions: TTD was architected first around Windows 7 and 8, and on Windows 8.1+. The concept of Protection Level was added to processes, dictating that processes can only open handles to a process with a [Protection Level](https://www.elastic.co/blog/protecting-windows-protected-processes#Protected%20process%20light:%7E:text=a%20kernel%20driver.-,Protected%20process%20light,-) that is equal or inferior. It is a simple byte in the \_EPROCESS structure in the kernel, and thus not directly modifiable from user mode.

![Binary diff comparing TTD on Windows 8 with Windows 8.1](/assets/images/deep-dive-into-the-ttd-ecosystem/image11.jpg)

The values of the Protection Level byte are well known and are summarized in the table below.

![Protection Level value mappings](/assets/images/deep-dive-into-the-ttd-ecosystem/image20.png)

The Local Security Authority subsystem (lsass.exe) on Windows [can be configured](https://docs.microsoft.com/en-us/windows-server/security/credentials-protection-and-management/configuring-additional-lsa-protection) to run as Protected Process Light, which aims to limit the reach of an intruder who gains maximum privileges on a host. By acting at the kernel level, no user-mode process can open a handle to lsass, no matter how privileged.

![Verifying LSASS protection level](/assets/images/deep-dive-into-the-ttd-ecosystem/image2.jpg)

But the PplDebuggingToken flag appears to suggest otherwise. If such a flag existed, it would be the dream of any pentester/red teamer: a (magic) token that would allow them to inject into protected processes and record them, dump their memory or more. The command line parser seems to imply that the content of the command flag is a mere wide-string. Could this be a PPL backdoor?

### Chasing after the PPL debugging token

Returning to ttdrecord.dll, the PplDebuggingToken command line option is parsed and stored in a context structure along with all of the options required to create the TTD session. The value can be traced down to several locations, with an interesting one being within TTD::InitializeForAttach, whose behavior is simplified in the following pseudo-code:

```
ErrorCode TTD::InitializeForAttach(TtdSession *ctx)
{
  [...]
  EnableDebugPrivilege(GetCurrentProcess()); // [1]
  HANDLE hProcess = OpenProcess(0x101040u, 0, ctx->dwProcessId);
  if(hProcess == INVALID_HANDLE_VALUE)
 {
    goto Exit;
  }
  [...]
  HMODULE ModuleHandleW = GetModuleHandleW(L"crypt32.dll");
  if ( ModuleHandleW )
  pfnCryptStringToBinaryW = GetProcAddress(ModuleHandleW, "CryptStringToBinaryW"); // [2]

  if ( ctx->ProcessDebugInformationLength ) // [3]
  {
DecodedProcessInformationLength = ctx->ProcessDebugInformationLength;
DecodedProcessInformation = std::vector<unsigned char>(DecodedProcessInformationLength);
wchar_t* b64PplDebuggingTokenArg = ctx->CmdLine_PplDebugToken;
if ( *pfnCryptStringToBinaryW )
{
  if( ERROR_SUCCESS == pfnCryptStringToBinaryW( // [4]
                      b64PplDebuggingTokenArg,
                      DecodedProcessInformationLength,
                      CRYPT_STRING_BASE64,
                      DecodedProcessInformation.get(),
                      &DecodedProcessInformationLength,
                      0, 0))
  {
    Status = NtSetInformationProcess( // [5]
               NtGetCurrentProcess(),
               ProcessDebugAuthInformation,
               DecodedProcessInformation.get(),
               DecodedProcessInformationLength);
  }
[...]
```

After enabling the SeDebugPrivilege flag for the current process ([1]) and obtaining a handle to the process to attach to ([2]), the function resolves an exported generic function used to perform string operations: crypt32!CryptStringToBinaryW. In this instance, it is used for decoding the base64-encoded value of the PplDebuggingToken context option if it was provided by the command line( [3], [4]). The decoded value is then used to invoke the syscall NtSetInformationProcess(ProcessDebugAuthInformation) ([5]). The token doesn’t seem to be used anywhere else, which made us scrutinize that syscall.

The process information class ProcessDebugAuthInformation was added in [RS4](https://en.wikipedia.org/wiki/Windows_10_version_1803). A quick look at ntoskrnl shows that this syscall simply passes the buffer to CiSetInformationProcess located in ci.dll, which is the Code Integrity driver DLL. The buffer is then passed to ci!CiSetDebugAuthInformation with fully controlled arguments.

![ProcessDebugAuthInformation class](/assets/images/deep-dive-into-the-ttd-ecosystem/image8.jpg)

The following diagram summarizes at a high level where this happens in the execution flow of TTD.

![TTD execution flow diagram](/assets/images/deep-dive-into-the-ttd-ecosystem/image24.png)

The execution flow in CiSetDebugAuthInformation is simple enough: the buffer with the base64-decoded PplDebuggingToken and its length are passed as arguments for parsing and validation to ci!SbValidateAndParseDebugAuthToken. Should the validation succeed, and after some extra validation, a handle to the process performing the syscall (remember that we’re still handling the syscall nt!NtSetInformationProcess) will be inserted in a process debug information object then stored in a global list entry.

![SbValidateAndParseDebugAuthToken method](/assets/images/deep-dive-into-the-ttd-ecosystem/image16.jpg)

But how is that interesting? Because this list is only accessed in a single location: in ci!CiCheckProcessDebugAccessPolicy, and this function is reached during a NtOpenProcess syscall. And, as the name of the newly discovered flag suggested earlier, any process whose PID is located in that list would bypass the Protection Level enforcement. This was confirmed practically in a [KD](https://docs.microsoft.com/en-us/windows-hardware/drivers/debugger/debugging-using-kd-and-ntkd) session by setting an access breakpoint on that list (on our version of ci.dll this was located at ci+364d8). We also [enabled PPL on LSASS](https://docs.microsoft.com/en-us/windows-server/security/credentials-protection-and-management/configuring-additional-lsa-protection) and wrote a simple PowerShell script that would trigger a NtOpenProcess syscall:

![KD session output](/assets/images/deep-dive-into-the-ttd-ecosystem/image12.jpg)

By breaking at the call to nt!PsTestProtectedProcessIncompatibility in nt!PspProcessOpen, we can confirm that our PowerShell process attempts to target lsass.exe, which is a PPL process:

![Confirming our PowerShell process targets a PPL process in LSASS](/assets/images/deep-dive-into-the-ttd-ecosystem/image4.jpg)

Now to confirm the initial theory of what the PplDebuggingToken argument would do by forcing the return value of the call to nt!PsTestProtectedProcessIncompatibility:

![Testing TTD with PowerShell](/assets/images/deep-dive-into-the-ttd-ecosystem/image23.jpg)

We break at the instruction following the call to nt!PsTestProtectedProcessIncompatibility (which only calls CI!CiCheckProcessDebugAccessPolicy), and force the return value to 0 (as mentioned earlier a value of 1 means incompatible):

![Obtaining a handle to LSASS](/assets/images/deep-dive-into-the-ttd-ecosystem/image5.jpg)

Success! We obtained a handle to LSASS despite it being PPL, confirming our theory. Summarizing, if we can find a “valid value” (we’ll dig into that soon) it will pass the check of SbValidateAndParseDebugAuthToken() in ci!CiSetDebugAuthInformation(), and we would have a universal PPL bypass. If this sounds too good to be true, that’s mostly because it is — but confirming it requires developing a better understanding of what CI.dll is doing.

### Understanding Code Integrity policies

Restrictions based on code integrity, such as those used by AppLocker, can be enforced through policies, which in their human readable form are XML files. There are two types of policies: base and supplemental. Examples of what base policies look like can be found in their XML format in "C:\Windows\schemas\CodeIntegrity\ExamplePolicies\". This is what a Base Policy looks like in its XML form (taken from "C:\Windows\schemas\CodeIntegrity\ExamplePolicies\AllowAll.xml"), which reveals most of the details we’re interested in clearly in plaintext.

```
<?xml version="1.0" encoding="utf-8"?>
<SiPolicy xmlns="urn:schemas-microsoft-com:sipolicy">
<VersionEx>1.0.1.0</VersionEx>
<PolicyID>{A244370E-44C9-4C06-B551-F6016E563076}</PolicyID>
<BasePolicyID>{A244370E-44C9-4C06-B551-F6016E563076}</BasePolicyID>
<PlatformID>{2E07F7E4-194C-4D20-B7C9-6F44A6C5A234}</PlatformID>
<Rules>
<Rule><Option>Enabled:Unsigned System Integrity Policy</Option></Rule>
<Rule><Option>Enabled:Advanced Boot Options Menu</Option></Rule>
<Rule><Option>Enabled:UMCI</Option></Rule>
<Rule><Option>Enabled:Update Policy No Reboot</Option></Rule>
</Rules>
<!--EKUS-- >
<EKUs />
<!--File Rules-- >
<FileRules>
<Allow ID="ID_ALLOW_A_1" FileName="*" />
<Allow ID="ID_ALLOW_A_2" FileName="*" />
</FileRules>
<!--Signers-- >
<Signers />
<!--Driver Signing Scenarios-- >
<SigningScenarios>
<SigningScenario Value="131" ID="ID_SIGNINGSCENARIO_DRIVERS_1" FriendlyName="Auto generated policy on 08-17-2015">
  <ProductSigners>
    <FileRulesRef><FileRuleRef RuleID="ID_ALLOW_A_1" /></FileRulesRef>
  </ProductSigners>
</SigningScenario>
<SigningScenario Value="12" ID="ID_SIGNINGSCENARIO_WINDOWS" FriendlyName="Auto generated policy on 08-17-2015">
  <ProductSigners>
    <FileRulesRef><FileRuleRef RuleID="ID_ALLOW_A_2" /></FileRulesRef>
  </ProductSigners>
</SigningScenario>
</SigningScenarios>
<UpdatePolicySigners />
<CiSigners />
<HvciOptions>0</HvciOptions>
<Settings>
<Setting Provider="PolicyInfo" Key="Information" ValueName="Name">
  <Value><String>AllowAll</String></Value>
</Setting>
<Setting Provider="PolicyInfo" Key="Information" ValueName="Id">
  <Value><String>041417</String></Value>
</Setting>
</Settings>
</SiPolicy>
```

XML-formatted policies can be compiled to a binary format using the ConvertFrom-CiPolicy PowerShell cmdlet:

![Compiling XML-formatted policies](/assets/images/deep-dive-into-the-ttd-ecosystem/image14.jpg)

Base Policies allow for fine granularity, with the ability to restrict by name, path, hash, or signer (with or without specific [EKU](https://docs.microsoft.com/en-us/openspecs/windows_protocols/ms-ppsec/651a90f3-e1f5-4087-8503-40d804429a88)); but also in their action mode (Audit or Enforced).

Supplemental Policies were designed as an extension of Base Policies to provide more flexibility allowing, for instance, policies to apply (or not) to a specific group of workstations or servers. Therefore, they are more specific, but can also be more permissive than the Base Policy should be. Interestingly, before 2016, supplemental policies [were not bound to a specific device](https://openrt.gitbook.io/open-surfacert/common/boot-sequence/uefi/secure-boot/windows-bootmanager-exploit), allowing otherwise mitigated bypasses fixed by [MS16-094](https://docs.microsoft.com/en-us/security-updates/securitybulletins/2016/ms16-094) and [MS16-100](https://docs.microsoft.com/en-us/security-updates/securitybulletins/2016/ms16-100) that were [broadly covered](https://arstechnica.com/information-technology/2016/08/microsoft-secure-boot-firmware-snafu-leaks-golden-key) by the media.

Keeping that information in mind, it is possible to get back to ci!SbValidateAndParseDebugAuthToken with more clarity: the function essentially follows three steps: 1. Call ci!SbParseAndVerifySignedSupplementalPolicy to parse the input buffer from the syscall and determine if it’s a validly-signed Supplemental Policy 2. Call ci!SbIsSupplementalPolicyBoundToDevice to compare the DeviceUnlockId from the supplemental policy to that of the current system; such values can be easily retrieved using the syscall NtQuerySystemEnvironmentValueEx with the GUID [`{EAEC226F-C9A3-477A-A826-DDC716CDC0E3}`](https://oofhours.com/2019/09/02/geeking-out-with-uefi/)3. Finally, extract two variables from the policy: an integer (DWORD) which corresponds to the Protection Level, and a (UNICODE_STRING) Debug Authorization.

Since it is possible to craft policy files (via XML or PowerShell scripting), Step 3 is not a problem. Neither is Step 2, as the DeviceUnlockId can be forged with the syscall `NtSetSystemEnvironmentValueEx({EAEC226F-C9A3-477A-A826-DDC716CDC0E3})` as long as we have the SeSystemEnvironmentPrivilege privilege. However, it should be noted that the UnlockId is a volatile value that will be restored upon reboot.

![Forging UnLockId](/assets/images/deep-dive-into-the-ttd-ecosystem/image26.jpg)

However, bypassing Step 1 is virtually impossible, as it requires : - to own the private key for a Microsoft-owned certificates with the particular [OID 1.3.6.1.4.1.311.10.3.6](http://oid-info.com/get/1.3.6.1.4.1.311.10.3.6)(i.e. - MS NT5 Lab (szOID_NT5_CRYPTO)) - and that the aforementioned certificate must not be revoked or expired

So, where does that leave us? We have now confirmed that, contrary to conventional wisdom, PPL processes can be opened by another process without the extra step of loading a kernel driver. However, it should also be stressed that such a use case is niche, since only Microsoft (literally) holds the keys to using this technique for very targeted machines. Nevertheless, such a case is still a great example of an air gap use of CI for debugging purposes.

## Offensive TTD

_Note: As a reminder, TTD.exe requires elevated privileges which all of the techniques discussed below assume._

Throughout this research, we discovered some potentially interesting offensive and defensive use cases of TTD.

### Tracing != Debugging

TTD is not a debugger! Therefore, it will work perfectly undetected for processes that perform a basic anti-debugging check, like using IsDebuggerPresent() (or any other way that depends on PEB.BeingDebugged). The following screenshot illustrates this detail by making TTD attach to a simple notepad process:

![Attaching to Notepad.exe with TTD](/assets/images/deep-dive-into-the-ttd-ecosystem/image1.jpg)

From a debugger we can check the BeingDebugged field located in the notepad PEB, which shows that the flag is not set:

![Verifying Notepad.exe BeingDebugged reports unset](/assets/images/deep-dive-into-the-ttd-ecosystem/image21.jpg)

### The curious case of ProcLaunchMon

Another interesting trick made available by TTD is abusing the built-in Windows driver ProcLaunchMon.sys. When running as a service (i.e. TTDService.exe), ttdrecord.dll will create the service instance, load the driver, and communicate with the device available at \.\com_microsoft_idna_ProcLaunchMon to register newly traced clients.

The driver itself will be used to monitor new processes created by the TTD service and then suspend those processes directly from the kernel, thus bypassing any protection that solely monitors process creation with the creation flag CREATE_SUSPENDED (as mentioned [here](https://attack.mitre.org/techniques/T1055/012/#detection) for instance). We developed a basic Device Driver client for this research, which can be found [here](https://gist.github.com/calladoum-elastic/328068f19e60a76b00f20cdb936cd078).

![Using ProcLaunchMon to monitor Notepad.exe](/assets/images/deep-dive-into-the-ttd-ecosystem/image3.jpg)

### CreateDump.exe

Another fun fact: even though it is not strictly part of TTD, the WinDbgX package provides a .NET signed binary whose name perfectly summarizes its functionality: createdump.exe. This binary is located at "C:\Program Files\WindowsApps\Microsoft.WinDbg\_\*\createdump.exe".

![CreateDump.exe metadata](/assets/images/deep-dive-into-the-ttd-ecosystem/image9.jpg)

This binary can be used to snapshot and dump the context of a process provided as an argument, in the direct lineage of other [LOLBAS](https://lolbas-project.github.io).

![Using CreateDump.exe to interact with LSASS](/assets/images/deep-dive-into-the-ttd-ecosystem/image22.jpg)

This once more highlights the need to avoid relying on static signatures and filename blocklist entries to protect against attacks such as credential dumping and favor more robust approaches such as [RunAsPPL](https://docs.microsoft.com/en-us/windows-server/security/credentials-protection-and-management/configuring-additional-lsa-protection), [Credential Guard](https://docs.microsoft.com/en-us/windows/security/identity-protection/credential-guard/credential-guard-manage), or [Elastic Endpoint’s Credential Hardening](https://www.elastic.co/guide/en/security/current/whats-new.html#_endpoint_enhancements).

## Defensive TTD

### Blocking TTD

Though TTD is an extremely useful feature, cases where it would be required to be enabled on non-development or test machines (such as production servers or workstations) are rare. Even though this seems largely undocumented at the time of this writing, ttdrecord.dll allows an early exit scenario by simply creating or updating a registry key located under "HKEY_LOCAL_MACHINE\Software\Microsoft\TTD", and updating the DWORD32 value RecordingPolicy to 2. Further attempts to use any TTD service (TTD.exe, TTDInject.exe, TTDService.exe) will be stopped and an ETW event will be generated to track attempts.

![Using the Registry to interfere with TTD](/assets/images/deep-dive-into-the-ttd-ecosystem/image15.jpg)

### Detecting TTD

Preventing the use of TTD might be too extreme for all environments — however, several indicators exist for detecting the use of TTD. A process being traced has the following properties:

- One thread will be running the code from TTDRecordCPU.dll, which can be verified using a simple built-in Windows command: tasklist /m TTDRecordCPU.dll
- Even though this can be bypassed, the parent PID of the recorded process (or the first one, in case recursive tracing is enabled), would be TTD.exe itself:

![Monitoring TTD](/assets/images/deep-dive-into-the-ttd-ecosystem/image18.jpg)

- Also, the \_KPROCESS.InstrumentationCallback pointer would be set to land in the TTDRecordCPU.dll BSS section of the executable:

![IntrementationCallback](/assets/images/deep-dive-into-the-ttd-ecosystem/image25.jpg)

Therefore, detecting tracing from TTD can be achieved through both User-Mode and Kernel-Mode methods.

# Conclusion

This concludes the first part of this “On-Week” research focused on TTD. Digging into the internals of the TTD ecosystem revealed some very interesting, lesser-known mechanisms built-in to Windows, which are required to make TTD work for certain edge cases — such as the tracing of PPL processes.

Even though this research didn’t unveil a new secret backdoor for targeting PPL processes, it did show an unexplored technique built into Windows to do so. If anything, this research highlights the importance of a model based on strong cryptography (here through CI.dll), and how it can bring a lot of flexibility — while maintaining a high level of security — when implemented adequately.

The second part of this series will be less research-oriented and more hands-on with the release of a small tool we also developed as part of On-Week. This assists in the process of binary analysis through TTD, using the Windows Sandbox.

## Acknowledgement

As this research was already concluded and the article in progress, the author became aware of research that covered a similar subject and findings regarding that very same technique (PPL debugging token). That research was performed by Lucas George (from the company Synacktiv), who presented his findings at [SSTIC 2022](https://www.sstic.org/2022/presentation/supreme_ttd_-_that_s_my_ppl/).
