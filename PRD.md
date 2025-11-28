# Product Requirements Document: LLM Council

**Version:** 1.0  
**Status:** Live
**Date:** July 26, 2025  
**Author:** System Architect

---

## 1. Executive Summary
**LLM Council** is a web-based decision support system that leverages multi-agent architecture to reduce hallucinations and bias inherent in single-LLM interactions. Instead of a standard chatbot experience, the user submits a query to a "Council" of four distinct AI personas. These personas generate independent opinions, peer-review each other's work to identify flaws, and submit their findings to a "Chairman" AI, which synthesizes a final, authoritative verdict.

### 1.1 Problem Statement
*   Single LLMs often suffer from "yes-man" syndrome or narrow reasoning paths.
*   Users dealing with complex problems (strategy, code architecture, writing) require diverse perspectives (critical, creative, logical) to make informed decisions.
*   Manual prompting of multiple personas is tedious and disjointed.

### 1.2 Proposed Solution
An automated "Deliberation Pipeline" wrapped in a retro-futuristic terminal interface. The system automates the recursive prompting required to simulate a room of experts debating a topic.

---

## 2. The Council Personas
The core logic relies on five distinct system prompts injected into the model context:

| Role | Name | Archetype | Model | Function |
| :--- | :--- | :--- | :--- | :--- |
| **Member** | **The Analyst** | Logical | Gemini 2.5 Flash | Focuses on data, structure, and factual correctness. |
| **Member** | **The Visionary** | Creative | Gemini 2.5 Flash | Focuses on lateral thinking, "what if" scenarios, and metaphors. |
| **Member** | **The Skeptic** | Critical | Gemini 2.5 Flash | Identifies risks, edge cases, and challenges assumptions (Devil's Advocate). |
| **Member** | **The Pragmatist** | Realistic | Gemini 2.5 Flash | Focuses on feasibility, implementation, and real-world constraints. |
| **Lead** | **The Chairman** | Synthesis | Gemini 3.0 Pro | Reviews all inputs and peer reviews to generate the final output. |

---

## 3. Functional Specifications

### 3.1 Input Methods
*   **Text Query:** Standard text area for user prompts.
*   **File Ingestion:** Support for `.txt`, `.md`, `.json`, `.csv`, code files, and `.pdf`. Content is extracted and appended to the context window of all agents.
*   **ELI5 Mode:** A toggle that forces the Chairman to output the final synthesis in "Explain Like I'm 5" format (simple analogies, no jargon).

### 3.2 The Deliberation Pipeline (Workflow)
The application must execute three sequential stages upon submission:

1.  **Stage 1: Initial Opinions (Parallel Execution)**
    *   User query + Attachments sent to all 4 Council Members simultaneously.
    *   Each member generates a response based on their specific `systemPrompt`.
2.  **Stage 2: Peer Review (Blind Cross-Examination)**
    *   Each member receives the anonymized opinions of the *other* 3 members.
    *   Members are prompted to rank insights and identify logical fallacies in their peers' work.
3.  **Stage 3: The Ruling (Synthesis)**
    *   The Chairman receives: Original Query + 4 Initial Opinions + 4 Peer Reviews.
    *   Chairman utilizes `thinkingBudget` (via Gemini 2.5/3.0 capabilities) to reason before answering.
    *   Output is a structured Markdown response resolving the debate.

### 3.3 User Interface Features
*   **Real-time Status:** Visual indicators for current stage (Opinions, Reviews, Synthesis).
*   **Tabular Views:** Users can inspect individual member outputs and peer reviews before seeing the final verdict.
*   **Abort Functionality:** Ability to halt the generation process mid-stream.
*   **Markdown Rendering:** All AI outputs must support rich text formatting (code blocks, bolding, lists).

---

## 4. Technical Architecture

### 4.1 Technology Stack
*   **Frontend Framework:** React 19 + Vite.
*   **Styling:** Tailwind CSS (Custom "Cyber" configuration).
*   **AI Integration:** Google GenAI SDK (`@google/genai`).
*   **State Management:** React `useState` / `useRef` for streaming/async handling.

### 4.2 API Configuration
*   **Authentication:** `API_KEY` loaded via `process.env`.
*   **Models:**
    *   Use `gemini-2.5-flash` for high-volume tasks (Members).
    *   Use `gemini-3-pro-preview` for high-intelligence tasks (Chairman).
*   **Thinking Config:** Chairman utilizes `thinkingConfig: { thinkingBudget: 1024 }` for enhanced reasoning.

---

## 5. UI/UX Design Guidelines

### 5.1 Aesthetic: "Retro-Cyberpunk Terminal"
The interface should mimic a high-security automated analytics workstation.
*   **Color Palette:**
    *   *Background:* Deep Black/Green (`#020502`).
    *   *Primary:* Terminal Green (`#4ade80`).
    *   *Accents:* Lime (Analyst), Fuchsia (Visionary), Amber (Skeptic), Emerald (Pragmatist).
*   **Typography:** `Share Tech Mono` for all text elements.

### 5.2 Visual Effects
*   **CRT Simulation:** CSS-based scanlines and subtle screen flicker animations.
*   **Chunky Borders:** All containers must use heavy borders (`4px` minimum) to denote a brutalist/industrial interface.
*   **Glow:** Text-shadows and box-shadows to simulate phosphorescent screens.

---

## 6. Future Roadmap (v1.1+)
*   **Custom Personas:** Allow users to define their own Council members (e.g., "The Lawyer", "The Python Expert").
*   **Streaming Responses:** Implement streaming for individual members to reduce perceived latency.
*   **Conversation History:** LocalStorage or Database persistence of previous "Council Sessions".
*   **Chairman Selection:** Allow swapping the Chairman model (e.g., strictly for code synthesis vs. creative writing).
