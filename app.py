
import logging
import re
import uuid
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from database import SessionLocal, Meeting, init_db
from meeting_assistant import (
    transcribe_meeting,
    generate_meeting_report,
    generate_follow_up_email,
)

app = FastAPI(title="AI Meeting Assistant API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"
REPORT_DIR = BASE_DIR / "reports"

UPLOAD_DIR.mkdir(exist_ok=True)
REPORT_DIR.mkdir(exist_ok=True)

ALLOWED_EXTENSIONS = {
    ".mp3", ".wav", ".m4a", ".mp4", ".webm", ".mpeg", ".mpga"
}
MAX_FILE_SIZE = 100 * 1024 * 1024


@app.on_event("startup")
def startup():
    init_db()


@app.get("/")
def home():
    return {
        "message": "AI Meeting Assistant API is running!",
        "status": "success",
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}


def meeting_to_dict(meeting):
    return {
        "meeting_id": meeting.id,
        "filename": meeting.filename,
        "transcript": meeting.transcript,
        "meeting_report": meeting.meeting_report,
        "follow_up_email": meeting.follow_up_email,
        "created_at": meeting.created_at.isoformat() + "Z",
        "report_download_url": f"/reports/{meeting.id}",
    }


@app.post("/process-meeting")
def process_meeting(file: UploadFile = File(...)):
    original_filename = Path(file.filename or "audio").name
    extension = Path(original_filename).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        file.file.close()
        raise HTTPException(
            status_code=400,
            detail="Unsupported audio/video file type.",
        )

    meeting_id = uuid.uuid4().hex
    saved_path = UPLOAD_DIR / f"{meeting_id}{extension}"
    report_path = REPORT_DIR / f"{meeting_id}.txt"

    try:
        # Save the upload while enforcing the 100 MB limit.
        size = 0

        with saved_path.open("wb") as destination:
            while True:
                chunk = file.file.read(1024 * 1024)
                if not chunk:
                    break

                size += len(chunk)

                if size > MAX_FILE_SIZE:
                    raise HTTPException(
                        status_code=413,
                        detail="File too large. Maximum size is 100 MB.",
                    )

                destination.write(chunk)

        if size == 0:
            raise HTTPException(
                status_code=400,
                detail="The uploaded file is empty.",
            )

        # Existing Whisper + Groq pipeline.
        transcript = transcribe_meeting(str(saved_path))
        report = generate_meeting_report(transcript)
        email_draft = generate_follow_up_email(transcript, report)

        # Save the downloadable text report.
        with report_path.open("w", encoding="utf-8") as output:
            output.write("AI MEETING ASSISTANT REPORT\n")
            output.write("=" * 50 + "\n\n")
            output.write("FULL TRANSCRIPT\n")
            output.write("-" * 50 + "\n")
            output.write(transcript + "\n\n")
            output.write("MEETING SUMMARY AND ACTION ITEMS\n")
            output.write("-" * 50 + "\n")
            output.write(report + "\n\n")
            output.write("FOLLOW-UP EMAIL DRAFT\n")
            output.write("-" * 50 + "\n")
            output.write(email_draft + "\n")

        # Store the completed meeting in SQLite.
        with SessionLocal() as db:
            meeting = Meeting(
                id=meeting_id,
                filename=original_filename,
                transcript=transcript,
                meeting_report=report,
                follow_up_email=email_draft,
            )
            db.add(meeting)
            db.commit()
            db.refresh(meeting)
            response = meeting_to_dict(meeting)

        return {
            "status": "success",
            **response,
        }

    except HTTPException:
        raise
    except Exception:
        logging.exception("Meeting processing failed")
        raise HTTPException(
            status_code=500,
            detail="Meeting processing failed. Check the server terminal.",
        )
    finally:
        file.file.close()
        # Uploaded audio is temporary; keep the database record and report.
        saved_path.unlink(missing_ok=True)


@app.get("/meetings")
def list_meetings():
    """Return saved meeting details for the history sidebar."""
    with SessionLocal() as db:
        meetings = (
            db.query(Meeting)
            .order_by(Meeting.created_at.desc())
            .all()
        )
        return [meeting_to_dict(meeting) for meeting in meetings]


@app.get("/meetings/{meeting_id}")
def get_meeting(meeting_id: str):
    """Load one saved meeting, including its transcript and generated text."""
    if not re.fullmatch(r"[a-f0-9]{32}", meeting_id):
        raise HTTPException(status_code=400, detail="Invalid meeting ID.")

    with SessionLocal() as db:
        meeting = db.get(Meeting, meeting_id)

        if meeting is None:
            raise HTTPException(status_code=404, detail="Meeting not found.")

        return meeting_to_dict(meeting)


@app.delete("/meetings/{meeting_id}")
def delete_meeting(meeting_id: str):
    """Delete a meeting record and its generated report file."""
    if not re.fullmatch(r"[a-f0-9]{32}", meeting_id):
        raise HTTPException(status_code=400, detail="Invalid meeting ID.")

    with SessionLocal() as db:
        meeting = db.get(Meeting, meeting_id)

        if meeting is None:
            raise HTTPException(status_code=404, detail="Meeting not found.")

        db.delete(meeting)
        db.commit()

    report_path = REPORT_DIR / f"{meeting_id}.txt"
    report_path.unlink(missing_ok=True)

    return {
        "status": "success",
        "message": "Meeting deleted.",
        "meeting_id": meeting_id,
    }


@app.get("/reports/{meeting_id}")
def download_report(meeting_id: str):
    if not re.fullmatch(r"[a-f0-9]{32}", meeting_id):
        raise HTTPException(status_code=400, detail="Invalid meeting ID.")

    report_path = REPORT_DIR / f"{meeting_id}.txt"

    if not report_path.is_file():
        raise HTTPException(status_code=404, detail="Report not found.")

    return FileResponse(
        path=report_path,
        media_type="text/plain",
        filename=f"meeting_report_{meeting_id[:8]}.txt",
    )