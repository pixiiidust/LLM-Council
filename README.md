# LLM Council

<div align="center">
<img width="820" alt="image" src="https://github.com/user-attachments/assets/0dd7cdd0-fb3e-49c1-ae65-bd94ba9dedb7" />
</div>

The idea of this project is that instead of asking a question to a single LLM, you can group them into your "LLM Council". This is a simple web app that sends your query to specialized Gemini personas, asks them to review and rank each other's work, and finally a Chairman LLM produces the final response.

In a bit more detail, here is what happens when you submit a query:

**Stage 1: First opinions.** The user query is given to all Council Members (Analyst, Visionary, Skeptic, Pragmatist) individually. The individual responses are shown in a "tab view", so that the user can inspect them all one by one.

**Stage 2: Review.** Each individual member is given the responses of the others. Under the hood, the identities are anonymized so that they can't play favorites. They are asked to rank them in accuracy and insight.

**Stage 3: Final response.** The designated Chairman takes all of the responses and reviews and compiles them into a single final answer that is presented to the user.

## Vibe Code Alert

This project was 99% vibe coded as a fun hack because I wanted to explore multi-agent reasoning. It's nice and useful to see multiple responses side by side, and also the cross-opinions of all members on each other's outputs. It's provided here as is for other people's inspiration. Code is ephemeral now, ask your LLM to change it in whatever way you like.

## Setup

**1. Install Dependencies**

```bash
npm install
```

**2. Configure API Key**

Create a `.env` file in the project root and add your Google Gemini API key. You can get one at [aistudio.google.com](https://aistudio.google.com/).

```env
API_KEY=your_gemini_api_key_here
```

**3. Run the App**

```bash
npm run dev
```

Then open the local URL in your browser (usually http://localhost:1234).

## Tech Stack

*   **Frontend:** React + Tailwind CSS
*   **AI SDK:** Google GenAI SDK (`@google/genai`)
*   **Council Models:** Gemini 2.5 Flash
*   **Chairman Model:** Gemini 3.0 Pro
