---
title: "Practical security engineering: Stateful detection"
slug: "practical-security-engineering-stateful-detection"
date: "2022-06-01"
description: "By formalizing stateful detection in your rules, as well as your engineering process, you increase your detection coverage over future and past matches. In this blog post, learn why stateful detection is an important concept to implement."
author:
  - slug: samir-bousseaden
image: "blog-thumb-digital-shield.jpg"
category:
  - slug: security-research
---

Detection engineering at Elastic is both a set of reliable principles — or methodologies — and a collection of effective tools. In this series, we’ll share some of the foundational concepts that we’ve discovered over time to deliver resilient detection logic.

In this blog post, we will share a concept we call **stateful detection** and explain why it's important for detection.

## Detection states

The quickest way to get started may not always be the best, and new analysts tend to jump right into the post-exploitation details, mapping available data sources and logic fragments. Few consider that the state of a technique may influence visibility. The following three states illustrate one operations-focused approach:

- **Creation state** : Related to detecting suspicious or critical activity at the time of configuration or preparation (e.g., creation or modification of a new Run key registry value to detect new persistent programs)
- **Runtime state:** Related to detecting suspicious or critical activity at the moment of execution, which may be the result of an automated process (e.g., after a program was added to the HKLM RunOnce key, it will be executed as a child process of RunOnce.exe at system startup)
- **Cleanup state:** A special kind of runtime state related to detecting active and passive methods of covering tracks (files, registry deletion, and process termination are examples of needed telemetry; e.g., delete startup entry)

Many organizations tasked with creating detection logic focus on a given event creation state, though the following limitations are often overlooked.

- There will be detection gaps for known tactics, techniques, and procedures (TTPs) at execution. It’s likely you’re dealing with creation-state detection logic built for these TTPs, meaning you’re only finding this behavior after the fact.
- There will be detection gaps for techniques used by attackers who are diligent at tidying up their presence, as security operations tend to focus on detecting techniques in the earliest stages of an intrusion.
- The required telemetry, data, and logic for one technique may be different for each state and require enabling new telemetry or changing existing configurations.

The practical application of this concept is most effective for detecting techniques in tactic categories that focus on predictable outcomes such as persistence, defense evasion (e.g., abnormal memory type and protection for code injection), and command and control (unusual process network traffic).

To make this concept clearer, let's explore an example of designing detection logic in the [Persistence](https://attack.mitre.org/tactics/TA0003/) tactic category using [T1015 - Accessibility Features](https://attack.mitre.org/techniques/T1015/). Suppose an attacker has already enabled a backdoor to execute using this technique (via Image File Execution Options - Debugger registry value) months or weeks before you’ve implemented a detection for it.

![1-stateful-detection-engineering-blog-depiction-file-execution.jpg](/assets/images/practical-security-engineering-stateful-detection/1-stateful-detection-engineering-blog-depiction-file-execution.jpg)

_Figure 1: Depiction of image file execution options debugger abuse (1)_

Image File Execution Options (IFEO) are used for debugging legitimate applications, and can be abused by an attacker with at least local administrator privileges to execute a malicious program (instead of a legitimate one) via the Debugger setting. As shown in Figure 2, cmd.exe will be executed every time the on-screen keyboard (osk.exe) is invoked, providing the attacker a system shell backdoor.

![2-stateful-detection-engineering-blog-depiction-2-file_execution.jpg](/assets/images/practical-security-engineering-stateful-detection/2-stateful-detection-engineering-blog-depiction-2-file_execution.jpg)

_Figure 2: Depiction of image file execution options debugger abuse (2)_

## **Creation state**

At the time of creation, while configuring the Debugger value, detection primarily consists of monitoring a filtered subset of the registry for new references to accessibility features (e.g., osk.exe for the On-Screen Keyboard) and the registry value name Debugger. This technique is also effective for other accessibility features depicted in Figure 3.

![3-stateful-detection-engineering-blog-accessibility-features.png](/assets/images/practical-security-engineering-stateful-detection/3-stateful-detection-engineering-blog-accessibility-features.png)

_Figure 3: Accessibility features processes_

