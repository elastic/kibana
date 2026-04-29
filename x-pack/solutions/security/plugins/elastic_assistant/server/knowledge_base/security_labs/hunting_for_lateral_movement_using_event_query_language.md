---
title: "Hunting for Lateral Movement using Event Query Language"
slug: "hunting-for-lateral-movement-using-event-query-language"
date: "2023-03-01"
description: "Elastic Event Query Language (EQL) correlation capabilities enable practitioners to capture complex behavior for adversary Lateral Movement techniques. Learn how to detect a variety of such techniques in this blog post."
author:
  - slug: samir-bousseaden
image: "blog-thumb-security-honeycomb.jpg"
category:
  - slug: security-operations
  - slug: detection-science
---

[Lateral Movement](https://attack.mitre.org/tactics/TA0008/) describes techniques that adversaries use to pivot through multiple systems and accounts to improve access to an environment and subsequently get closer to their objective. Adversaries might install their own remote access tools to accomplish Lateral Movement, or use stolen credentials with native network and operating system tools that may be stealthier in blending in with normal systems administration activity.

Detecting Lateral Movement behaviors often involves the design of detections at both the source and the target system, as well as the correlation of more than one type of event (such as network events with process execution events) in order to capture the remote execution context.

In this blog, we explore some examples of techniques and leverage the capabilities of Elastic’s [Event Query Language (EQL)](https://www.elastic.co/guide/en/elasticsearch/reference/master/eql.html) to design behavioral hunts and detections.

## **How Lateral Movement works**

Lateral Movement is usually composed of the following high-level steps:

1. Remote authentication to the target host (valid access credentials are required)
2. Staging the command to execute to the remote host or to another resource accessible by the target host such as internet URL or a Network File Share
3. Remotely triggering the execution (immediate or scheduled) of the staged program on the target host via accessible remote services and protocols ([Service](https://docs.microsoft.com/en-us/openspecs/windows_protocols/ms-scmr/705b624a-13de-43cc-b8a2-99573da3635f), [Task Scheduler](https://docs.microsoft.com/en-us/windows/win32/taskschd/task-scheduler-start-page), [WinRM](https://docs.microsoft.com/en-us/windows/win32/winrm/portal), [WMI](https://docs.microsoft.com/en-us/windows/win32/wmisdk/wmi-start-page), [Remote Registry](https://docs.microsoft.com/en-us/openspecs/windows_protocols/ms-rrp/0fa3191d-bb79-490a-81bd-54c2601b7a78)).
4. Clean up the staged payload and any other relevant artifacts to avoid suspicion (optional)

Note that staging a program (step 2) is not always necessary, as there are usually exposed services that allow for remote interaction with the target host such as [PowerShell Remoting](https://docs.microsoft.com/en-us/powershell/scripting/learn/remoting/running-remote-commands?view=powershell-7.1) and [Remote Desktop (RDP)](https://docs.microsoft.com/en-us/windows-server/remote/remote-desktop-services/clients/remote-desktop-clients).

## **Lateral Tool Transfer**

Files may be copied from one system to another to stage adversary tools or other files over the course of an operation. A commonly abused vector is [SMB/Windows Admin Shares](https://attack.mitre.org/techniques/T1570/) via the use of built-in system commands such as copy, move copy-item, and others:

![cmd-running-as-local-host-blog-hunting-lateral-movement.jpg](/assets/images/hunting-for-lateral-movement-using-event-query-language/cmd-running-as-local-host-blog-hunting-lateral-movement.jpg)

_Figure 1: File copy via system command_

From the source machine, there are alternative methods of copying the file without having to execute suspicious commands. Still, it’s important to look for low-hanging detection opportunities.

Figure 2 below shows an EQL query that looks for the following behavior that is consistent with an attacker transferring a file to a remote host:

- Execution of a command interpreter with a [process.args](https://www.elastic.co/guide/en/ecs/current/ecs-process.html#field-process-args) keyword array related to file copy (copy, move) and a hidden file share (prefixed by a $ sign such as c$ admin$)
- Staging data from a shadow copy volume (often associated with credential access via staging of [NTDS.dit](https://attack.mitre.org/techniques/T1003/003/) or [Registry SAM](https://attack.mitre.org/techniques/T1003/002/) key to access stored account password hashes)

![2-hunting-eql-file-transfer-blog-hunting-lateral-movement.jpg](/assets/images/hunting-for-lateral-movement-using-event-query-language/2-hunting-eql-file-transfer-blog-hunting-lateral-movement.jpg)

_Figure 2: Hunting EQL for file transfer via hidden file share from source machine_

On the target machine, we’ve observed that all files copied via server message block (SMB) are represented by a file creation event by the virtual process System (always has a static [process.pid](https://www.elastic.co/guide/en/ecs/current/ecs-process.html#field-process-pid) value equal to 4 and represents the Windows kernel code and loaded kernel mode drivers):

![3-file-creation-discover-view-blog-hunting-lateral-movement.jpg](/assets/images/hunting-for-lateral-movement-using-event-query-language/3-file-creation-discover-view-blog-hunting-lateral-movement.jpg)

_Figure 3: File creation event details depicted in Kibana’s Discover view as a result of file transfer over SMB_

A file creation event alone is not enough (the System process may create files that are related to local activity) to conclude that this activity pertains to a Lateral Movement attempt. Thus, we need to correlate it with _incoming_ SMB network events by the same process:

![4-hidden-file-share-blog-hunting-lateral-movement.jpg](/assets/images/hunting-for-lateral-movement-using-event-query-language/4-hidden-file-share-blog-hunting-lateral-movement.jpg)

_Figure 4: Hunting EQL for file transfer via hidden file share from target host_

The above query looks for an incoming remote network event to tcp port 445 (SMB) followed by immediate file creation or modification (can be limited to executable file extension to reduce false positives) and both events are performed by the same ([process.entity_id](https://www.elastic.co/guide/en/ecs/current/ecs-process.html#field-process-entity-id)) virtual System process.

![5-lateral-tool-transfer-blog-hunting-lateral-movement.jpg](/assets/images/hunting-for-lateral-movement-using-event-query-language/5-lateral-tool-transfer-blog-hunting-lateral-movement.jpg)

_Figure 5: Detection alert example for Lateral Tool Transfer from target host_

The above alert contains details about the file that was copied as well as the [source.ip](https://www.elastic.co/guide/en/ecs/current/ecs-source.html#field-source-ip) address of the Lateral Movement activity. The same logic triggers on [PSExec](https://www.ired.team/offensive-security/lateral-movement/lateral-movement-with-psexec), a remote execution utility often abused by adversaries for the same purpose:

![6-triggering-psexec-blog-hunting-lateral-movement.jpg](/assets/images/hunting-for-lateral-movement-using-event-query-language/6-triggering-psexec-blog-hunting-lateral-movement.jpg)

_Figure 6: Lateral Tool Transfer triggering on PSEXEC from target host_

We can also leverage [EQL correlation](https://www.elastic.co/guide/en/elasticsearch/reference/current/eql-syntax.html#eql-sequences) to capture instances where a file that was copied via SMB is immediately executed:

![7-execution-via-file-shares-blog-hunting-lateral-movement.jpg](/assets/images/hunting-for-lateral-movement-using-event-query-language/7-execution-via-file-shares-blog-hunting-lateral-movement.jpg)

_Figure 7: Hunting EQL for remote execution via file shares_

The above EQL looks for a [sequence](https://www.elastic.co/guide/en/elasticsearch/reference/current/eql-syntax.html#eql-sequences) of events where a file is created/modified by the virtual System process followed by a process event where the [process.executable](https://www.elastic.co/guide/en/ecs/current/ecs-process.html#field-process-executable) is equal to the [file.path](https://www.elastic.co/guide/en/ecs/current/ecs-file.html#field-file-path). Below is an alert example:

![8-remote-execution-blog-hunting-lateral-movement.jpg](/assets/images/hunting-for-lateral-movement-using-event-query-language/8-remote-execution-blog-hunting-lateral-movement.jpg)

_Figure 8: Detection alert for remote execution via file shares from target host_

Another example where file transfer over SMB can be abused for remote execution is copying a malicious executable, script, or shortcut to the [Startup folder](https://attack.mitre.org/techniques/T1547/001/) of a target host. This will cause the program referenced to be automatically executed when a user logs in, and in the context of that user:

![9-startup-folder-blog-hunting-lateral-movement.jpg](/assets/images/hunting-for-lateral-movement-using-event-query-language/9-startup-folder-blog-hunting-lateral-movement.jpg)

_Figure 9: Hunting EQL for Lateral Movement via startup folder_

Below is an example of a detection alert for Lateral Movement via the [Startup folder](https://attack.mitre.org/techniques/T1547/001/):

![10-detection-alert-blog-hunting-lateral-movement.jpg](/assets/images/hunting-for-lateral-movement-using-event-query-language/10-detection-alert-blog-hunting-lateral-movement.jpg)

_Figure 10: Detection alert for Lateral Movement via startup folder_

## **Remotely Scheduled Tasks**

Adversaries may leverage scheduled tasks for remote execution — either via built-in system utilities such as schtasks.exe or directly via the [Task Scheduler API](https://docs.microsoft.com/en-us/windows/win32/api/_taskschd/), which may be stealthier because visibility is limited.

Below is an example of remote task creation via the [MoveScheduler](https://github.com/mez-0/MoveScheduler) penetration testing tool:

![11-movescheduler-blog-hunting-lateral-movement.jpg](/assets/images/hunting-for-lateral-movement-using-event-query-language/11-movescheduler-blog-hunting-lateral-movement.jpg)

Figure 11: Lateral Movement via MoveScheduler

Both schtasks.exe and direct usage of a custom implementation will cause a process to load the Task Scheduler COM API (taskschd.dll), followed by an outbound network connection where both the [source.port](https://www.elastic.co/guide/en/ecs/current/ecs-source.html#field-source-ip) and the [destination.port](https://www.elastic.co/guide/en/ecs/current/ecs-destination.html#field-destination-port) are equal or greater than RPC dynamic ports (49152 to 65535) and from the same [process.entity_id](https://www.elastic.co/guide/en/ecs/current/ecs-process.html#field-process-entity-id), which can be translated to this [EQL](https://www.elastic.co/guide/en/elasticsearch/reference/master/eql.html) query:

![12-outbound-task-blog-hunting-lateral-movement.png](/assets/images/hunting-for-lateral-movement-using-event-query-language/12-outbound-task-blog-hunting-lateral-movement.png)

_Figure 12: Hunting EQL query for outbound task scheduler activity on source host_

Of course, matches to this query can be related to scheduled tasks discovery as well. Below is an example of an alert where we can observe the username, source, and destination IP, as well as the process name used to perform a remote task activity:

![13-detection-alert-lateral-movement-blog-hunting-lateral-movement.jpg](/assets/images/hunting-for-lateral-movement-using-event-query-language/13-detection-alert-lateral-movement-blog-hunting-lateral-movement.jpg)

_Figure 13: Detection alert for Lateral Movement via Scheduled Task on source host_

On the _target_ host, we can hunt for remote scheduled task creation/modification via two options:

1. Incoming [DCE/RPC](https://docs.microsoft.com/en-us/openspecs/windows_protocols/ms-rpce/290c38b1-92fe-4229-91e6-4fc376610c15) (over TCP/IP) network event by the Task Scheduler service (svchost.exe) followed by a file creation of a task XML configuration file (C:\\Windows\\System32\\Tasks\\task_filename)
2. Incoming [DCE/RPC](https://docs.microsoft.com/en-us/openspecs/windows_protocols/ms-rpce/290c38b1-92fe-4229-91e6-4fc376610c15) (over TCP/IP) network event by the Task Scheduler service (svchost.exe) followed by a registry change of a task cache Action value (HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Schedule\\TaskCache\\Tasks\\\{GUID\}\\Actions)

Option A provides us with the task name (equal to the [file.name](https://www.elastic.co/guide/en/ecs/current/ecs-file.html#field-file-name) of the changed/created file), and Option B provides us with the task action itself (equal to the base64 decoded data of the Action registry value where the task scheduler service caches the task action configuration):

![14-task-creation-blog-hunting-lateral-movement.jpg](/assets/images/hunting-for-lateral-movement-using-event-query-language/14-task-creation-blog-hunting-lateral-movement.jpg)

_Figure 14: Hunting EQL query for task creation on target host (Option A)_

![15-hunting-eql-blog-hunting-lateral-movement.jpg](/assets/images/hunting-for-lateral-movement-using-event-query-language/15-hunting-eql-blog-hunting-lateral-movement.jpg)

_Figure 15: Hunting EQL query for task creation on target host (Option B)_

Option B has the advantage of providing details about the task action, which tend to be useful while triaging (set to execute a program from a [suspicious path](https://github.com/elastic/detection-rules/blob/main/rules/windows/execution_from_unusual_path_cmdline.toml), [LOLBAS](https://lolbas-project.github.io/) process, etc.).

![16-detection-alert-blog-hunting-lateral-movement.jpg](/assets/images/hunting-for-lateral-movement-using-event-query-language/16-detection-alert-blog-hunting-lateral-movement.jpg)

_Figure 16: Detection alert for Lateral Movement via Scheduled Task on target host_

Decoding the registry Action base64 encoded data provides us details about the created task action:

![17-base64-blog-hunting-lateral-movement.png](/assets/images/hunting-for-lateral-movement-using-event-query-language/17-base64-blog-hunting-lateral-movement.png)

_Figure 17: Base64 decoded data of the scheduled task action registry value_

## **Remote Registry**

Adversaries may leverage the Remote Registry service for defense evasion or remote execution. One simple scenario is to modify the Run key registry on a remote system to cause the execution of a program upon system startup or user logon:

![18-remote-modification-blog-hunting-lateral-movement.jpg](/assets/images/hunting-for-lateral-movement-using-event-query-language/18-remote-modification-blog-hunting-lateral-movement.jpg)

_Figure 18: Remote modification of the Run registry key via reg utility_

We can hunt for this behavior from the source machine by looking for the execution of reg.exe with process.args containing \\\*, but the same action can be achieved via API calls avoiding [process .command_line](https://www.elastic.co/guide/en/ecs/current/ecs-process.html#field-process-command-line)-based detections.

![19-reg-exe-blog-hunting-lateral-movement.jpg](/assets/images/hunting-for-lateral-movement-using-event-query-language/19-reg-exe-blog-hunting-lateral-movement.jpg)

_Figure 19: Example of Reg.exe process execution event on source host_

Note that Reg.exe is not performing any network connection — instead, it’s the virtual System process that issues an outbound network connection to the target host on port 445 ([DCE/RPC](https://docs.microsoft.com/en-us/openspecs/windows_protocols/ms-rpce/290c38b1-92fe-4229-91e6-4fc376610c15) over SMB).

On the target host we can see the following sequence of key events:

1. Incoming network connection on tcp port 445 ([DCE/RPC](https://docs.microsoft.com/en-us/openspecs/windows_protocols/ms-rpce/290c38b1-92fe-4229-91e6-4fc376610c15) over SMB) by the virtual System process ([process.pid](https://www.elastic.co/guide/en/ecs/current/ecs-process.html#field-process-pid) equal 4)
2. RemoteRegistry service process starts (svchost.exe with [process.args](https://www.elastic.co/guide/en/ecs/current/ecs-process.html#field-process-args) containing the string RemoteRegistry)
3. RemoteRegistry service process performs the registry change

![20-remote-registry-blog-hunting-lateral-movement.jpg](/assets/images/hunting-for-lateral-movement-using-event-query-language/20-remote-registry-blog-hunting-lateral-movement.jpg)

_Figure 20: Remote Registry-relevant events on target host_

The following [EQL](https://www.elastic.co/guide/en/elasticsearch/reference/master/eql.html) hunt can be used to correlate (2) and (3) by [host.id](https://www.elastic.co/guide/en/ecs/current/ecs-host.html#field-host-id) and [process.entity_id](https://www.elastic.co/guide/en/ecs/current/ecs-process.html#field-process-entity-id) of the Remote Registry service:

![21-remote-registry-blog-hunting-lateral-movement.png](/assets/images/hunting-for-lateral-movement-using-event-query-language/21-remote-registry-blog-hunting-lateral-movement.png)

_Figure 21: Hunting EQL to detect Remote Registry modification via Regsvc on target host_

If we include (1) in the above [sequence](https://www.elastic.co/guide/en/elasticsearch/reference/current/eql-syntax.html#eql-sequences) to capture the [source.ip](https://www.elastic.co/guide/en/ecs/current/ecs-source.html#field-source-ip) address, it may trigger on unrelated incoming SMB connections as the only common element between the three events limited to the [host.id](https://www.elastic.co/guide/en/ecs/current/ecs-host.html#field-host-id) value.

![22-regsvc-blog-hunting-lateral-movement.jpg](/assets/images/hunting-for-lateral-movement-using-event-query-language/22-regsvc-blog-hunting-lateral-movement.jpg)

_Figure 22: Detection alert for Remote Registry modification via Regsvc on target host_

Adversaries may attempt to achieve the same outcome via the Windows Management Instrumentation (WMI) registry provider ([StdReg](https://docs.microsoft.com/en-us/previous-versions/windows/desktop/regprov/stdregprov)), which behaves differently:

1. WMI Service (svchost.exe with [process.args](https://www.elastic.co/guide/en/ecs/current/ecs-process.html#field-process-args) containing Winmgmt string) accepts an incoming [DCE/RPC](https://docs.microsoft.com/en-us/openspecs/windows_protocols/ms-rpce/290c38b1-92fe-4229-91e6-4fc376610c15) (over TCP/IP) network connection where both [source.port](https://www.elastic.co/guide/en/ecs/current/ecs-source.html#field-source-ip) and the [destination.port](https://www.elastic.co/guide/en/ecs/current/ecs-destination.html#field-destination-port) are greater than or equal to RPC dynamic ports ( 49152 to 65535)
2. A new instance of the WMI Provider Host (process.name equal to WmiPrvSe.exe with [user.name](https://www.elastic.co/guide/en/ecs/current/ecs-user.html#field-user-name) equal to Local Service or [user.id](https://www.elastic.co/guide/en/ecs/current/ecs-user.html#field-user-id) equal to S-1-5-19) is started
3. The started WMI Provider Host loads the registry provider StdProv.dll module
4. The WMI Provider Host performs the registry change

We can express the correlation of (1), (2) and (4) with the following hunting [EQL](https://www.elastic.co/guide/en/elasticsearch/reference/master/eql.html):

![23-hunting-eql-blog-hunting-lateral-movement.png](/assets/images/hunting-for-lateral-movement-using-event-query-language/23-hunting-eql-blog-hunting-lateral-movement.png)

_Figure 23: Hunting EQL for Remote Registry modification via Regsvc on target host_

If logging of the StdProv.dll module loading is enabled, we can also add (3) to the [sequence](https://www.elastic.co/guide/en/elasticsearch/reference/current/eql-syntax.html#eql-sequences) to reduce potential false positives:

![24-hunting-eql-blog-hunting-lateral-movement.png](/assets/images/hunting-for-lateral-movement-using-event-query-language/24-hunting-eql-blog-hunting-lateral-movement.png)

_Figure 24: Hunting EQL for Remote Registry modification via Regsvc on target host (library event)_

Below an example of a detection alert where we can see the remotely modified registry details and the remote [source.ip](https://www.elastic.co/guide/en/ecs/current/ecs-source.html#field-source-ip):

![25-remote-registry-blog-hunting-lateral-movement.jpg](/assets/images/hunting-for-lateral-movement-using-event-query-language/25-remote-registry-blog-hunting-lateral-movement.jpg)

_Figure 25: Detection alert for Remote Registry modification via the WMI on target host_

## **Sharp Remote Desktop**

[SharpRDP](https://posts.specterops.io/revisiting-remote-desktop-lateral-movement-8fb905cb46c3) is a Lateral Movement tool that leverages the Remote Desktop Protocol (RDP) for authenticated command execution and without the need for graphical interaction.

Once authenticated, SharpRDP sends [virtual keystrokes](https://docs.microsoft.com/en-us/windows/win32/inputdev/virtual-key-codes) to the remote system via a method called [SendKeys](https://docs.microsoft.com/en-us/windows/win32/termserv/imsrdpclientnonscriptable-sendkeys) to open up a [Run dialog](https://www.groovypost.com/howto/howto/use-windows-key-r-run-as-administrator/) on the target host and then enter a specified command, which will be executed on the target host.

The main indicator from the source host is an unusual process (hosting SharpRDP code) loading the Remote Desktop Services ActiveX Client that implements RDP client functionality (MsTscAx.dll) followed by an outbound network connection to RDP tcp port 3389 and both events from the same [process.entity_id](https://www.elastic.co/guide/en/ecs/current/ecs-process.html#field-process-entity-id):

![26-suspicious-rdp-client-blog-hunting-lateral-movement.jpg](/assets/images/hunting-for-lateral-movement-using-event-query-language/26-suspicious-rdp-client-blog-hunting-lateral-movement.jpg)

_Figure 26: Hunting EQL for suspicious RDP Client_

Below an example of results matching our hunting EQL where we can see an unusual process (other than mstsc.exe and similar known RDP clients) loading the Remote Desktop Services ActiveX Client (MsTscAx.dll) as well as the outbound network connection:

![27-results-example-blog-hunting-lateral-movement.jpg](/assets/images/hunting-for-lateral-movement-using-event-query-language/27-results-example-blog-hunting-lateral-movement.jpg)

_Figure 27: Results example for suspicious RDP Client EQL hunt_

On the target host, the following key events occur within a one-minute time window:

1. An incoming network connection is accepted by the RDP service (TermService svchost.exe) on port 3389
2. Under the [RunMRU](https://resources.infosecinstitute.com/topics/digital-forensics/understanding-critical-windows-artifacts-and-their-relevance-during-investigation-part-2/) registry key, a new (or update to an existing) string value is set to cmd, powershell, taskmgr or tsclient (depending on the chosen SharpRDP [execution method](https://github.com/0xthirteen/SharpRDP)), which is caused by the typed command in the [Run dialog](https://www.groovypost.com/howto/howto/use-windows-key-r-run-as-administrator/) via the [SendKeys](https://docs.microsoft.com/en-us/windows/win32/termserv/imsrdpclientnonscriptable-sendkeys) method
3. Depending on the execution [method](https://github.com/0xthirteen/SharpRDP), a new process (attacker command) is created with [process.parent.name](https://www.elastic.co/guide/en/ecs/current/ecs-process.html) of cmd.exe, powershell.exe, taskmgr.exe, or a random executable running from the [tsclient](https://www.virtualizationhowto.com/2016/07/map-network-drive-remote-desktop-local-computer/) mountpoint (shared drive from the RDP client host with the RDP target server)

For (2), note that when running anything from the [Run dialog](https://www.groovypost.com/howto/howto/use-windows-key-r-run-as-administrator/), a registry entry will be created at HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\RunMRU showing what was entered into the [Run dialog](https://www.groovypost.com/howto/howto/use-windows-key-r-run-as-administrator/) box.

The above [sequence](https://www.elastic.co/guide/en/elasticsearch/reference/current/eql-syntax.html#eql-sequences) of events can be expressed with the following [EQL](https://www.elastic.co/guide/en/elasticsearch/reference/master/eql.html):

![28-sharprdp-blog-hunting-lateral-movement.jpg](/assets/images/hunting-for-lateral-movement-using-event-query-language/28-sharprdp-blog-hunting-lateral-movement.jpg)

_Figure 28: Hunting EQL for SharpRDP behavior on the target host_

Example of a detection alert and its composing event details on the target host:

![29-detection-alert-blog-hunting-lateral-movement.jpg](/assets/images/hunting-for-lateral-movement-using-event-query-language/29-detection-alert-blog-hunting-lateral-movement.jpg)

_Figure 29: Detection alert for SharpRDP on target host (TermService network connection)_

![30-target-host-blog-hunting-lateral-movement.jpg](/assets/images/hunting-for-lateral-movement-using-event-query-language/30-target-host-blog-hunting-lateral-movement.jpg)

_Figure 30: Detection alert for SharpRDP on target host (RunMRU set to Powershell)_

![31-powershell-child-process-blog-hunting-lateral-movement.jpg](/assets/images/hunting-for-lateral-movement-using-event-query-language/31-powershell-child-process-blog-hunting-lateral-movement.jpg)

_Figure 31: Detection alert for SharpRDP on target host (PowerShell child process)_

## **Wrapping up**

[Event Query Language (EQL)](https://www.elastic.co/guide/en/elasticsearch/reference/master/eql.html) correlation capabilities enable us to capture complex behavior for a variety of Lateral Movement techniques. The high-level steps are:

1. **Understand the theory** and the building blocks of a certain technique (network protocols, loaded modules, services, process names, and arguments)
2. **Identify the key events** and their order that compose a certain behavior (both source and target host)
3. **Identify the common values** that can be used for correlation ([sequences](https://www.elastic.co/guide/en/elasticsearch/reference/current/eql-syntax.html#eql-sequences)) — identifying more commonalities can reduce false positives
4. **Identify enrichment possibilities** , such as extra events in the sequence that can be useful during alert triage
5. **Assess the window of time** for correlation — using a shorter time window (for example, 30 seconds instead of 1 second) can reduce false positives, but can also introduce false negatives caused by network latency or slow system
6. **Test using different methods and tools** and tune the hunting logic accordingly, or, in some instances, duplicate logic to capture edge cases

Some of the [EQL](https://www.elastic.co/guide/en/elasticsearch/reference/master/eql.html) detection rules used as examples can be found in the [Elastic detection-rules](https://github.com/elastic/detection-rules)repository:

- [Remote File Copy to a Hidden Share](https://github.com/elastic/detection-rules/blob/main/rules/windows/lateral_movement_remote_file_copy_hidden_share.toml)
- [Lateral Tool Transfer](https://github.com/elastic/detection-rules/blob/main/rules/windows/lateral_movement_executable_tool_transfer_smb.toml)
- [Remote Execution via File Shares](https://github.com/elastic/detection-rules/blob/main/rules/windows/lateral_movement_execution_via_file_shares_sequence.toml)
- [Lateral Movement via Startup Folder](https://github.com/elastic/detection-rules/blob/main/rules/windows/lateral_movement_via_startup_folder_rdp_smb.toml)
- [Outbound Scheduled Task Activity via PowerShell](https://github.com/elastic/detection-rules/blob/main/rules/windows/execution_scheduled_task_powershell_source.toml)
- [Remote Scheduled Task Creation](https://github.com/elastic/detection-rules/blob/main/rules/windows/lateral_movement_scheduled_task_target.toml)
- [Potential SharpRDP Behavior](https://github.com/elastic/detection-rules/blob/main/rules/windows/lateral_movement_rdp_sharprdp_target.toml)
- [Suspicious RDP ActiveX Client Loaded](https://github.com/elastic/detection-rules/blob/main/rules/windows/lateral_movement_suspicious_rdp_client_imageload.toml)
- [Execution via TSClient Mountpoint](https://github.com/elastic/detection-rules/blob/main/rules/windows/lateral_movement_execution_from_tsclient_mup.toml)

If you’re new to [Elastic Security](https://www.elastic.co/security), you can experience our latest version on [Elasticsearch Service](https://www.elastic.co/elasticsearch/service) on Elastic Cloud.
