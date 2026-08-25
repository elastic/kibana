---
title: "Detecting Hotkey-Based Keyloggers Using an Undocumented Kernel Data Structure"
slug: "detecting-hotkey-based-keyloggers"
date: "2025-03-04"
description: "In this article, we explore what hotkey-based keyloggers are and how to detect them. Specifically, we explain how these keyloggers intercept keystrokes, then present a detection technique that leverages an undocumented hotkey table in kernel space."
author:
- slug: asuka-nakajima
image: "Security Labs Images 12.jpg"
category:
  - slug: security-research
  - slug: detection-science
tags:
  - detection engineering
  - threat detection
---

# Detecting Hotkey-Based Keyloggers Using an Undocumented Kernel Data Structure

In this article, we explore what hotkey-based keyloggers are and how to detect them. Specifically, we explain how these keyloggers intercept keystrokes, then present a detection technique that leverages an undocumented hotkey table in kernel space.

## Introduction

In May 2024, Elastic Security Labs published [an article](https://www.elastic.co/security-labs/protecting-your-devices-from-information-theft-keylogger-protection) highlighting new features added in [Elastic Defend](https://www.elastic.co/guide/en/integrations/current/endpoint.html) (starting with 8.12) to enhance the detection of keyloggers running on Windows. In that post, we covered four types of keyloggers commonly employed in cyberattacks — polling-based keyloggers, hooking-based keyloggers, keyloggers using the Raw Input Model, and keyloggers using DirectInput — and explained our detection methodology. In particular, we introduced a behavior-based detection method using the Microsoft-Windows-Win32k provider within [Event Tracing for Windows](https://learn.microsoft.com/en-us/windows-hardware/drivers/devtest/event-tracing-for-windows--etw-) (ETW).

Shortly after publication, we were honored to have our article noticed by [Jonathan Bar Or](https://jonathanbaror.com/), Principal Security Researcher at Microsoft. He provided invaluable feedback by pointing out the existence of hotkey-based keyloggers and even shared proof-of-concept (PoC) code with us. Leveraging his PoC code [Hotkeyz](https://github.com/yo-yo-yo-jbo/hotkeyz) as a starting point, this article presents one potential method for detecting hotkey-based keyloggers.

## Overview of Hotkey-based Keyloggers

### What Is a Hotkey?

Before delving into hotkey-based keyloggers, let’s first clarify what a hotkey is. A hotkey is a type of keyboard shortcut that directly invokes a specific function on a computer by pressing a single key or a combination of keys. For example, many Windows users press **Alt \+ Tab** to switch between tasks (or, in other words, windows). In this instance, **Alt \+ Tab** serves as a hotkey that directly triggers the task-switching function. 

*(Note: Although other types of keyboard shortcuts exist, this article focuses solely on hotkeys. Also, **all information herein is based on Windows 10 version 22H2 OS Build 19045.5371 without virtualization based security**. Please note that the internal data structures and behavior may differ in other versions of Windows.)*

### Abusing Custom Hotkey Registration Functionality

In addition to using the pre-configured hotkeys in Windows as shown in the previous example, you can also register your own custom hotkeys. There are various methods to do this, but one straightforward approach is to use the Windows API function [**RegisterHotKey**](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-registerhotkey), which allows a user to register a specific key as a hotkey. For instance, the following code snippet demonstrates how to use the **RegisterHotKey** API to register the **A** key (with a [virtual-key code](https://learn.microsoft.com/en-us/windows/win32/inputdev/virtual-key-codes) of 0x41) as a global hotkey:

```c
/*
BOOL RegisterHotKey(
  [in, optional] HWND hWnd, 
  [in]           int  id,
  [in]           UINT fsModifiers,
  [in]           UINT vk
);
*/
RegisterHotKey(NULL, 1, 0, 0x41);
```

After registering a hotkey, when the registered key is pressed, a [**WM\_HOTKEY**](https://learn.microsoft.com/en-us/windows/win32/inputdev/wm-hotkey) message is sent to the message queue of the window specified as the first argument to the **RegisterHotKey** API (or to the thread that registered the hotkey if **NULL** is used). The code below demonstrates a message loop that uses the [**GetMessage**](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-getmessage) API to check for a **WM\_HOTKEY** message in the [message queue](https://learn.microsoft.com/en-us/windows/win32/winmsg/about-messages-and-message-queues), and if one is received, it extracts the virtual-key code (in this case, 0x41) from the message.

```c
MSG msg = { 0 };
while (GetMessage(&msg, NULL, 0, 0)) {
    if (msg.message == WM_HOTKEY) {
        int vkCode = HIWORD(msg.lParam);
        std::cout << "WM_HOTKEY received! Virtual-Key Code: 0x"
            << std::hex << vkCode << std::dec << std::endl;
    }
}
```

In other words, imagine you're writing something in a notepad application. If the A key is pressed, the character won't be treated as normal text input — it will be recognized as a global hotkey instead.

In this example, only the A key is registered as a hotkey. However, you can register multiple keys (like B, C, or D) as separate hotkeys at the same time. This means that any key (i.e., any virtual-key code) that can be registered with the **RegisterHotKey** API can potentially be hijacked as a global hotkey. A hotkey-based keylogger abuses this capability to capture the keystrokes entered by the user.

Based on our testing, we found that not only alphanumeric and basic symbol keys, but also those keys when combined with the SHIFT modifier, can all be registered as hotkeys using the **RegisterHotKey** API. This means that a keylogger can effectively monitor every keystroke necessary to steal sensitive information.

### Capturing Keystrokes Stealthily

Let's walk through the actual process of how a hotkey-based keylogger captures keystrokes, using the Hotkeyz hotkey-based keylogger as an example.

In Hotkeyz, it first registers each alphanumeric virtual-key code — and some additional keys,  such as **VK\_SPACE** and **VK\_RETURN** — as individual hotkeys by using the **RegisterHotKey** API. 

Then, inside the keylogger's message loop, the [**PeekMessageW**](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-peekmessagew) API is used to check whether any **WM\_HOTKEY** messages from these registered hotkeys have appeared in the message queue. When a **WM\_HOTKEY** message is detected, the virtual-key code it contains is extracted and eventually saved to a text file. Below is an excerpt from the message loop code, highlighting the most important parts.

```c
while (...)
{
    // Get the message in a non-blocking manner and poll if necessary
    if (!PeekMessageW(&tMsg, NULL, WM_HOTKEY, WM_HOTKEY, PM_REMOVE))
    {
        Sleep(POLL_TIME_MILLIS);
        continue;
    }
....
   // Get the key from the message
   cCurrVk = (BYTE)((((DWORD)tMsg.lParam) & 0xFFFF0000) >> 16);

   // Send the key to the OS and re-register
   (VOID)UnregisterHotKey(NULL, adwVkToIdMapping[cCurrVk]);
   keybd_event(cCurrVk, 0, 0, (ULONG_PTR)NULL);
   if (!RegisterHotKey(NULL, adwVkToIdMapping[cCurrVk], 0, cCurrVk))
   {
       adwVkToIdMapping[cCurrVk] = 0;
       DEBUG_MSG(L"RegisterHotKey() failed for re-registration (cCurrVk=%lu,    LastError=%lu).", cCurrVk, GetLastError());
       goto lblCleanup;
   }
   // Write to the file
  if (!WriteFile(hFile, &cCurrVk, sizeof(cCurrVk), &cbBytesWritten, NULL))
  {
....
```

One important detail is this: to avoid alerting the user to the keylogger's presence, once the virtual-key code is extracted from the message, the key's hotkey registration is temporarily removed using the [**UnregisterHotKey**](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-unregisterhotkey) API. After that, the key press is simulated with [**keybd\_event**](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-keybd_event) so that it appears to the user as if the key was pressed normally. Once the key press is simulated, the key is re-registered using the **RegisterHotKey** API to wait for further input. This is the core mechanism behind how a hotkey-based keylogger operates.

## Detecting Hotkey-Based Keyloggers

Now that we understand what hotkey-based keyloggers are and how they operate, let's explain how to detect them.

### ETW Does Not Monitor the RegisterHotKey API

Following the approach described in an earlier article, we first investigated whether [Event Tracing for Windows](https://learn.microsoft.com/en-us/windows/win32/etw/about-event-tracing) (ETW) could be used to detect hotkey-based keyloggers. Our research quickly revealed that ETW currently does not monitor the **RegisterHotKey** or **UnregisterHotKey** APIs. In addition to reviewing the manifest file for the Microsoft-Windows-Win32k provider, we reverse-engineered the internals of the **RegisterHotKey** API — specifically, the **NtUserRegisterHotKey** function in win32kfull.sys. Unfortunately, we found no evidence that these APIs trigger any ETW events when executed.

The image below shows a comparison between the decompiled code for **NtUserGetAsyncKeyState** (which is monitored by ETW) and **NtUserRegisterHotKey**. Notice that at the beginning of **NtUserGetAsyncKeyState**, there is a call to **EtwTraceGetAsyncKeyState** — a function associated with  logging ETW events — while **NtUserRegisterHotKey** does not contain such a call.

![Figure 1: Comparison of the Decompiled Code for **NtUserGetAsyncKeyState** and **NtUserRegisterHotKey**](/assets/images/detecting-hotkey-based-keyloggers/image3.png)
　  
 Although we also considered using ETW providers other than Microsoft-Windows-Win32k to indirectly monitor calls to the **`RegisterHotKey`** API, we found that the detection method using the "hotkey table" — which will be introduced next and does not rely on ETW — achieves results that are comparable to or even better than monitoring the **`RegisterHotKey`** API. In the end, we chose to implement this method.

### Detection Using the Hotkey Table (**gphkHashTable**)

After discovering that ETW cannot directly monitor calls to the **RegisterHotKey** API, we started exploring detection methods that don't rely on ETW. During our investigation, we wondered, "Isn't the information for registered hotkeys stored somewhere? And if so, could that data be used for detection?" Based on that hypothesis, we quickly found a hash table labeled **gphkHashTable** within **NtUserRegisterHotKey**. Searching Microsoft's online documentation revealed no details on **gphkHashTable**, suggesting that it's an undocumented kernel data structure.

![Figure 2: The hotkey table (**gphkHashTable**), discovered within the **RegisterHotKey** function called inside **NtUserRegisterHotKey**](/assets/images/detecting-hotkey-based-keyloggers/image1.png)

Through reverse engineering, we discovered that this hash table stores objects containing information about registered hotkeys. Each object holds details such as the virtual-key code and modifiers specified in the arguments to the **RegisterHotKey** API. The right side of Figure 3 shows part of the structure definition for a hotkey object (named **HOT\_KEY**), while the left side displays how the registered hotkey objects appear when accessed via WinDbg.

![Figure 3: Hotkey Object Details. WinDbg view (left) and HOT\_KEY structure details (right)](/assets/images/detecting-hotkey-based-keyloggers/image4.png)

We also determined that **ghpkHashTable** is structured as shown in Figure 4\.  Specifically, it uses the result of the modulo operation (with 0x80) on the virtual-key code (specified by the RegisterHotKey API) as the index into the hash table. Hotkey objects sharing the same index are linked together in a list, which allows the table to store and manage hotkey information even when the virtual-key codes are identical but the modifiers differ. 

![Figure 4: Structure of **gphkHashTable**](/assets/images/detecting-hotkey-based-keyloggers/image6.png)  

In other words, by scanning all HOT\_KEY objects stored in **ghpkHashTable**, we can retrieve details about every registered hotkey. If we find that every main key — for example, each individual alphanumeric key — is registered as a separate hotkey, that strongly indicates the presence of an active hotkey-based keylogger.

## Implementing the Detection Tool

Now, let's move on to implementing the detection tool. Since **gphkHashTable** resides in the kernel space, it cannot be accessed by a user-mode application. For this reason, it was necessary to develop a device driver for detection. More specifically, we decided to develop a device driver that obtains the address of **gphkHashTable** and scans through all the hotkey objects stored in the hash table. If the number of alphanumeric keys registered as hotkeys exceeds a predefined threshold, it will alert us to the potential presence of a hotkey-based keylogger.

### How to Obtain the Address of **gphkHashTable**

While developing the detection tool, one of the first challenges we faced was how to obtain the address of **gphkHashTable**. After some consideration, we decided to extract the address directly from an instruction in the **win32kfull.sys** driver that accesses **gphkHashTable**.

Through reverse engineering, we discovered that within the IsHotKey function — right at the beginning — there is a lea instruction (lea rbx, **gphkHashTable**) that accesses **gphkHashTable**. We used the opcode byte sequence (0x48, 0x8d, 0x1d) from that instruction as a signature to locate the corresponding line, and then computed the address of **gphkHashTable** using the obtained 32-bit (4-byte) offset.

![Figure 5: Inside the **IsHotKey** function](/assets/images/detecting-hotkey-based-keyloggers/image5.png)

Additionally, since **IsHotKey** is not an exported function, we also need to know its address before looking for **gphkHashTable**. Through further reverse engineering, we discovered that the exported function **EditionIsHotKey** calls the **IsHotKey** function. Therefore, we decided to compute the address of IsHotKey within the **EditionIsHotKey** function using the same method described earlier. (For reference, the base address of **win32kfull.sys** can be found using the **PsLoadedModuleList** API.) 

### Accessing the Memory Space of **win32kfull.sys**

Once we finalized our approach to obtaining the address of **gphkHashTable**, we began writing code to access the memory space of **win32kfull.sys** to retrieve that address. One challenge we encountered at this stage was that win32kfull.sys is a *session driver*. Before proceeding further, here’s a brief, simplified explanation of what a *session* is.

In Windows, when a user logs in, a separate session (with session numbers starting from 1) is assigned to each user. Simply put, the first user to log in is assigned **Session 1**. If another user logs in while that session is active, that user is assigned **Session 2**, and so on. Each user then has their own desktop environment within their assigned session.

Kernel data that must be managed separately for each session (i.e., per logged-in user) is stored in an isolated area of kernel memory called *session space*. This includes GUI objects managed by win32k drivers, such as windows and mouse/keyboard input data, ensuring that the screen and input remain properly separated between users.

*(This is a simplified explanation. For a more detailed discussion on sessions, please refer to [James Forshaw’s blog post](https://googleprojectzero.blogspot.com/2016/01/raising-dead.html).)*

![Figure 6: Overview of Sessions. Session 0 is dedicated exclusively to service processes](/assets/images/detecting-hotkey-based-keyloggers/image2.png)  
  
Based on the above, **win32kfull.sys** is known as a *session driver*. This means that, for example, hotkey information registered in the session of the first logged-in user (Session 1) can only be accessed from within that same session. So, how can we work around this limitation? In such cases, [it is known](https://eversinc33.com/posts/kernel-mode-keylogging.html) that [**KeStackAttachProcess**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/nf-ntifs-kestackattachprocess) can be used.

**KeStackAttachProcess** allows the current thread to temporarily attach to the address space of a specified process. If we can attach to a GUI process in the target session — more precisely, a process that has loaded **win32kfull.sys** — then we can access **win32kfull.sys** and its associated data within that session. For our implementation, assuming that only one user is logged in, we decided to locate and attach to **winlogon.exe**, the process responsible for handling user logon operations.

### Enumerating Registered Hotkeys

Once we have successfully attached to the winlogon.exe process and determined the address of **gphkHashTable**, the next step is simply scanning **gphkHashTable** to check the registered hotkeys. Below is an excerpt of that code:

```c
BOOL CheckRegisteredHotKeys(_In_ const PVOID& gphkHashTableAddr)
{
-[skip]-
    // Cast the gphkHashTable address to an array of pointers.
    PVOID* tableArray = static_cast<PVOID*>(gphkHashTableAddr);
    // Iterate through the hash table entries.
    for (USHORT j = 0; j < 0x80; j++)
    {
        PVOID item = tableArray[j];
        PHOT_KEY hk = reinterpret_cast<PHOT_KEY>(item);
        if (hk)
        {
            CheckHotkeyNode(hk);
        }
    }
-[skip]-
}

VOID CheckHotkeyNode(_In_ const PHOT_KEY& hk)
{
    if (MmIsAddressValid(hk->pNext)) {
        CheckHotkeyNode(hk->pNext);
    }

    // Check whether this is a single numeric hotkey.
    if ((hk->vk >= 0x30) && (hk->vk <= 0x39) && (hk->modifiers1 == 0))
    {
        KdPrint(("[+] hk->id: %u hk->vk: %x\n", hk->id, hk->vk));
        hotkeyCounter++;
    }
    // Check whether this is a single alphabet hotkey.
    else if ((hk->vk >= 0x41) && (hk->vk <= 0x5A) && (hk->modifiers1 == 0))
    {
        KdPrint(("[+] hk->id: %u hk->vk: %x\n", hk->id, hk->vk));
        hotkeyCounter++;
    }
-[skip]-
}
....
if (CheckRegisteredHotKeys(gphkHashTableAddr) && hotkeyCounter >= 36)
{
   detected = TRUE;
   goto Cleanup;
}
```

The code itself is straightforward: it iterates through each index of the hash table, following the linked list to access every **HOT\_KEY** object, and checks whether the registered hotkeys correspond to alphanumeric keys without any modifiers. In our detection tool, if every alphanumeric key is registered as a hotkey, an alert is raised, indicating the possible presence of a hotkey-based keylogger. For simplicity, this implementation only targets alphanumeric key hotkeys, although it would be easy to extend the tool to check for hotkeys with modifiers such as **SHIFT**.

### Detecting Hotkeyz

The detection tool (Hotkey-based Keylogger Detector) has been released below. Detailed usage instructions are provided as well. Additionally, this research was presented at [NULLCON Goa 2025](https://nullcon.net/goa-2025/speaker-windows-keylogger-detection), and the [presentation slides](https://docs.google.com/presentation/d/1B0Gdfpo-ER2hPjDbP_NNoGZ8vXP6X1_BN7VZCqUgH8c/edit?usp=sharing) are available. 

[https://github.com/AsuNa-jp/HotkeybasedKeyloggerDetector](https://github.com/AsuNa-jp/HotkeybasedKeyloggerDetector)

The following is a demo video showcasing how the Hotkey-based Keylogger Detector detects Hotkeyz.

[DEMO\_VIDEO.mp4](https://drive.google.com/file/d/1koGLqA5cPlhL8C07MLg9VDD9-SW2FM9e/view?usp=drive_link)

## Acknowledgments

We would like to express our heartfelt gratitude to Jonathan Bar Or for reading our previous article, sharing his insights on hotkey-based keyloggers, and generously publishing the PoC tool **Hotkeyz**.