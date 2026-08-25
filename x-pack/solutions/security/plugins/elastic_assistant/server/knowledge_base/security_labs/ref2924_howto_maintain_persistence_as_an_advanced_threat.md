---
title: "REF2924: how to maintain persistence as an (advanced?) threat"
slug: "ref2924-howto-maintain-persistence-as-an-advanced-threat"
date: "2023-03-27"
description: "Elastic Security Labs describes new persistence techniques used by the group behind SIESTAGRAPH, NAPLISTENER, and SOMNIRECORD."
author:
  - slug: remco-sprooten
image: "blog-thumb-pink-grapefruit-outlier.jpg"
category:
  - slug: attack-pattern
tags:
  - ref2924
  - siestagraph
  - naplistener
  - somnirecord
---

## Preamble

In recent months, there has been a noticeable shift in the nature of the incidents being tracked under REF2924. Initially, the attacker employed custom, purpose-built malware. As the attack evolved, we observed the same group resorting to the use of open source tools or publicly available source code as a basis for developing new capabilities.

### Key takeaways

- The attacker has shifted from using custom malware to open source tools or publicly available source code to develop new capabilities.

  - The attacker has also deployed open source tools like TFirewall and AdFind in the victim's environment.
  - In order to maintain persistence the attacker has deployed multiple different tools and techniques.

### .NET Webshell

On February 16th, 2023 Elastic Security Labs observed the Microsoft .NET compiler ( `csc.exe` ) being used to compile a DLL file,. The output was identified by [Elastic Defend](/assets/images/ref2924-howto-maintain-persistence-as-an-advanced-threat/image2.jpg) as a malicious file. Analysts who may have observed dynamic runtime compilation of .NET web shells should note that this was performed by the operator, not automatically by the system.

