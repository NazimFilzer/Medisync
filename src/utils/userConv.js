const fs = require("fs");
const OpenAI = require("openai").OpenAI;
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Function to read chat history from the JSON file
function readChatHistory() {
  try {
    const data = fs.readFileSync("chat_history.json", "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error(err);
    return [];
  }
}

// Function to write chat history to the JSON file
function writeChatHistory(history) {
  try {
    fs.writeFileSync(
      "chat_history.json",
      JSON.stringify(history, null, 2),
      "utf8"
    );
  } catch (err) {
    console.error(err);
  }
}

// Main function to handle user messages and interact with OpenAI API
async function openAiMedBot(userMessage) {
  try {
    // Read existing chat history
    const chatHistory = readChatHistory();

    // Append the new user message to the history
    chatHistory.push({ role: "user", content: userMessage });

    console.log("Calling OpenAI API...");
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are Medisync, a medical bot assisting in scheduling medical reminders and acting as a symptom checker and also telling which specialist doctor to visit in hospital.",
        },
        ...chatHistory, // Spread the chat history in the messages array
      ],
    });

    // Append the AI response to the chat history and write to the file
    chatHistory.push({
      role: "assistant",
      content: response.choices[0].message.content,
    });
    writeChatHistory(chatHistory);

    return response.choices[0].message.content;
  } catch (err) {
    console.log(err);
    return "An error occurred while processing your request.";
  }
}

// Example usage
openAiMedBot("I have a headache and a cough.")
  .then((response) => console.log("AI Response:", response))
  .catch((err) => console.error(err));
module.exports = { openAiMedBot };
