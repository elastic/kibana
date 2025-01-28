---
title: "Dancing the night away with named pipes - PIPEDANCE client release"
slug: "dancing-the-night-away-with-named-pipes"
date: "2023-10-05"
description: "In this publication, we will walk through this client application’s functionality and how to get started with the tool."
author:
  - slug: daniel-stepanic
image: "photo-edited-12@2x.jpg"
category:
  - slug: malware-analysis
tags:
  - pipedance
  - ref1326
---

## Introduction

This year at [VB2023](https://www.virusbulletin.com/conference/), a globally renowned malware conference, Daniel Stepanic of the Elastic Security Labs team presented new insights into PIPEDANCE  – a malware we [disclosed](https://twitter.com/elasticseclabs/status/1630289166008287232) earlier this year. In addition to the talk, we released a [client](https://github.com/elastic/PIPEDANCE) application that enables threat research, offering learning opportunities for both offensive and defensive teams. In this publication, we will walk through this client application’s functionality and how to get started with the tool. Our goal with this research is to help defenders improve their understanding of PIPEDANCE by emulating techniques from this malware, used by a formidable threat group. This includes different behaviors such as:

 - Command and control communication through named pipes
 - Different styles of process injection 
 - Performing network connectivity checks
 - System/network discovery and enumeration

## Recap

PIPEDANCE is a custom malware family used by a state-sponsored group to perform post-compromise activities. It's purpose-built to enable lateral movement, deploy additional implants, and perform reconnaissance functions. PIPEDANCE uses named pipes as its main channel for command and control communication. With a variety of unique features, we believe it’s a useful example to share for research purposes and can help defenders validate security tooling.

For a detailed analysis of the PIPEDANCE malware, check out our [previous research](https://www.elastic.co/security-labs/twice-around-the-dance-floor-with-pipedance).

## Development

To get a better understanding of different features within malware, our team at Elastic Security Labs sometimes writes custom applications and controllers to interact with the malware or malware infrastructure. This process helps cultivate knowledge of a sample’s core features, assists in understanding the control flow better, and further validates different areas such as inputs and outputs to functions and data structures. Another key benefit is to uncover functionality that was not directly observed during an intrusion but is still contained in the malware. This allows our team to collect more intelligence, build additional detections, and understand more of the adversary’s objectives behind the malware. 

While we don't cover these exact scenarios in this publication, here are some things that you can do with the client (but you may think of others):

 - Understand how malware abuses named pipes
 - Verify data sources for security tooling around network activity using named pipes
 - Build a network decoder using PCAP data from PIPEDANCE’s communication requests

With the release of the client, we're hoping that the community can write additional PIPEDANCE clients in your favorite language and compare notes.

![Emulated PIPEDANCE Injection functionality](/assets/images/dancing-the-night-away-with-named-pipes/image3.jpg)


## Getting Started

_**Note:** Please review the [requirements](https://github.com/elastic/PIPEDANCE/blob/main/README.md#requirements) before setting up the lab environment. For this example, we will use two different endpoints in the same local network where named pipes, inter-process communication, and SMB settings are configured properly._

The first step is to download the PIPEDANCE [sample](https://malshare.com/sample.php?action=detail&hash=e5ae20ac5bc2f02a136c3cc3c0b457476d39f809f28a1c578cda994a83213887) (free [registration](https://malshare.com/register.php) required) and start the program without any arguments on one endpoint. This machine is the targeted endpoint where the adversary is interested in running additional implants and performing reconnaissance. After execution, a named pipe will be created and await an incoming connection from our client. 

```
.\e5ae20ac5bc2f02a136c3cc3c0b457476d39f809f28a1c578cda994a83213887
```

Now that PIPEDANCE is running on our targeted machine, download and compile the client files within the [repository](https://github.com/elastic/PIPEDANCE). The PIPEDANCE malware uses a hard-coded string, `u0hxc1q44vhhbj5oo4ohjieo8uh7ufxe`, that serves as the named pipe name and RC4 key.

![Hardcoded named pipe/RC4 key within PIPEDANCE](/assets/images/dancing-the-night-away-with-named-pipes/image2.png)


Take the newly compiled client program and execute it on a separate endpoint with one argument using either the target IP address or hostname of the machine running PIPEDANCE (machine from the previous step). An example of this would be: 

```
pipedance_client.exe 192.168.47.130
```

After execution, the client will check in with the PIPEDANCE victim to retrieve the PID of the malicious process, working directory, and user running the process. A menu of commands should be listed allowing the operator to perform various post-compromise activities.

![PIPEDANCE Client Menu](/assets/images/dancing-the-night-away-with-named-pipes/image1.png)


The appendix below contains the functions and their supported arguments.

## Conclusion

As part of our research investigating PIPEDANCE, we are releasing a client application that interacts with the malware. This tool can be used to evaluate existing security prevention/detection technologies as well as used for threat research purposes. Please check out our [repository](https://github.com/elastic/PIPEDANCE), there is also a detection section with behavioral/YARA/hunting rules.

## Appendix

### Handler Commands

| Command ID | Description | Arguments |
|---|---|---|
| 0 | Stop | PIPEDANCE client |
| 1 | Terminate process by PID | PID (ex. 9867) |
| 2 | Run shell command and print output | Command (ex. ipconfig) |   
| 4 | List files in current working directory |
| 6 | Write file to disk | Filename (full path), file content |
| 7 | Get current working directory |
| 8 | Change current working directory | Folder path |
| 9 | List running processes |
| 23 | Create random process with hijacked token from provided PID and inject shellcode (32bits) | PID (token hijack), shellcode |
| 24 | Create random process with hijacked token from provided PID and inject shellcode (64bits) | PID (token hijack), shellcode |
| 25 | Open process from provided PID and inject shellcode (32bits) | PID (thread hijack), shellcode |
| 26 | Open process from provided PID and inject shellcode (64bits) | PID (thread hijack), shellcode |
| 71 | HTTP connectivity check | Domain (ex. google.com)  
| 72 | DNS connectivity check with provided DNS server IP  | DNS server IP
| 73 | ICMP connectivity check | ICMP server IP |
| 74 | TCP connectivity check | IP, port |
| 75 | DNS connectivity check without DNS server |
| 99 | Disconnect pipe / exit thread |
| 100 | Terminate PIPEDANCE process / disconnect Pipe / exit thread |
