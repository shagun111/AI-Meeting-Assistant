
import os
import whisper
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

api_key = os.getenv("GROQ_API_KEY")

if not api_key:
    raise ValueError("GROQ_API_KEY not found. Check your .env file.")

client = Groq(api_key=api_key)

AUDIO_FILE = "audio.mp4"
GROQ_MODEL = "openai/gpt-oss-20b"


def transcribe_meeting(audio_file):
    """Convert audio/video into text."""
    print("\nLoading Whisper model...")
    model = whisper.load_model("base")

    print("Transcribing meeting. Please wait...")
    result = model.transcribe(audio_file)
    transcript = result["text"].strip()

    if not transcript:
        raise ValueError("No speech was detected in the recording.")

    print("\n--- TRANSCRIPT ---")
    print(transcript)
    return transcript


def ask_groq(system_prompt, user_prompt):
    """Send a request to Groq and return the response."""
    response = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.2,
    )
    return response.choices[0].message.content.strip()


def generate_meeting_report(transcript):
    """Generate meeting summary and action items."""
    print("\nGenerating meeting summary and action items...")

    system_prompt = (
        "You are a careful AI meeting assistant. Use only facts "
        "supported by the transcript. Never invent decisions, tasks, "
        "owners, or deadlines. Mark missing information as not specified."
    )

    user_prompt = f"""
Analyze this meeting transcript and produce:

1. A concise meeting summary
2. Key discussion points
3. Decisions made, if any
4. Action items, including owners and deadlines only if stated

If no decisions or action items were mentioned, say so clearly.

MEETING TRANSCRIPT:
{transcript}
"""
    return ask_groq(system_prompt, user_prompt)


def generate_follow_up_email(transcript, report):
    """Draft a follow-up email based on the meeting."""
    print("\nGenerating follow-up email draft...")

    system_prompt = (
        "You draft professional follow-up emails after meetings. "
        "Use only information in the provided transcript and report. "
        "Do not invent names, recipients, decisions, tasks, owners, "
        "or deadlines. Use placeholders when details are unknown. "
        "The email is a draft for human review, not to be sent automatically."
    )

    user_prompt = f"""
Create a concise, professional follow-up email based on this meeting.

Include:
- A suitable subject line
- A greeting using [Recipient Name]
- A short summary of the meeting
- Confirmed action items, if any
- A polite closing using [Your Name]

If no action items were agreed upon, do not invent any.
Use placeholders for any missing details.

MEETING TRANSCRIPT:
{transcript}

MEETING REPORT:
{report}

Return only the email draft.
"""
    return ask_groq(system_prompt, user_prompt)


def save_report(transcript, report, email_draft):
    """Save the transcript, report, and email draft."""
    output_file = "meeting_report.txt"

    with open(output_file, "w", encoding="utf-8") as file:
        file.write("AI MEETING ASSISTANT REPORT\n")
        file.write("=" * 50 + "\n\n")

        file.write("FULL TRANSCRIPT\n")
        file.write("-" * 50 + "\n")
        file.write(transcript + "\n\n")

        file.write("MEETING SUMMARY AND ACTION ITEMS\n")
        file.write("-" * 50 + "\n")
        file.write(report + "\n\n")

        file.write("FOLLOW-UP EMAIL DRAFT\n")
        file.write("-" * 50 + "\n")
        file.write(email_draft + "\n")

    print(f"\nAll results saved to {output_file}")


def main():
    if not os.path.isfile(AUDIO_FILE):
        print(f"Audio file not found: {AUDIO_FILE}")
        print("Place your recording in this folder or update AUDIO_FILE.")
        return

    transcript = transcribe_meeting(AUDIO_FILE)
    report = generate_meeting_report(transcript)

    print("\n--- AI MEETING REPORT ---\n")
    print(report)

    email_draft = generate_follow_up_email(transcript, report)

    print("\n--- FOLLOW-UP EMAIL DRAFT ---\n")
    print(email_draft)

    save_report(transcript, report, email_draft)

    print("\nAI Meeting Assistant completed successfully!")


if __name__ == "__main__":
    main()