[EQL](https://www.elastic.co/guide/en/elasticsearch/reference/master/eql.html) is a language we can use to broadly describe **creation-state** detection events for any technique. Figure 4 depicts an EQL rule demonstrating one example that detects [accessibility features](https://attack.mitre.org/techniques/T1015/) using IFEO.

![4-stateful-detection-engineering-blog-t1015.png](/assets/images/practical-security-engineering-stateful-detection/4-stateful-detection-engineering-blog-t1015.png)

_Figure 4: T1015 - IFEO creation state EQL example_

## **Runtime state**

At the time of creation, that kind of EQL logic will help to detect the technique, but what if the configuration happened _weeks or months ago_? A different kind of EQL expression is better suited for detecting the technique in a runtime state. It begins with a little focused research.

It can help to adopt a structured approach to researching this state:

1. Understand normal execution flow: Manually execute each accessibility feature, recording normal process lineage, attributes, and execution flow

1. Document consistent parent process, process command line arguments, privilege characteristics, and process ancestry
1. Identify hijack opportunities

1. As an example, while it may be possible to configure a debugger for osk.exe, is it possible to configure one for utilman.exe, the parent of osk.exe?
1. Hunt unique anomalies

1. Identify observable characteristics of IFEO Debugger hijacking to differentiate between legitimate and malicious use of this technique (e.g., abnormal child of winlogon.exe could be caused by code injection and unrelated to T1015)
1. Create a **runtime-state** detection EQL rule, evaluate potential fixes to any **creation-state** detection EQL logic

Let’s dig into each of these steps so that you can better understand how this process can be adapted to work with your own team.

### **Understand normal execution flow**

For osk.exe, sethc.exe, magnify.exe, and narrator.exe, the expected parent process is utilman.exe. Figure 5 depicts a visualization of the normal process-tree for the on-screen keyboard accessibility feature.

![5-stateful-detection-engineering-blog-on-screen-keyboard.jpg](/assets/images/practical-security-engineering-stateful-detection/5-stateful-detection-engineering-blog-on-screen-keyboard.jpg)

_Figure 5: Example of normal on-screen keyboard execution_

For sethc.exe (Sticky Keys), which can be invoked by pressing the SHIFT key five times, expected parent processes are ATBroker.exe, utilman.exe, and winlogon.exe. For Displayswitch.exe, a similarly debuggable accessibility feature that can be invoked by pressing the WIN and P keys, expected parents are svchost.exe (DCOM service not useful in the context of T1015) and winlogon.exe.

Understanding **normal** execution will be helpful as you begin to explore less-expected execution. If we jumped right to [MITRE ATT&CK®](https://attack.mitre.org/) before analyzing normal behavior and then tried to write a rule, we wouldn’t have some of the essential context and our logic would be less effective.

### **Identifying hijacking possibilities**

While we have our benevolent researcher hats on, let’s consider how we might abuse this kind of normal execution. We can infer at least a few options to start with:

- Attempt to abuse execution of an accessibility application (e.g., osk.exe, magnify.exe, narrator.exe) by configuring a debugger IFEO flag
- Attempt to abuse execution of an expected non system critical parent process (e.g., utilman.exe, atbroker.exe), which is a bit more of a shot in the dark

That’s a pretty narrowly scoped set of options for now; directly abusing accessibility applications is straightforward and a good place to start.

### **Hunting unique anomalies**

We need to configure our own IFEO Debugger value for each of the known accessibility feature applications, which helps highlight noteworthy toolmarks. The table below depicts commandline arguments and process ancestry observed when our benign IFEO Debugger (set to cmd.exe) was triggered. There are some clear patterns in the command_line and parent_process_path values, as shown in Figure 6.

![6-stateful-detection-engineering-blog-IFEO-runtime.jpg](/assets/images/practical-security-engineering-stateful-detection/6-stateful-detection-engineering-blog-IFEO-runtime.jpg)

_Figure 6: T1015 - IFEO Runtime-State Anomalies (1)_

This pattern can be translated into the following **runtime-state** detection, depicted using EQL in Figure 7.

![7-stateful-detection-engineering-blog-IFEO-state-detection.jpg](/assets/images/practical-security-engineering-stateful-detection/7-stateful-detection-engineering-blog-IFEO-state-detection.jpg)

_Figure 7: T1015 - IFEO Runtime-State Detection EQL (1)_

Now that we’ve covered the direct abuse, what happens when we try to manipulate one of the expected parent processes? Figure 8 contains a few attempts at abusing the expected parent processes of accessibility features.

![8-stateful-detection-engineering-blog-IFEO-runtime-state.jpg](/assets/images/practical-security-engineering-stateful-detection/8-stateful-detection-engineering-blog-IFEO-runtime-state.jpg)

_Figure 8: T1015 - IFEO Runtime State Anomalies (2)_

As is illustrated in the previous figure, the same anomaly type can be translated to the **runtime-state** detection EQL in Figure 9.

![9-stateful-detection-engineering-blog-IFEO-runtime-2.png](/assets/images/practical-security-engineering-stateful-detection/9-stateful-detection-engineering-blog-IFEO-runtime-2.png)

_Figure 9: T1015 - IFEO runtime-state detection EQL (2)_

**Tip:** Be careful about making exceptions too broad in hunting queries. Favor PE information over process metadata when you can, and join that with signing status for low-hanging fruit.

Figure 10 depicts the graphical timeline of a **runtime-state** alert, which can detect the use of an existing T1015 backdoor.

![10-stateful-detection-engineering-blog-keyboard-execution.jpg](/assets/images/practical-security-engineering-stateful-detection/10-stateful-detection-engineering-blog-keyboard-execution.jpg)

_Figure 10: T1015 - IFEO runtime-state alert example_

## **Cleanup state**

Detection logic for this state is often the opposite of the **creation-state** logic. Below is an example for osk.exe IFEO key deletion as logged by [sysmon](https://docs.microsoft.com/en-us/sysinternals/downloads/sysmon).

![11-stateful-detection-engineering-blog-IFEO-cleanup-state.jpg](/assets/images/practical-security-engineering-stateful-detection/11-stateful-detection-engineering-blog-IFEO-cleanup-state.jpg)

_Figure 11: T1015 - IFEO cleanup-state sysmon event example_

What significant lessons should we take away?

- **runtime-state** detection requires different data (e.g., enable telemetry for child processes of utilman.exe and winlogon.exe in your sysmon configuration, use commandline value to differentiate between abnormal child processes and T1015 unique artifacts)
- **cleanup-state** detection requires different data (e.g., registry deletion, process termination)
- Adjust **creation-state** EQL rule by adding atbroker.exe and utilman.exe (can be abused as well)

## **Beyond baseline**

For the same technique, other than monitoring files overwrite ( **creation-state** ) and process masquerading as accessibility features ( **runtime-state** ), we can also hunt and alert ( **runtime-state** ) proactively on any unusual child processes (or suspicious non-Microsoft image loads to detect [potential Image hijack](https://iwantmore.pizza/posts/arbitrary-write-accessibility-tools.html)) of the accessibility features processes (osk.exe, narrator.exe, magnify.exe, sethc.exe, and DisplaySwitch.exe) — the majority of which are **childless** processes.

![12-stateful-detection-engineering-blog-unusual-accessibility.jpg](/assets/images/practical-security-engineering-stateful-detection/12-stateful-detection-engineering-blog-unusual-accessibility.jpg)

_Figure 12: T1015 - unusual accessibility feature child process_

## **Conclusion**

When assessing existing or designing new detection logic, always ask yourself how a specific technique/procedure manifests itself at the three different states before marking a specific attack procedure as covered. This impacts the type of data sources and the logic details you will need to build state resilient detections

Actively scanning for existing matches to creation-state logic is an option (often used during compromise assessment), but this is not applicable to near real-time detection. It’s not always applicable to create detection for specific states (e.g., high performance impact, difficulty to obtain right telemetry). By formalizing the stateful-detection concept in your rules, as well as your use cases engineering process, you increase your detection coverage in time (future and past matches).

Want to give [Elastic Security](https://www.elastic.co/security) a spin? Try it free today, or experience our latest version on [Elasticsearch Service](https://www.elastic.co/elasticsearch/service) on Elastic Cloud.
