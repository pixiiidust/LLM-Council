# LLM Council
The idea of this project is that instead of asking a question to a single LLM, you can group them into your "LLM Council". This is a simple web app that sends your query to specialized Gemini personas, asks them to review and rank each other's work, and finally a Chairman LLM produces the final response.

# Screenshot
<div align="center">
<img width="1149" height="866" alt="image" src="https://github.com/user-attachments/assets/32f810d7-8868-4502-b102-3965bcb7f07a" />
</div>

# How it works
In a bit more detail, here is what happens when you submit a query:

**Stage 1: First opinions.** The user query is given to all Council Members (Analyst, Visionary, Skeptic, Pragmatist) individually. The individual responses are shown in a "tab view", so that the user can inspect them all one by one.

**Stage 2: Review.** Each individual member is given the responses of the others. Under the hood, the identities are anonymized so that they can't play favorites. They are asked to rank them in accuracy and insight.

**Stage 3: Final response.** The designated Chairman takes all of the responses and reviews and compiles them into a single final answer that is presented to the user.

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
