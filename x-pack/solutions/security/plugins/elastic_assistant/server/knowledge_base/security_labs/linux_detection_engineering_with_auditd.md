---
title: "Linux detection engineering with Auditd"
slug: "linux-detection-engineering-with-auditd"
date: "2024-04-09"
description: "In this article, learn more about using Auditd and Auditd Manager for detection engineering."
author:
  - slug: ruben-groenewoud
image: "Security Labs Images 30.jpg"
category:
  - slug: detection-science
tags:
  - slug: linux
  - slug: auditd
---

## Introduction

Unix and Linux systems operate behind the scenes, quietly underpinning a significant portion of our technological infrastructure. With the increasing complexity of threats targeting these systems, ensuring their security has become more important than ever.

One of the foundational tools in the arsenal of security detection engineers working within Unix and Linux systems is [Auditd](https://linux.die.net/man/8/auditd). This powerful utility is designed for monitoring and recording system events, providing a detailed audit trail of who did what and when. It acts as a watchdog, patrolling and recording detailed information about system calls, file accesses, and system changes, which are crucial for forensic analysis and real-time monitoring.

The objective of this article is multifaceted:

 1. We aim to provide additional information regarding Auditd, showcasing its capabilities and the immense power it holds in security detection engineering.
 2. We will guide you through setting up Auditd on your own systems, tailoring it to meet your specific monitoring needs. By understanding how to create and modify Auditd rules, you will learn how to capture the exact behavior you're interested in monitoring and interpret the resulting logs to create your own detection rules.
 3. We'll introduce Auditd Manager, an integration tool that enhances Auditd’s utility by simplifying the management of Auditd across systems.

By the end of this post, you'll not only learn how to employ Auditd Manager to incorporate some of our [pre-built detection rules](https://github.com/elastic/detection-rules/tree/main/rules) into your security strategy, but also gain a comprehensive understanding of Auditd and how to leverage it to build your own detection rules as well.

## Introduction to Auditd

Auditd is a Linux tool designed for monitoring and recording system events to provide a comprehensive audit trail of user activities, system changes, and security access. Auditd operates by hooking into the Linux kernel, capturing detailed information about system calls and other system events as they happen. These events are then logged to a file, providing a timestamped record. Administrators can define rules that specify which events to log, offering the flexibility to focus on specific areas of interest or concern. The logged data can be used for a variety of purposes, from compliance auditing to detailed forensic analysis.

## Auditd setup

To get started with Auditd, Elastic provides several options:

 - [Auditbeat’s Auditd module](https://www.elastic.co/guide/en/beats/auditbeat/current/auditbeat-module-auditd.html)
 - [Filebeat’s Auditd module](https://www.elastic.co/guide/en/beats/filebeat/current/filebeat-module-auditd.html)
 - [Elastic Agent’s Auditd Logs integration](https://docs.elastic.co/en/integrations/auditd)
 - [Elastic Agent’s Auditd Manager integration](https://docs.elastic.co/integrations/auditd_manager)

In this article, we will focus on the latter two, leveraging the [Elastic Agent](https://www.elastic.co/elastic-agent) to easily ingest logs into Elasticsearch. If you are new to Elasticsearch you can easily create an [Elastic Cloud Account](https://www.elastic.co/cloud) with a 30-day trial license, or for local testing, you can download The [Elastic Container Project](https://github.com/peasead/elastic-container) and set the license value to trial in the .env file.

Feel free to follow along using Auditbeat or Filebeat - for setup instructions, consult the documentation linked above. As the Auditd Logs integration works by parsing the audit.log file, you are required to install Auditd on the Linux host from which you wish to gather the logs. Depending on the Linux distribution and the package manager of choice, the Auditd package should be installed, and the Auditd service should be started and enabled. For Debian-based distributions:

```
sudo apt update
sudo apt install auditd
sudo systemctl start auditd
sudo systemctl enable auditd
```

The ```/var/log/audit/audit.log``` file should now be populated with Auditd logs. Next, you need to install the Auditd Logs integration, create an agent policy in Fleet with the newly installed integration, and apply the integration to a compatible Elastic Agent with Auditd installed. 

![Auditd Logs integration page in Elastic](/assets/images/linux-detection-engineering-with-auditd/image24.png)


The default settings should suffice for most scenarios. Next, you need to add the integration to an agent policy, and add the agent policy to the Elastic Agents from which you want to harvest data. The Elastic Agent ships the logs to the logs-auditd.log-[namespace] datastream. You can now [create a new data view](https://www.elastic.co/guide/en/kibana/current/data-views.html) to only match our incoming Auditd logs.
 
![New data view](/assets/images/linux-detection-engineering-with-auditd/image33.png)


You can now explore the ingested Auditd logs. But as you will quickly notice, Auditd does not log much by default – you must leverage Auditd rules to unlock its full potential.

## Auditd rules

Auditd rules are directives used to specify which system activities to monitor and log, allowing for granular control over the security auditing process. These rules are typically configured in the ```/etc/audit/audit.rules``` file. Auditd rules come in 3 varieties: ```control```, ```file```, and ```syscall```. More information can be found [here](https://linux.die.net/man/7/audit.rules). 

### Control type rules

The control type is, in most cases, used to configure Auditd rather than specifying the events to monitor. By default, the audit rules file contains the following control type settings:

```
-D
-b 8192
-f 1
--backlog_wait_time 60000
```

 - ```-D```: delete all rules on launch (Auditd parses the rules in the file from top to bottom. Removing all rules on launch ensures a clean configuration).
 - ```-b 8192```: set the maximum amount of existing Audit buffers in the kernel.
 - ```-f 1```: set the failure mode of Auditd to log.
 - ```--backlog_wait_time 60000```: specify the amount of time (in ms) that the audit system will wait if the audit backlog limit is reached before dropping audit records.

### File System Rules

Building upon these default control type settings, you can create file system rules, sometimes referred to as watches. These rules allow us to monitor files of interest for read, write, change and execute actions. A typical file system rule would look as follow:

```
-w [path-to-file] -p [permissions] -k [keyname]
```

 - ```-w```: the path to the file or directory to monitor.
 - ```-p```: any of the read (r), write (w), execute (e) or change (a) permissions.
 - ```-k```: the name of a key identifier that may be used to more easily search through the auditd logs.

In case you want to monitor the ```/etc/shadow``` file for file reads, writes, and changes, and save any such events with a key named shadow_access, you could setup the following rule:

```
-w /etc/shadow -p rwa -k shadow_access
```

### System call rules

Auditd’s true power is revealed when working with its system call rules. Auditd system call rules are configurations that specify which system calls (syscalls) to monitor and log, allowing for detailed tracking of system activity and interactions with the operating system kernel. As each syscall is intercepted and matched to the rule, it is important to leverage this functionality with care by only capturing the syscalls of interest and, when possible, capturing multiple of these syscalls in one rule. A typical syscall rule would look like this:

```
-a [action],[filter] -S [syscall] -F [field=value] -k [keyname]
```

You may leverage the ```-a``` flag followed by ```action,filter``` to choose when an event is logged, where ```action``` can be ```always``` (always create an event) or ```never``` (never create an event).

filter can be any of:

 - ```task```:  logs task creation events.
 - ```entry```:  logs syscall entry points.
 - ```exit```:  logs syscall exits/results.
 - ```user```:  logs user-space events.
 - ```exclude```:  excludes events from logging.

Next, you have:

 - ```-S```: the syscall that you are interested in (name or syscall number).
 - ```-F```: one or more filters to choose what to match against.
 - ```-k```: the key identifier.

With the information provided above, you should be able to understand the basics of most Auditd rules. For more information and examples of what values can be added to these rules, feel free to read more [here](https://linux.die.net/man/7/audit.rules).

Getting started building and testing a comprehensive and dedicated Auditd rule file for your organization might seem daunting. Luckily, there are some good public rule file examples available on GitHub. A personal favorite template to build upon is [Neo23x0’s](https://github.com/Neo23x0/auditd/blob/master/audit.rules), which is a good balance between visibility and performance. 

One downside of using the Auditd Logs integration is that you manually need to install Auditd on each host that you want to monitor, and apply the rules file manually to each running Auditd instance. This means that every time you want to update the rules file, you will have to update it on all of the hosts. Nowadays, many organizations leverage management tools that can make this process less time consuming. However, Elastic also provides another way of ingesting Auditd logs through the Auditd Manager integration which alleviates the management burden. 

## Introduction to Auditd Manager and setup

The Auditd Manager integration receives audit events from the [Linux Audit Framework](https://github.com/torvalds/linux/blob/master/kernel/audit.c) that is a part of the Linux kernel. This integration establishes a subscription to the kernel to receive the events as they occur. The Linux audit framework can send multiple messages for a single auditable event. For example, a ```rename()``` syscall causes the kernel to send eight separate messages. Each message describes a different aspect of the activity that is occurring (the syscall itself, file paths, current working directory, process title). This integration will combine all of the data from each of the messages into a single event. More information regarding Auditd Manager can be found [here](https://docs.elastic.co/integrations/auditd_manager).

Additionally, Auditd Manager solves the management burden as it allows centralized management through [Fleet](https://www.elastic.co/guide/en/fleet/current/fleet-overview.html). An update to the integration will automatically be applied to all Elastic agents that are part of the changed agent policy. 

Setting up the Auditd Manager integration is simple. You need to make sure that Auditd is no longer running on our hosts, by stopping and disabling the service.

```
sudo systemctl stop auditd
sudo systemctl disable auditd
```

You can now remove the Auditd Logs integration from our agent policy, and instead install/add the Auditd Manager integration.

![Auditd Manager integration in Elastic](/assets/images/linux-detection-engineering-with-auditd/image30.png)


There are several options available for configuring the integration. Auditd Manager provides us with the option to set the audit config as immutable (similar to setting the ```-e 2``` control-type rule in the Auditd configuration), providing additional security in which unauthorized users cannot change the audit system, making it more difficult to hide malicious activity. 

You can leverage the Resolve IDs functionality to enable the resolution of UIDs and GIDs to their associated names.

![Resolve IDs toggle](/assets/images/linux-detection-engineering-with-auditd/image25.png)


For our Auditd rule management, you can either supply the rules in the Audit rules section, or leverage a rule file and specify the file path to read this file from. The rule format is similar to the rule format for the Auditd Logs integration. However, instead of supplying control flags in our rule file, you can set these options in the integration settings instead.

![Setting Auditd rules](/assets/images/linux-detection-engineering-with-auditd/image16.png)


Auditd Manager automatically purges all existing rules prior to adding any new rules supplied in the configuration, making it unnecessary to specify the ```-D``` flag in the rule file. Additionally, you can set our failure mode to ```silent``` in the settings, and therefore do not need to supply the ```-f``` flag either.

![Specifying failure mode](/assets/images/linux-detection-engineering-with-auditd/image6.png)


You can set the backlog limit as well, which would be similar to setting the ```-b``` flag.

![Specifying the backlog limit](/assets/images/linux-detection-engineering-with-auditd/image29.png)


There is also an option for setting the backpressure strategy, equivalent to the ```--backlog_wait_time``` setting.

![Setting the backpressure strategy](/assets/images/linux-detection-engineering-with-auditd/image22.png)


Finally, check the option to preserve the original event, as this will allow you to analyze the event easier in the future.

![Preserve original event toggle](/assets/images/linux-detection-engineering-with-auditd/image19.png)


You can now save the integration, and apply it to the agent policy for the hosts from which you would like to receive Auditd logs.

## Auditd rule file troubleshooting

The rule file provided by Neo23x0 does not work for Auditd Manager by default. To get it to work, you will have to make some minor adjustments such as removing the control type flags, a UID to user conversion for a user that is not present on default systems, or a redundant rule entry. The changes that have to be made will ultimately be unique to your environment.

You have two ways of identifying the errors that will be generated when copy-pasting an incompatible file into the Auditd Manager integration. You can navigate to the agent that received the policy, and look at the integration input error. You can analyze the errors one by one, and change or remove the conflicting line.

![Integration input status logs](/assets/images/linux-detection-engineering-with-auditd/image11.png)


You can also use the [Discover](https://www.elastic.co/guide/en/kibana/current/discover.html) tab, select our Auditd Manger data view, and filter for events where the ```auditd.warnings``` field exists, and go through the warnings one-by-one.

![Auditd warnings in Discover](/assets/images/linux-detection-engineering-with-auditd/image14.png)


For example, you can see that the error states “unknown rule type” , which is related to Auditd not supporting control rules. The “failed to convert user ‘x’ to a numeric ID”, is related to the user not existing on the system. And finally, “rule ‘x’ is a duplicate of ‘x’”, is related to duplicate rules. Now that you removed the conflicting entries, and our agent status is healthy, you can start analyzing some Auditd data!

## Analyzing Auditd Manager events

Now that you have Auditd Manager data available in our Elasticsearch cluster, just like you did before, you can create a dataview for the ```logs-auditd_manager.auditd*``` index to specifically filter this data. Our implemented rule file contains the following entry:

```
-w /etc/sudoers -p rw -k priv_esc
```

This captures read and write actions for the ```/etc/sudoers``` file, and writes these events to a log with the ```priv_esc``` key. Let’s execute the ```cat /etc/sudoers``` command, and analyze the event. Let us first look at some of the fields containing general information.

![Important fields within an event generated by Auditd Manager](/assets/images/linux-detection-engineering-with-auditd/image8.png)


You can see that the ```/etc/sudoers``` file was accessed by the ```/usr/bin/cat``` binary through the ```openat()``` syscall. As the file owner and group are ```root```, and the user requesting access to this file is not UID 0 (root), the ```openat()``` syscall failed, which is represented in the log. Finally, you can see the tag that was linked to this specific activity. 

Digging a bit deeper, you can identify additional information about the event.

![Important fields within an event generated by Auditd Manager](/assets/images/linux-detection-engineering-with-auditd/image28.png)


You can see the process command line that was executed, and which process ID and process parent ID initiated the activity. Additionally, you can see from what architecture the event originated and through which ```tty``` (terminal connected to standard input) the command was executed. 

To understand the a0-3 values, you need to dig deeper into Unix syscalls. You should at this point be aware of what a syscall is, but to be complete, a Unix syscall (system call) is a fundamental interface that allows a program to request a service from the operating system's kernel, such as file operations, process control, or network communications.

Let’s take a look at the ```openat()``` syscall. Consulting the ```open(2)``` man page (source), you see the following information.

![System calls manual for open(2)](/assets/images/linux-detection-engineering-with-auditd/image27.png)


```openat()``` is an evolved version of the ```open()``` syscall, allowing for file access relative to a directory file descriptor (```dirfd```). This syscall enables a program to open a file or directory — a crucial operation for many system tasks. You can see that the syscall is part of the standard C library, and is available in ```fcntl.h``` header through the ```#include <fcntl.h>``` include statement.

Consulting the manual, you can see the ```openat()``` syscall syntax is as follows:

```
int openat(int dirfd, const char *pathname, int flags, /* mode_t mode */);
```

 - ```dirfd``` specifies the directory file descriptor.
 - ```*pathname``` is a pointer to the name of the file/directory to be opened.
 - ```flags``` determine the operation mode (e.g., read, write, create, etc.).

Returning to our original event, you are now ready to understand the ```auditd.data.a0-a3``` fields. The ```a0``` to ```a3``` values in an auditd log represent the arguments passed to a syscall. These arguments are crucial for understanding the context and specifics of the syscall's execution. Let's break down how these values relate to ```openat()``` and what they tell us about the attempted operation based on our earlier exploration.

 - ```auditd.data.a0``` (```dirfd```): The a0 value, ```ffffff9c```, indicates a special directive, ```AT_FDCWD```, suggesting the operation is relative to the current working directory.
 - ```auditd.data.a1``` (```pathname```): The ```a1``` value, ```7ffd0f81871d```, represents a hexadecimal memory address pointing to the pathname string of the target file or directory. In this case, it refers to an attempt to access the ```/etc/sudoers``` file.
 - ```auditd.data.a2``` (```flags```): Reflected by the ```a2``` value of ```0```, the flags argument specifies the mode in which the file is to be accessed. With ```0``` indicating no special flags were used, it implies a default operation – most likely read-only access.
 - ```auditd.data.a3``` (```mode```): The ```a3``` value, also 0, becomes relevant in contexts where the file is being created, dictating the permissions set on the new file.

Based on the analysis above, you now have a pretty good understanding of how to interpret Auditd Manager events.

A different way of quickly getting an idea of what an Auditd Manager event means is by using Elastic’s built-in [AI Assistant](https://www.elastic.co/guide/en/security/current/security-assistant.html). Let’s execute the ```whoami``` command, and take a look at the ```auditd.messages``` field within the event.

![Content of the auditd.messages field](/assets/images/linux-detection-engineering-with-auditd/image3.png)


You can ask the Elastic AI Assistant to do the heavy lifting and analyze the event, after which you only have to consult the syscall manual to make sure that it was correct. Let’s first create a new system prompt, focused on analyzing Auditd logs, somewhat similar to this: 

![Auditd log analysis prompt for Elastic’s AI assistant](/assets/images/linux-detection-engineering-with-auditd/image18.png)


You can now leverage the newly created system prompt, and paste your Auditd message in there without any additional formatting, and receive the following response:

![Auditd log analysis by Elastic’s AI assistant](/assets/images/linux-detection-engineering-with-auditd/image10.png)


Generative AI tools are very useful for receiving a quick explanation of an event. But generative AI can make mistakes, so you should always be cognizant of leveraging AI tools for this type of analysis, and double check what output it generates. Especially when leveraging the output of these tools for detection rule development, as one minor mistake could lead to faulty logic.

## Auditd Manager detection rule examples

After reading the previous section, you should now have enough knowledge available to get started analyzing Auditd Manager logs. The current Elastic detection rules rule set mostly leverages the [Elastic Defend integration](https://docs.elastic.co/en/integrations/endpoint), but the number of rules that leverage Auditd is increasing significantly. This section will dive into several detection rules that leverage Auditd, explain the why and try to teach some underused techniques for writing detection rule queries.

### Potential reverse shell via UDP

The [Potential Reverse Shell via UDP](https://github.com/elastic/detection-rules/blob/main/rules/linux/execution_shell_via_udp_cli_utility_linux.toml) rule aims to identify UDP-based reverse shells. As Elastic Defend does not currently capture UDP traffic, you can leverage Auditd to close this visibility gap. The rule leverages the following logic: 

```
sample by host.id, process.pid, process.parent.pid
  [process where host.os.type == "linux" and event.type == "start" and event.action == "executed" and process.name : (
    "bash", "dash", "sh", "tcsh", "csh", "zsh", "ksh", "fish", "perl", "python*", "nc", "ncat", "netcat", "php*",
    "ruby", "openssl", "awk", "telnet", "lua*", "socat"
    )]
  [process where host.os.type == "linux" and auditd.data.syscall == "socket" and process.name : (
    "bash", "dash", "sh", "tcsh", "csh", "zsh", "ksh", "fish", "perl", "python*", "nc", "ncat", "netcat", "php*",
    "ruby", "openssl", "awk", "telnet", "lua*", "socat"
    ) and auditd.data.a1 == "2"]
  [network where host.os.type == "linux" and event.type == "start" and event.action == "connected-to" and
   process.name : (
    "bash", "dash", "sh", "tcsh", "csh", "zsh", "ksh", "fish", "perl", "python*", "nc", "ncat", "netcat", "php*",
    "ruby", "openssl", "awk", "telnet", "lua*", "socat"
    ) and network.direction == "egress" and destination.ip != null and
   not cidrmatch(destination.ip, "127.0.0.0/8", "169.254.0.0/16", "224.0.0.0/4", "::1")]
```

The rule leverages the [sample](https://www.elastic.co/guide/en/elasticsearch/reference/current/eql-syntax.html#eql-samples) functionality, which describes and matches a chronologically unordered series of events. This will ensure the sequence also triggers if the events occur in the same millisecond. Additionally, we leverage a whitelisting approach to specify suspicious binaries that are capable of spawning a reverse connection, allowing for a minimized false-positive rate.

We ensure the capturing of UDP connections by leveraging the Auditd data related to the [```socket()```](https://man7.org/linux/man-pages/man2/socket.2.html) syscall.

![System calls manual synopsis for socket(2)](/assets/images/linux-detection-engineering-with-auditd/image23.png)


We see that the a0 value represents the domain, ```a1``` represents the type and ```a2``` represents the protocol used. Our rule leverages the ```auditd.data.a1 == "2"``` syntax, which translates to the ```SOCK_DGRAM``` type, which is UDP. 

![System calls manual types description for socket(2)](/assets/images/linux-detection-engineering-with-auditd/image9.png)


Finally, we ensure that we capture only egress network connections from the host and ensure the exclusion of IPv4 and IPv6 loopback addresses, IPv4 link-local and multicast addresses, and sequence the query by ```process.pid``` and ```process.parent.pid``` to make sure the events originate from the same (parent) process. 

![Potential reverse shell via UDP alert](/assets/images/linux-detection-engineering-with-auditd/image23.png)


If we want to hunt for suspicious processes opening UDP sockets, we can query all socket() syscalls with ```auditd.data.a1 == "2"```, count the number of distinct process occurrences, and sort them in an ascending order to find anomalies. To do so, we can leverage this ES|QL query:

```
FROM logs-*, auditbeat-*
| EVAL protocol = CASE(
    auditd.data.a1 == "1", "TCP",
    auditd.data.a1 == "2", "UDP"
)
| WHERE host.os.type == "linux" and auditd.data.syscall == "socket" and protocol == "UDP"
| STATS process_count = COUNT(process.name), host_count = COUNT(host.name) by process.name, protocol
| SORT process_count asc
| LIMIT 100
```

![ES|QL query for detecting uncommon UDP network connections](/assets/images/linux-detection-engineering-with-auditd/image34.png)


Looking at the results, we can see quite a few interesting processes pop up, which might be a good starting point for threat hunting purposes. 

### Potential Meterpreter reverse shell

Another interesting type of reverse connections that we leveraged Auditd for is the detection of the [Meterpreter shell](https://docs.rapid7.com/metasploit/manage-meterpreter-and-shell-sessions/), which is a popular reverse shell used within the [Metasploit-Framework](https://www.metasploit.com/). The [Potential Meterpreter Reverse Shell](https://github.com/elastic/detection-rules/blob/main/rules/linux/execution_shell_via_meterpreter_linux.toml) rule leverages Meterpreter’s default host enumeration behavior to detect its presence. 

```
sample by host.id, process.pid, user.id
  [file where host.os.type == "linux" and auditd.data.syscall == "open" and auditd.data.a2 == "1b6" and file.path == "/etc/machine-id"]
  [file where host.os.type == "linux" and auditd.data.syscall == "open" and auditd.data.a2 == "1b6" and file.path == "/etc/passwd"]
  [file where host.os.type == "linux" and auditd.data.syscall == "open" and auditd.data.a2 == "1b6" and file.path == "/proc/net/route"]
  [file where host.os.type == "linux" and auditd.data.syscall == "open" and auditd.data.a2 == "1b6" and file.path == "/proc/net/ipv6_route"]
  [file where host.os.type == "linux" and auditd.data.syscall == "open" and auditd.data.a2 == "1b6" and file.path == "/proc/net/if_inet6"]
```

When Meterpreter spawns, it collects default system information such as the machine, user, and IP routing information by reading specific system files. We can see this behavior when decompiling the Meterpreter payload, as the paths are hardcoded into the binary.

![Dissemination of a Meterpreter payload showing hardcoded full paths](/assets/images/linux-detection-engineering-with-auditd/image26.png)


Our detection logic leverages ```auditd.data.a2 == “1b6”```, as this is consistent with the Meterpreter’s behavior. We can find Meterpreter leveraging this specific syscall combination to read files by looking at the way Meterpreter opens file handlers. 

![Dissemination of a Meterpreter payload showing the implementation of fopen64 syscalls](/assets/images/linux-detection-engineering-with-auditd/image2.png)


Just for informational purposes, some other paths that Meterpreter reads from can be found in the screenshot below.

![Auditd Manager events originating from Meterpreter payloads](/assets/images/linux-detection-engineering-with-auditd/image20.png)


We can leverage [ES|QL](https://www.elastic.co/guide/en/elasticsearch/reference/current/esql.html) to analyze a set of Meterpreter reverse shells, and easily find out what file paths are being accessed by all of them. 

```
FROM logs-*, auditbeat-*
| WHERE host.os.type == "linux" and event.action == "opened-file" and process.name in ("shell-x64.elf", "JBNhk", "reverse.elf", "shell.elf", "elf") and auditd.data.a2 == "1b6"
| STATS file_access = COUNT_DISTINCT(process.name) by file.path
| SORT file_access desc
| LIMIT 100
```

![ES|QL query for analyzing which paths are accessed by different Meterpreter payloads](/assets/images/linux-detection-engineering-with-auditd/image17.png)


In this example we are only analyzing 5 Meterpreter shells, but using ES|QL we can easily scale this analysis to larger numbers. Based on the information above, we can see that the paths that were selected for the detection rule are present in all five of the samples. 

Combining the above logic, we can potentially discover Linux Meterpreter payloads.

![Potential Meterpreter reverse shell alert](/assets/images/linux-detection-engineering-with-auditd/image35.png)


### Linux FTP/RDP brute force attack detected

Given that there are so many different FTP/RDP clients available for Linux, and the authentication logs are not entirely implemented similarly, you can leverage Auditd’s ```auditd.data.terminal``` field to detect different FTP/RDP implementations. Our FTP detection logic looks as follows:

```
sequence by host.id, auditd.data.addr, related.user with maxspan=3s
  [authentication where host.os.type == "linux" and event.action == "authenticated" and 
   auditd.data.terminal == "ftp" and event.outcome == "failure" and auditd.data.addr != null and 
   auditd.data.addr != "0.0.0.0" and auditd.data.addr != "::"] with runs=5

  [authentication where host.os.type == "linux" and event.action  == "authenticated" and 
   auditd.data.terminal == "ftp" and event.outcome == "success" and auditd.data.addr != null and 
   auditd.data.addr != "0.0.0.0" and auditd.data.addr != "::"] | tail 1
```

Here, we sequence 5 failed login attempts with 1 successful login attempt on the same host, from the same IP and for the same user. We leverage the [tail](https://www.elastic.co/guide/en/elasticsearch/reference/current/eql-pipe-ref.html) feature which works similar to tail in Unix, selecting the last X number of alerts rather than selecting all alerts within the timeframe. This does not affect the SIEM detection rules interface, it is only used for easier readability as brute force attacks can quickly lead to many alerts.

![Potential Linux RDP brute force attack detected alert](/assets/images/linux-detection-engineering-with-auditd/image7.png)


Although we are leveraging different FTP tools such as ```vsftpd```, the ```auditd.data.terminal``` entry remains similar across tooling, allowing us to capture a broader range of FTP brute forcing attacks. Our RDP detection rule leverages similar logic:

```
sequence by host.id, related.user with maxspan=5s
  [authentication where host.os.type == "linux" and event.action == "authenticated" and
   auditd.data.terminal : "*rdp*" and event.outcome == "failure"] with runs=10
  [authentication where host.os.type == "linux" and event.action  == "authenticated" and
   auditd.data.terminal : "*rdp*" and event.outcome == "success"] | tail 1
```

Given that ```auditd.data.terminal``` fields from different RDP clients are inconsistent, we can leverage wildcards to capture their authentication events. 

![Potential Linux FTP brute force attack detected alert](/assets/images/linux-detection-engineering-with-auditd/image21.png)


### Network connection from binary with RWX memory region

The [```mprotect()```](https://man7.org/linux/man-pages/man2/mprotect.2.html) system call is used to change the access protections on a region of memory that has already been allocated. This syscall allows a process to modify the permissions of pages in its virtual address space, enabling or disabling permissions such as read, write, and execute for those pages. Our aim with this detection rule is to detect network connections from binaries that have read, write and execute memory region permissions set. Let’s take a look at the syscall.

![System calls manual synopsis for mprotect](/assets/images/linux-detection-engineering-with-auditd/image3.png)


For our detection rule logic, the ```prot``` value is most important. You can see that ```prot``` can have the following access flags:

![System calls manual prot access flags description for mprotect](/assets/images/linux-detection-engineering-with-auditd/image12.png)


As stated, ```prot``` is a bitwise OR of the values in the list. So for read, write, and execute permissions, we are looking for an int of:

```
int prot = PROT_READ | PROT_WRITE | PROT_EXEC;
```

This translates to a value of ```0x7``` after bitwising, and therefore we will be looking at an ```auditd.data.a2 == “7”```. We have created two detection rules that leverage this logic - [Unknown Execution of Binary with RWX Memory Region](https://github.com/elastic/detection-rules/blob/main/rules/linux/execution_unknown_rwx_mem_region_binary_executed.toml) and [Network Connection from Binary with RWX Memory Region](https://github.com/elastic/detection-rules/blob/main/rules/linux/execution_netcon_from_rwx_mem_region_binary.toml). The detection rules that leverage specific Auditd configurations in order to function, will have a note about what rule to add in their setup guide:

![Auditd Setup guide for detection rule](/assets/images/linux-detection-engineering-with-auditd/image15.png)


The prior leverages the [new_terms](https://www.elastic.co/guide/en/security/current/rules-ui-create.html#create-new-terms-rule) rule type, which allows us to detect previously unknown terms within a specified time window. This allows us to detect binaries with RWX permissions that are being seen on a specific host for the first time, while reducing false positives for binaries that are overly permissive but used on a regular basis.

The latter leverages the following detection logic:

```
sample by host.id, process.pid, process.name
[process where host.os.type == "linux" and auditd.data.syscall == "mprotect" and auditd.data.a2 == "7"]
[network where host.os.type == "linux" and event.type == "start" and event.action == "connection_attempted" and
   not cidrmatch(destination.ip, "127.0.0.0/8", "169.254.0.0/16", "224.0.0.0/4", "::1")
]
```

We sample a process being executed with these RWX permissions, after which a network connection (excluding loopback, multicast, and link-local addresses) is initiated.

Interestingly enough, Metasploit often assigns these RWX permissions to specific regions of its generated payloads. For example, one of the events that trigger this detection logic in a testing stack is related to the execution of [Metasploit’s Postgres Payload for Linux](https://github.com/rapid7/metasploit-framework/blob/master/modules/exploits/linux/postgres/postgres_payload.rb). When analyzing this payload’s source code, you can see that the payload_so function defines the ```PROT_READ```, ```PROT_WRITE``` and ```PROT_EXEC``` flags.

![Metasploit’s Postgres payload_so function](/assets/images/linux-detection-engineering-with-auditd/image4.png)


After which a specific memory region, with a specific page size of ```0x1000``` is given the RWX access flags in a similar fashion as described earlier. 

![Metasploit’s Postgres run_payload function](/assets/images/linux-detection-engineering-with-auditd/image31.png)


After running the payload, and querying the stack, you can see several hits are returned, which are all related to Metasploit Meterpreter payloads.

![Network connection from binary with RWX memory region alert](/assets/images/linux-detection-engineering-with-auditd/image13.png)


Focusing on the Postgres payload that we were analyzing earlier, you can see the exact payload execution path through our [visual event analyzer](https://www.elastic.co/guide/en/security/current/visual-event-analyzer.html). Elastic Security allows any event detected by Elastic Endpoint to be analyzed using a process-based visual analyzer, which shows a graphical timeline of processes that led up to the alert and the events that occurred immediately after. Examining events in the visual event analyzer is useful to determine the origin of potentially malicious activity and other areas in your environment that may be compromised. It also enables security analysts to drill down into all related hosts, processes, and other events to aid in their investigations.

![Visual event analyzer view for Metasploit’s Postgres payload execution](/assets/images/linux-detection-engineering-with-auditd/image32.png)


In the analyzer you can see perl being leveraged to create and populate the jBNhk payload in the /tmp directory (with RWX permissions) and spawning a reverse Meterpreter shell. 

## Conclusion

In this post, we've dived into the world of Auditd, explaining what it is and its purpose. We showed you how to get Auditd up and running, how to funnel those logs into Elasticsearch to boost Unix/Linux visibility and enable you to improve your Linux detection engineering skills. We discussed how to craft Auditd rules to keep an eye on specific activities, and how to make sense of the events that it generates. To make life easier, we introduced Auditd Manager, an integration created by Elastic to take some of the management load off your shoulders. Finally, we wrapped up by exploring various detection rules and some of the research that went into creating them, enabling you to get the most out of this data source.

We hope you found this guide helpful! Incorporating Auditd into your Unix systems is a smart move for better security visibility. Whether you decide to go with our pre-built detection rules or craft some of your own, Auditd can really strengthen your Unix security game.