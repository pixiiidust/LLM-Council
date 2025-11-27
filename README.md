<div align="center">
  <img width="820" alt="LLM Council Screenshot" src="https://github.com/user-attachments/assets/0dd7cdd0-fb3e-49c1-ae65-bd94ba9dedb7" />
  
  # LLM Council
  
  <p>
    <strong>A Deliberative AI Reasoning Engine</strong>
  </p>
  
  <p>
    <a href="#how-it-works">How it Works</a> •
    <a href="#the-council-members">The Council</a> •
    <a href="#features">Features</a> •
    <a href="#getting-started">Getting Started</a>
  </p>
</div>

---

## 🤖 Overview

**LLM Council** is not just another chatbot. It is a sophisticated reasoning engine that simulates a "Council of Wise Personas" to debate your query before delivering a final answer. 

Instead of relying on a single zero-shot response, the application orchestrates a multi-stage conversation between specialized AI agents—The Analyst, The Visionary, The Skeptic, and The Pragmatist—presided over by a Chairman. This process reduces hallucinations, explores edge cases, and provides a significantly more balanced and comprehensive output.

## ⚙️ How it Works

The application utilizes **Google Gemini 2.5 Flash** for the council members and **Gemini 3.0 Pro** for the Chairman to execute a three-stage deliberative process:

1.  **Stage 1: Initial Opinions**
    The user's query (and any attached documents) is sent individually to all four council members. They generate their initial stances based on their specific system prompts without seeing each other's work.

2.  **Stage 2: Peer Review**
    The initial opinions are anonymized and cross-circulated. Each member reviews the collective output of the group, pointing out logical fallacies, endorsing brilliant insights, or doubling down on their critique.

3.  **Stage 3: The Chairman's Ruling**
    The Chairman (Gemini 3.0 Pro) receives the original query, the four initial opinions, and the four peer reviews. It synthesizes this vast context into a single, authoritative verdict that resolves conflicts and answers the user's prompt.

## 👥 The Council Members

| Member | Model | Role |
| :--- | :--- | :--- |
| **The Analyst** | `gemini-2.5-flash` | Focuses on logic, data, structure, and correctness. |
| **The Visionary** | `gemini-2.5-flash` | Explores abstract ideas, metaphors, and "what if" scenarios. |
| **The Skeptic** | `gemini-2.5-flash` | Identifies risks, edge cases, and flaws in premises. |
| **The Pragmatist** | `gemini-2.5-flash` | Prioritizes feasibility, real-world implementation, and compromise. |
| **The Chairman** | `gemini-3-pro` | The synthesizer and final decision maker. |

## ✨ Features

*   **Multi-Perspective Analysis:** Get answers that are vetted from logical, creative, critical, and practical angles.
*   **Document Analysis:** Upload **Text** or **PDF** documents for the council to read, analyze, and debate.
*   **ELI5 Mode:** Toggle "Explain Like I'm 5" to force the Chairman to translate complex deliberations into simple, easy-to-understand language.
*   **Transparent Process:** View every stage of the deliberation via the interactive "Council Card" UI.
*   **Thinking Models:** Leverages Gemini's advanced reasoning capabilities for the final synthesis.

## 🚀 Getting Started

### Prerequisites

*   Node.js (v18 or higher)
*   A Google Gemini API Key

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/your-username/llm-council.git
    cd llm-council
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Set up Environment Variables**
    Create a `.env` file in the root directory (or `.env.local`) and add your API key:
    ```env
    API_KEY=your_google_gemini_api_key
    ```

4.  **Run the application**
    ```bash
    npm run dev
    ```

5.  **Open in Browser**
    Navigate to `http://localhost:1234` (or the port shown in your terminal).

## 🛠️ Tech Stack

*   **Frontend:** React 19, TypeScript
*   **Styling:** Tailwind CSS
*   **AI:** Google GenAI SDK (`@google/genai`)
*   **Build Tool:** Parcel

---

<div align="center">
  <p>Powered by Google Gemini</p>
</div>
