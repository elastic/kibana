---
title: "Detonating Beacons to Illuminate Detection Gaps"
slug: "detonating-beacons-to-illuminate-detection-gaps"
date: "2025-01-09"
description: "Learn how Elastic Security leveraged open-source BOFs to achieve detection engineering goals during our most recent ON week."
author:
  - slug: mika-ayenson
  - slug: miguel-garzon
  - slug: samir-bousseaden
image: "Security Labs Images 31.jpg"
category:
  - slug: security-research
---

At Elastic, we continuously strive to mature our detection engineering processes in scalable ways, leveraging creative approaches to validate and enhance our capabilities. We recently concluded a quarterly Elastic OnWeek event, which we convene quarterly and provides an opportunity to explore problems differently than our regular day-to-day. This time around, we explored the potential of using Beacon Object Files ([BOF](https://hstechdocs.helpsystems.com/manuals/cobaltstrike/current/userguide/content/topics/beacon-object-files_main.htm)) for detection *validation*. We wanted to know how BOFs, combined with Elastic’s internal Detonate Service and the Elastic AI Assistant for Security, could streamline our ability to identify gaps, improve detection coverage, and explore new detection engineering challenges. This builds on our other internal tools and validation efforts, making blue team development more efficient by directly leveraging the improvements in red team development efficiency.

## Tapping into OpenSource Red Team Contributions

The evolution of offensive tooling in cybersecurity reflects an ongoing arms race between red teams and defenders, marked by continuous innovation on both sides: 

* Initially, red teamers leveraged PowerShell, taking advantage of its deep integration with Windows to execute commands and scripts entirely in memory, avoiding traditional file-based operations.  
* This technique was countered by the introduction of the Antimalware Scan Interface ([AMSI](https://learn.microsoft.com/en-us/windows/win32/amsi/antimalware-scan-interface-portal)), which provided real-time inspection to prevent harmful activity.   
* Offensive operators adapted through obfuscation and version downgrades to bypass AMSI’s controls. The focus shifted to C\# and the .NET CLR (common language runtime), which offered robust capabilities for in-memory execution, evading inconvenient PowerShell-specific protections.   
* AMSI’s expansion to CLR-based scripts (C\#), prompted the development of tools like [Donut](https://thewover.github.io/Introducing-Donut/), converting .NET assemblies into shellcode to bypass AMSI checks.   
* With process injection becoming a prevalent technique for embedding code into legitimate processes, defenders introduced API hooking to monitor and block such activity.   
* To counter process and syscall detections, red teams migrated to fork-and-run techniques, creating ephemeral processes to execute payloads and quickly terminate, further reducing the detection footprint.   
* The latest innovation in this progression is the use of Beacon Object Files (BOFs), which execute lightweight payloads directly into an existing process’s memory, avoiding fork-and-run mechanisms and eliminating the need for runtime environments like the .NET CLR.

TL;DR: The evolution (EXE --> DLL --> reflective C++ DLL --> PowerShell -> reflective C# -> C BOF --> C++ BOF --> bytecode) was all about writing shellcode more efficiently, and running it with just enough stealth.

With a growing number of [BOF GitHub contributions](https://github.com/N7WEra/BofAllTheThings) covering multiple techniques, they are ideal for evaluating gaps and exploring procedure-level events. BOFs are generally small C-based programs that execute within the context of a COBALTSTRIKE BEACON agent. Since introduced, they’ve become a staple for red team operations. Even practitioners who don't use COBALTSTRIKE can take advantage of BOFs using third-party loaders, a great example of the ingenuity of the offensive research community. One example used in this exploration is [COFFLoader](https://github.com/trustedsec/COFFLoader), originally [introduced](https://www.trustedsec.com/blog/bofs-for-script-kiddies) in 2023 by TrustedSec, designed to load Common Object File Format (COFF) files. COFFs (the opened standard for BOFs), are essentially your compiled .o object files \- e.g. BOF with extra support for in-memory execution. Other more recent examples include the rust-based [Coffee](https://github.com/hakaioffsec/coffee) loader by Hakai Security and the GoLang-based implementation [Goffloader](https://github.com/praetorian-inc/goffloader) by Praetorian.  
Loading COFF/BOF objects have become a standard feature in many C2 frameworks such as Havoc, Metasploit, PoshC2, and Sliver, with some directly utilizing COFFLoader for execution. With little setup, prebuilt BOFs and a loader like COFFLoader can quickly enable researchers to test a wide range of specific techniques on their endpoints.

## Experimentation Powered by Detonate

Setting up and maintaining a robust system for BOF execution, VM endpoint testing, and Elastic Security’s Defend in a repeatable manner can be a significant engineering challenge, especially when isolating detonations, collecting results, and testing multiple samples. To streamline this process and make it as efficient as possible, Elastic built the internal Detonate service, which handles the heavy lifting and minimizes the operational overhead.

If you’re unfamiliar with Elastic’s Internal Detonate service, check out [Part 1 \- Click, Click…Boom\!](https://www.elastic.co/security-labs/click-click-boom-automating-protections-testing-with-detonate) where we introduce Detonate, why we built it, explore how Detonate works, describe case studies, and discuss efficacy testing. If you want a deeper dive, head over to [Part 2 \- Into The Weeds: How We Run Detonate](https://www.elastic.co/security-labs/into-the-weeds-how-we-run-detonate) where we describe the APIs leveraged to automate much of our exploration. It is important to note that Detonate is still a prototype, not yet an enterprise offering, and as such, we’re experimenting with its potential applications and fine-tuning its capabilities. 

For this ON week project, the complexity was distilled down to one API call that uploads and executes the BOF, and a subsequent optional second API call to fetch behavior alert results.

## Validating Behavior Detections via BOFs

We used automation for the tedious behind-the-scenes work because ON week is about the more interesting research findings, but we wanted to share some of the challenges and pain points of this kind of technology in case you're interested in building your own detonation framework. If you’re interested in following along in general, we’ll walk through some of the nuances and pain points.

![BOF Detonating Experimentation Pipeline](/assets/images/detonating-beacons-to-illuminate-detection-gaps/image4.png)

At a high level, this depicts an overview of the different components integrated into the automation. All of the core logic was centralized into a simple CLI POC tool to help manage the different phases of the experiment. 

## Framing a Proof of Concept

The CLI provides sample commands to analyze a sample BOF’s .c source file, execute BOF’s within our Detonate environment, monitor specific GitHub repositories for BOF changes, and show detonation results with query recommendations if they’re available.  

![Sample PoC Commands](/assets/images/detonating-beacons-to-illuminate-detection-gaps/image6.png)

### Scraping and Preprocessing BOFs \- Phases 1 and 2

For a quickstart guide, navigate to [BofAllTheThings](https://github.com/N7WEra/BofAllTheThings), which includes several GitHub repositories worth starting with. The list isn’t actively maintained, so with some Github [topic searches for `bof`](https://github.com/topics/bof), you may encounter more consistently updated examples like [nanodump](https://github.com/fortra/nanodump). 

Standardizing BOFs to follow a common format significantly improves the experimentation and repeatability. Different authors name their `.c` source and `.o` BOF files differently so to streamline the research process, we followed TrustedSec’s [CONTRIBUTING](https://github.com/trustedsec/CS-Situational-Awareness-BOF/blob/master/CONTRIBUTING.md) guide and file conventions to consistently name files and place them in a common folder structure. We generally skipped GitHub repositories that did not include source with their BOFs (because we wanted to be certain of what they were doing *before* executing them), and prioritized examples with Makefiles. As each technique was processed, they were manually formatted to follow the conventions (e.g. renaming the main `.c` file to `entry.c`, compiling with a matching file and directory name, etc.).

With the BOFs organized, we were able to parse the entry files, search for the `go` method that defines the key functions and arguments. We parse these arguments and convert them to hex, similarly to the way [beacon\_generate.py](https://github.com/trustedsec/COFFLoader/blob/main/beacon_generate.py) does, before shipping the BOF and all accompanying materials to Detonate.

![Sample Generated BOF Arguments](/assets/images/detonating-beacons-to-illuminate-detection-gaps/image2.png)

After preprocessing the arguments, we stored them locally in a `json` file and retrieved the contents whenever we wanted to detonate the BOF or all BOFs.

### Submitting Detonations \- Phase 3

There is a `detonate` command and `detonate-all` that uploads the local BOF to the Detonate VM instance with the arguments. When a Detonate task is created, metadata about the BOF job is stored locally so that results can be retrieved later.  
   
![Netuser BOF Detonation](/assets/images/detonating-beacons-to-illuminate-detection-gaps/image3.png)

For detection engineering and regression testing, detonating all BOF files enables us to submit a periodic long-lasting job, starting with deploying and configuring virtual machines and ending with submitting generative AI completions for detection recommendations.

### BOF Detonate Examples 

Up to this point, the setup is primarily a security research engineering effort. The detection engineering aspect begins when we can start analyzing results, investigating gaps, and developing additional rules. Each BOF submitted is accompanied by a Detonate job that describes the commands executed, execution logs, and any detections. In these test cases, different detections appeared during different aspects of the test (potential shellcode injection, malware detection, etc.). The following BOFs were selected based on their specific requirements for arguments, which were generated using the [beacon\_generate.py](https://github.com/trustedsec/COFFLoader/blob/main/beacon_generate.py) script, as previously explained. Some BOFs require arguments to be passed to them during execution, and these arguments are crucial for tailoring the behaviour of the BOF to the specific test case scenario. The table below lists the BOFs explored in this section:

| BOF | Type of BOF  | Arguments Expected  |
| :---- | :---- | :---- |
| netuser | Enumeration | \[username\] \[opt: domain\] |
| portscan | Enumeration | \[ipv4\] \[opt: port\] |
| Elevate-System-Trusted-BOF | Privilege Escalation | None |
| etw | Logging Manipulation | None |
| RegistryPersistence | Persistence | None  (See notes below) |

BOF Used: [PortScan](https://github.com/rvrsh3ll/BOF_Collection/tree/master/Network/PortScan)   
Purpose: Enumeration technique that scans a single port on a remote host.

![BOF Detonation: PortScan](/assets/images/detonating-beacons-to-illuminate-detection-gaps/image9.png)

The detonation log shows expected output of `COFFLoader64.exe` loading the `portscan.x64.o` sample, showing that port `22` was not open as expected on the test machine. Note: In this example two detections were triggered in comparison to the `netuser` BOF execution.

BOF Used: [Elevate-System-Trusted-BOF](https://github.com/Mr-Un1k0d3r/Elevate-System-Trusted-BOF)  
Purpose: This BOF can be used to elevate the current beacon to SYSTEM and obtain the TrustedInstaller group privilege. The impersonation is done through the `SetThreadToken` API.  

![BOF Detonation: Elevate-System-Trusted-BOF](/assets/images/detonating-beacons-to-illuminate-detection-gaps/image1.png)

The detonation log shows expected output of `COFFLoader64.exe` successfully loading and executing the `elevate_system.x64.o` BOF. The log confirms the BOF’s intended behavior, elevating the process to SYSTEM and granting the TrustedInstaller group privilege. This operation, leveraging the `SetThreadToken` function, demonstrates privilege escalation effectively.

BOF Used: [ETW](https://github.com/ajpc500/BOFs/tree/main/ETW)  
Purpose: Simple Beacon object file to patch (and revert) the `EtwEventWrite` function in `ntdll.dll` to degrade ETW-based logging. Check out the [Kernel ETW](https://www.elastic.co/security-labs/kernel-etw-best-etw) and [Kernel ETW Call Stack](https://www.elastic.co/security-labs/doubling-down-etw-callstacks) material for more details.  

![BOF Detonation: ETW](/assets/images/detonating-beacons-to-illuminate-detection-gaps/image11.png)

The detonation log confirms the successful execution of the `etw.x64.o` BOF using `COFFLoader64.exe`. This BOF manipulates the `EtwEventWrite` function in `ntdll.dll` to degrade ETW-based logging. The log verifies the BOF’s capability to disable key telemetry temporarily, a common defense evasion tactic.

BOF Used: [RegistryPersistence](https://github.com/rvrsh3ll/BOF_Collection/tree/master/Persistence)  
Purpose: Installs persistence in Windows systems by adding an entry under `HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run`. The persistence works by running a PowerShell command (dummy payload in this case) on startup via the registry. In the case of the RegistryPersistence BOF, the source code (.C) was modified so that the registry entry under `HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run` would be created if it did not already exist. Additionally, debugging messages were added to the code, which print to the Beacon’s output using the `BeaconPrintf` function, aiding in monitoring and troubleshooting the persistence mechanism during execution.

![BOF Detonation: RegistryPersistence](/assets/images/detonating-beacons-to-illuminate-detection-gaps/image1.png)

The detonation log displays the expected behavior of the `registrypersistence.x64.o` BOF. It successfully modifies the Windows registry under `HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run`, adding a persistence mechanism. The entry executes a PowerShell command (empty payload in this case) on system startup, validating the BOF’s intended persistence functionality.

### Showing Results \- Phase 4

Finally, the `show-results` command lists the outcomes of the BOFs; whether a behavior detection successfully caught the technique, and a recommended query to quickly illustrate key ECS fields to build into a robust detection (or use to tune an existing rule). BOFs that are detected by an existing behavior detection do not go through the additional query recommendation workflow.

![Query Recommendation Within Results](/assets/images/detonating-beacons-to-illuminate-detection-gaps/image10.png)

Fortunately, as described in [NEW in Elastic Security 8.15: Automatic Import, Gemini models, and AI Assistant APIs](https://www.elastic.co/blog/whats-new-elastic-security-8-15-0), the Elastic AI Assistant for Security exposes new capabilities to quickly generate a recommendation based on the context provided (by simply hitting the available [API](https://www.elastic.co/docs/api/doc/kibana/v8/operation/operation-performanonymizationfieldsbulkaction)). A simple HTTP request makes it easy to ship contextual information about the BOF and sample logs to ideate on possible improvements.

```conn.request("POST", "/api/security_ai_assistant/chat/complete", payload, headers)```

To assess the accuracy of the query recommendations, we employed a dataset of labeled scenarios and benign activities to establish a “ground truth” and evaluated how the query recommendations performed in distinguishing between legitimate and malicious activities. Additionally, the prompts used to generate the rules were iteratively tuned until a satisfactory response was generated, where the *expected* query closely aligned with the *actual* rule generated, ensuring that the AI Assistant provided relevant and accurate recommendations. 

In the netuser BOF example, the returned detonation data contained no existing detections but included events [4798](https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-10/security/threat-protection/auditing/event-4798), based on the BOF context (user enumeration) and the Windows 4798 event details the Elastic AI Assistant rightly recommended the use of that event for detection.

![Elastic Raw Events from BOF](/assets/images/detonating-beacons-to-illuminate-detection-gaps/image5.png)

## Additional Considerations

We’re continuing to explore creative ways to improve our detection engineering tradecraft. By integrating BOFs with Elastic’s Detonate Service and leveraging the Elastic Security Assistant, we’re able to streamline testing. This approach is designed to identify potential detection gaps and enable detection strategies. 

A key challenge for legacy SIEMs in detecting Beacon Object Files (BOFs) is their reliance on Windows Event Logging, which often fails to capture memory-only execution, reflective injection, or direct syscalls. Many BOF techniques are designed to bypass traditional logging, avoiding file creation and interactions with the Windows API.  As a result, security  solutions that rely solely on event logs are insufficient for detecting these sophisticated techniques. To effectively detect such threats, organizations need more advanced EDRs, like Elastic Defend, that offer visibility into injection methods, memory manipulation, system calls, process hollowing, and other evasive tactics. 

Developing a fully supported BOF experimentation and research pipeline requires *substantial* effort to cover the dependencies of each technique. For example:

* Lateral Movement: Requires additional test nodes  
* Data Exfiltration: Requires network communication connectivity  
* Complex BOFs: May require extra dependencies, precondition arguments, and multistep executions prior to running the BOF. These additional steps are typically commands organized in the C2 Framework (e.g. `.cna` sleep script)

Elastic, at its core, is open. This research illustrates this philosophy, and collaboration with the open-source community is an important way we support evolving detection engineering requirements. We are committed to refining our methodologies and sharing our lessons learned to strengthen the collective defense of enterprises. We’re more capable together.

We’re always interested in hearing about new use cases or workflows, so reach out to us via [GitHub issues](https://github.com/elastic/detection-rules/issues), chat with us in our [community Slack](http://ela.st/slack), and ask questions in our [Discuss forums](https://discuss.elastic.co/c/security/endpoint-security/80). Learn more about detection engineering the Elastic way using the [DEBMM](https://www.elastic.co/security-labs/elastic-releases-debmm). You can see the technology we leverage for this research and more by checking out [Elastic Security](https://www.elastic.co/security).

*The release and timing of any features or functionality described in this post remain at Elastic's sole discretion. Any features or functionality not currently available may not be delivered on time or at all.*
