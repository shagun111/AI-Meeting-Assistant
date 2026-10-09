
import whisper

print("Loading Whisper model...")

model = whisper.load_model("base")

print("Model loaded successfully!")
print("Transcribing audio...")

result = model.transcribe("audio.mp4")

print("\n--- TRANSCRIPT ---")
print(result["text"])

print("\nTranscription completed!")