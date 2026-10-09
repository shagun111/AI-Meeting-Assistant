
import os
from dotenv import load_dotenv
from groq import Groq

# Load the secret key from .env
load_dotenv()

api_key = os.getenv("GROQ_API_KEY")

if not api_key:
    raise ValueError(
        "GROQ_API_KEY not found. Check your .env file."
    )

# Connect to Groq
client = Groq(api_key=api_key)

print("Connected to Groq!")
print("Generating meeting summary...\n")

transcript = """
Hello everyone, welcome to today's meeting.
We will discuss our project progress, pending tasks,
and deadlines for the upcoming week.
"""

response = client.chat.completions.create(
    model="openai/gpt-oss-20b",
    messages=[
        {
            "role": "system",
            "content": (
                "You are an AI meeting assistant. "
                "Summarize meetings and identify action items. "
                "Do not invent details that are not in the transcript."
            )
        },
        {
            "role": "user",
            "content": (
                "Summarize this meeting transcript and list "
                "any action items. Mark unspecified owners "
                "or deadlines as not specified.\n\n"
                + transcript
            )
        }
    ],
    temperature=0.2,
)

print("--- MEETING SUMMARY ---")
print(response.choices[0].message.content)
print("\nGroq test completed successfully!")