![The attacker uses the C# compiler to prepare a .NET webshell for use](/assets/images/ref2924-howto-maintain-persistence-as-an-advanced-threat/image4.jpg)

The resulting output file was named `App_Web_lgntop.aspx.ec688436.pkx46see.dll` (a50ca8df4181918fe0636272f31e19815f1b97cce6d871e15e03b0ee0e3da17b) and was the subject of malware analysis.

#### Analysis

The web shell requires a small amount of pre-configuration to ensure it listens for the correct URI. In this case the path will be " `~/auth/Current/themes/resources/lgntop.aspx`".

![Registering the URI](/assets/images/ref2924-howto-maintain-persistence-as-an-advanced-threat/image6.jpg)

This path is expected on Microsoft Exchange Outlook Web Access (OWA) sites, so it was likely selected to blend in with the OWA service that is running on the target server. Once a web request is received it is processed by the following method.

![Request processing method.](/assets/images/ref2924-howto-maintain-persistence-as-an-advanced-threat/image2.jpg)

This method checks if a specific HTTP header named `XFF` is present in the request headers. If it is present and its value, after passing through an MD5 hash function and a substring function, matches the string " `19267E61029B4546`", then the method proceeds to execute the rest of the code. The string is likely used as an authentication key to prevent others from using the webshell.

Within the `if` statement, the method reads the binary data from the request body using the `BinaryRead` method and stores it in a byte array. It then creates a string containing the fully qualified name of a .NET type that the code wants to load and gets a reference to that type using the `Type.GetType` method. The byte array in the image is the ASCII code representation of the text “ `System.Reflection.Assembly` ”. This way of presenting the code is done in order to avoid string-based detection. The `System.Reflection.Assembly` class provides methods and properties to load, examine, and manipulate assemblies at runtime.

The code obtains a reference to a method named `Load` in the loaded type and invokes it using the `Invoke` method. The `Load` method takes a byte array as a parameter, which the code decrypts using a `Decrypt` method (not shown in this publication). The result of the `Load` method invocation is stored in an object variable.

The code then gets a reference to another method named `CreateInstance` in the loaded type and invokes it using the `Invoke` method. The `CreateInstance` method takes a string as a parameter, which the code constructs from a byte array containing the ASCII codes for the string U. The result of the `CreateInstance` method invocation is stored in an object variable.

Finally, the code calls the `Equals` method on the object, passing in the current object. Because `Equals` will call `GetType` on the object, this approach is a way to indirectly call functions covertly.

The `Encrypt` and `Decrypt` functions include a hard-coded key.

![The Encrypt function](/assets/images/ref2924-howto-maintain-persistence-as-an-advanced-threat/image1.png)

#### Sources

The key " `e45e329feb5d925b`" is the result of taking the first half of the MD5 hash of the string "rebeyond". The string “rebeyond” refers to the developer of the Behinder web shell framework. This refers to the developer of the [Behinder](https://github.com/rebeyond/Behinder) webshell framework. This key is also the default value when you generate a shell template using the Behinder or derivative [Godzilla](https://github.com/BeichenDream/Godzilla) webshell frameworks.

### Persistence module

On February 13, 2023, we observed a new persistent malware called `kavUpdate.exe` written in .NET with an exceptionally small footprint (about 6Kb compiled). We believe this software was developed specifically for this environment by the threat. Elastic Security Labs observed this binary persisting via a Scheduled Task, though other mechanisms would likely be compatible.

#### Analysis

![](/assets/images/ref2924-howto-maintain-persistence-as-an-advanced-threat/image3.jpg)

This code is designed with the sole purpose of executing a set of predefined commands. The malware checks the current day and hour, and if it is Monday or Thursday at 5am, it will execute a series of commands:

1. Delete the user 'norshasa'
2. Add the user 'norshasa' with the password '[P@ssw0rd123](mailto:P@ssw0rd123)...'
3. Activate the user 'norshasa'
4. Add the user 'norshasa' to the Domain Admins group
5. Add the user 'norshasa' to the Remote Desktop Users group
6. Create a [full backup of NTDS](<https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-server-2012-r2-and-2012/cc732530(v=ws.11)>) in the `C:\ProgramData\temp` folder
7. On the same days of the week, one hour later at 6am, delete the user 'norshasa.'

### Open source tools

On January 2nd, 2023 the threat deployed [TFirewall](/assets/images/ref2924-howto-maintain-persistence-as-an-advanced-threat/image2.jpg) in the victim's environment. TFirewall is a testing tool designed to evaluate whether hosts can establish a SOCKS5 proxy within an intranet environment while allowing for outbound network communication through specific ports. Developed using Golang, TFirewall is comprised of a client and server component and is compatible with multiple operating systems.

Along with TFirewall, we observed that the attacker used the free tool [AdFind](/assets/images/ref2924-howto-maintain-persistence-as-an-advanced-threat/image1.png). `AdFind` is a command line utility for querying Active Directory and other directory services. AdFind can be run on Windows 7 or newer and requires no special security permissions beyond the ability to launch executables. It’s written in C++ and compiled with Visual Studio 2022. The source code is not available.

The binary is [quickly identifiable](/assets/images/ref2924-howto-maintain-persistence-as-an-advanced-threat/image2.jpg) based on its hash (114b37df703d46a44de0bc96afab8b8590e59a3c389558dd531298e5dd275acb). During execution, we recognized the use of AdFind-specific command line flags and parameters:

![AdFind Parameters](/assets/images/ref2924-howto-maintain-persistence-as-an-advanced-threat/image2.jpg)

On March 6th, 2023 we observed a process named `nat.exe`. Initially, the file was only identified as generically malicious. However, if we take a closer look at the command line parameters that are used during execution, we have a hint for which tool the attacker is using.

![Commandline parameters for nat.exe](/assets/images/ref2924-howto-maintain-persistence-as-an-advanced-threat/image1.png)

Based on these arguments, we can safely conclude it's a packed version of the Impacket tool [secretsdump](https://github.com/fortra/impacket/blob/master/examples/secretsdump.py). Impacket contains a collection of Python classes for working with network protocols. Impacket is commonly used to carry out a variety of tasks related to network security and penetration testing, though it may also be abused by threat actors.

Using the same approach (examining the command line parameters), we identified the use of the tool called [NTDSDumpEx](https://github.com/zcgonvh/NTDSDumpEx) which exhibited the same command line arguments employed by this tool:

![Commandline arguments for NTDSDumpEx](/assets/images/ref2924-howto-maintain-persistence-as-an-advanced-threat/image3.jpg)

`NTDSDumpEx` is capable of extracting data from the Active Directory NTDS.dit database in its offline state, meaning the database does not have to be running. It can extract information such as user accounts, group memberships, access control lists, and other directory objects.

### Background

Throughout the attack we witnessed a combination of TTPs that provide a recognizable fingerprint. For example, the way the attacker exported mailboxes is described in detail in [this](https://3gstudent.github.io/%E6%B8%97%E9%80%8F%E5%9F%BA%E7%A1%80-%E4%BB%8EExchange%E6%9C%8D%E5%8A%A1%E5%99%A8%E4%B8%8A%E6%90%9C%E7%B4%A2%E5%92%8C%E5%AF%BC%E5%87%BA%E9%82%AE%E4%BB%B6) blog post. We also see a strong resemblance in the way credentials from LSASS are being exported, as described [here](https://3gstudent.github.io/%E6%B8%97%E9%80%8F%E5%9F%BA%E7%A1%80-%E4%BB%8Elsass.exe%E8%BF%9B%E7%A8%8B%E5%AF%BC%E5%87%BA%E5%87%AD%E6%8D%AE). The majority of the commands and tools deployed by the attacker are well described on the same GitHub users’ [tips](https://github.com/3gstudent/Pentest-and-Development-Tips) repository.

We also note that the technique used to deploy NAPLISTENER is described [here](https://3gstudent.github.io/%E5%88%A9%E7%94%A8IIS%E7%9A%84%E7%AB%AF%E5%8F%A3%E5%85%B1%E4%BA%AB%E5%8A%9F%E8%83%BD%E7%BB%95%E8%BF%87%E9%98%B2%E7%81%AB%E5%A2%99) and the deployment method for malicious IIS modules like DOORME can be found in [this](https://3gstudent.github.io/%E5%88%A9%E7%94%A8IIS%E7%9A%84%E6%A8%A1%E5%9D%97%E5%8A%9F%E8%83%BD%E7%BB%95%E8%BF%87%E9%98%B2%E7%81%AB%E5%A2%99) blog post. And lastly, a [post](https://3gstudent.github.io/%E6%B8%97%E9%80%8F%E5%9F%BA%E7%A1%80-Exchange%E4%B8%80%E5%8F%A5%E8%AF%9D%E5%90%8E%E9%97%A8%E7%9A%84%E6%89%A9%E5%B1%95) on Godzilla and Behinder web shells in exchange servers closely reflects how these capabilities were implemented within targeted environments.

During malware analysis of the SIESTAGRAPH, NAPLISTENER, and SOMNIRECORD families, we also identified open source repositories that minimally served as the inspiration for these payloads and which have been described in other publications from Elastic Security Labs.

We conclude that the attackers are at the very least regular consumers of blogs and open source repositories, both of which have contributed to the rapid pace of this threat’s activities.

### Detection logic

The following prebuilt protections are available from Elastic: - [AdFind Command Activity](https://www.elastic.co/guide/en/security/current/adfind-command-activity.html)

### YARA

Elastic Security has created YARA rules to identify this activity. Below are YARA rules to identify the Behinder web shell.

`rule Windows_Trojan_Behinder {
    meta:
        author = "Elastic Security"
        creation_date = "2023-03-02"
        last_modified = "2023-03-02"
        description = "Web shell found in REF2924, related to Behinder or Godzilla"
        os = "Windows"
        arch = "x86"
        category_type = "Trojan"
        family = "Behinder"
        threat_name = "Windows.Trojan.Behinder"
        License = “Elastic License v2”
        reference_sample = "a50ca8df4181918fe0636272f31e19815f1b97cce6d871e15e03b0ee0e3da17b"
    strings:
        $load = { 53 79 73 74 65 6D 2E 52 65 66 6C 65 63 74 69 6F 6E 2E 41 73 73 65 6D 62 6C 79 }
        $key = "e45e329feb5d925b" ascii wide
    condition:
        all of them
}`
